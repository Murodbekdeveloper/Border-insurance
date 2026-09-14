import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, LessThan, Not, Repository } from 'typeorm';
import { PartnerSubmission } from './entities/partner-submission.entity';
import { AsiaInsuranceClientService } from './asia-insurance-client.service';
import { CalcDriver, SavePolicyDriver } from './asia-insurance.types';
import {
  InsurancePolicy,
  DriverRestriction,
  PolicyStatus,
} from '../policies/entities/insurance-policy.entity';
import { User } from '../users/entities/user.entity';
import { RegistrationCountry } from '../vehicles/entities/vehicle.entity';

export interface PartnerSaveResult {
  transactionUuid: string;
  orderId: number;
  polisUuid: string;
  insurancePremium: number;
  comission: number;
  payallUrl: string;
}

export interface PartnerSubmitResult {
  payallUrl: string;
  amountUzs: number;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// Strips the leading "+" — techPassport.phone_number must be
// "998XXXXXXXXX" per their spec, but our own DTOs store "+998XXXXXXXXX".
function toPartnerPhone(phone: string): string {
  return phone.replace(/^\+/, '');
}

@Injectable()
export class InsurancePartnerService {
  // In-memory cache for the "1 yil" period id — this is static reference
  // data (GET /get-period) that doesn't change during the process lifetime,
  // so there's no reason to re-fetch it on every submission.
  private oneYearPeriodId: number | null = null;

  constructor(
    @InjectRepository(PartnerSubmission)
    private readonly submissionsRepository: Repository<PartnerSubmission>,
    private readonly asiaInsuranceClient: AsiaInsuranceClientService,
  ) {}

  // Reserves ourTransactionId (an auto-incrementing int, per
  // SavePolicyRequest.details.transaction_id's type) for a policy about to
  // be (or already being retried against) /save-policy. The row's uuid
  // `transactionId` column stays null until recordPartnerResult() fills it
  // in from Asia Insurance's response, since they generate that value, not us.
  async createSubmission(
    policyId: string,
    manager: EntityManager,
    startDate?: string,
  ): Promise<PartnerSubmission> {
    const repo = manager.getRepository(PartnerSubmission);
    // ourTransactionId is DB-generated (@Generated('increment')), so a
    // plain insert() (not save() on a locally-built entity) is required to
    // avoid TypeORM trying to write an undefined value for it.
    const insertResult = await repo.insert({ policyId, startDate });
    return repo.findOneByOrFail({
      id: insertResult.identifiers[0].id as string,
    });
  }

  async findByPolicyId(policyId: string): Promise<PartnerSubmission | null> {
    return this.submissionsRepository.findOne({ where: { policyId } });
  }

  // Full outbound flow: prices the policy against Asia Insurance's own
  // calculator (SavePolicyRequest.details.amount_uzs must be "the amount
  // obtained from the calculator" per their spec, not our local
  // pricing.config.ts estimate), then registers the order. Idempotent: a
  // second call for the same policy (e.g. the customer double-clicking, or
  // retrying after a network error) reuses the existing PartnerSubmission
  // row and its ourTransactionId instead of creating a new one, and short-
  // circuits entirely once payallUrl is already known.
  async submitPolicy(
    policy: InsurancePolicy,
    user: User,
  ): Promise<PartnerSubmitResult> {
    this.assertReadyForSubmission(policy, user);

    let submission = await this.findByPolicyId(policy.id);
    if (submission?.payallUrl) {
      return {
        payallUrl: submission.payallUrl,
        amountUzs: submission.insurancePremium ?? policy.price,
      };
    }
    if (!submission) {
      submission = await this.createSubmission(
        policy.id,
        this.submissionsRepository.manager,
        todayIsoDate(),
      );
    }
    const startDate = submission.startDate ?? todayIsoDate();

    const periodId = await this.resolveOneYearPeriodId();
    const limited = policy.driverRestriction === DriverRestriction.RESTRICTED;
    const owner = { person: this.buildOwnerPerson(policy, user) };
    const applicant = {
      birth_date: user.birthDate as string,
      pass_seria: user.passportSeries as string,
      pass_number: user.passportNumber as string,
    };
    const drivers = this.buildDrivers(policy);

    const calc = await this.asiaInsuranceClient.calculatePremium({
      gos_number: policy.vehicle.plateNumber,
      tech_sery: policy.vehicle.techPassportSeries,
      tech_number: policy.vehicle.techPassportNumber,
      period_id: periodId,
      limited,
      owner,
      drivers: drivers.map(
        ({ pass_seria, pass_number, birth_date }): CalcDriver => ({
          pass_seria,
          pass_number,
          birth_date,
        }),
      ),
    });
    // FIXED 2026-09-11: `calc.result` was never checked — a business-logic
    // failure (e.g. err_code 16, "vehicle/passport not found in the real
    // registry") has no `amount_uzs` in its `response`, so this silently
    // sent `amount_uzs: undefined` on to /save-policy instead of failing
    // loudly. This is what made payall_url etc. look "missing" during
    // testing with synthetic data — Asia Insurance's real response has
    // always included them; our own code just never surfaced their error.
    if (!calc.result) {
      throw new BadRequestException(
        `Asia Insurance: ${calc.message || "noma'lum xatolik"}`,
      );
    }

    const saved = await this.asiaInsuranceClient.savePolicy({
      details: {
        transaction_id: submission.ourTransactionId,
        start_date: startDate,
        period_id: periodId,
        limited,
        phone_number: toPartnerPhone(policy.vehicle.phone),
        amount_uzs: calc.response.amount_uzs,
      },
      techPassport: {
        govNumber: policy.vehicle.plateNumber,
        tech_sery: policy.vehicle.techPassportSeries,
        tech_number: policy.vehicle.techPassportNumber,
      },
      drivers,
      owner,
      applicant,
    });
    // Same fix as the calc check above, for the same reason.
    if (!saved.result) {
      throw new BadRequestException(
        `Asia Insurance: ${saved.message || "noma'lum xatolik"}`,
      );
    }

    await this.recordPartnerResult(submission.ourTransactionId, {
      transactionUuid: saved.response.transaction_uuid,
      orderId: saved.response.order_id,
      polisUuid: saved.response.polis_uuid,
      insurancePremium: saved.response.amount_uzs,
      comission: saved.response.comission,
      payallUrl: saved.response.payall_url,
    });

    return {
      payallUrl: saved.response.payall_url,
      amountUzs: saved.response.amount_uzs,
    };
  }

  private assertReadyForSubmission(policy: InsurancePolicy, user: User): void {
    // Asia Insurance's /save-policy contract only has fields for an
    // Uzbek-registered vehicle (gos_number/tech_sery/tech_number) — there's
    // no confirmed way to submit a genuinely foreign-registered vehicle
    // (no Uzbek tech passport) yet. Reject explicitly here, naming the
    // vehicle field, rather than forwarding placeholder/garbage data to
    // Asia Insurance and surfacing whatever cryptic error they'd return.
    if (policy.vehicle.registrationCountry === RegistrationCountry.FOREIGN) {
      throw new BadRequestException(
        "Ro'yxatga olingan davlat: xorijda ro'yxatdan o'tgan transport vositalari uchun sug'urta arizasini hali yubora olmaymiz — Asia Insurance bilan bu funksiya ustida ishlanmoqda",
      );
    }
    const missing: string[] = [];
    if (!user.passportSeries || !user.passportNumber || !user.birthDate) {
      missing.push(
        "arizachining pasport ma'lumotlari/tug'ilgan sanasi (profil)",
      );
    }
    if (!policy.vehicle.ownerIsApplicant) {
      if (
        !policy.vehicle.ownerPassportSeries ||
        !policy.vehicle.ownerPassportNumber ||
        !policy.vehicle.ownerBirthDate
      ) {
        missing.push(
          "transport egasining pasport ma'lumotlari/tug'ilgan sanasi",
        );
      }
    }
    if (policy.driverRestriction === DriverRestriction.RESTRICTED) {
      const missingRelative = policy.drivers.find((d) => d.relativeId == null);
      if (missingRelative) {
        missing.push(
          `${missingRelative.fullName}: transport egasi bilan qarindoshlik darajasi`,
        );
      }
    }
    if (missing.length > 0) {
      throw new BadRequestException(
        `Quyidagi ma'lumotlar to'ldirilmagan: ${missing.join('; ')}`,
      );
    }
  }

  private buildOwnerPerson(
    policy: InsurancePolicy,
    user: User,
  ): { birth_date: string; pass_seria: string; pass_number: string } {
    if (policy.vehicle.ownerIsApplicant) {
      return {
        birth_date: user.birthDate as string,
        pass_seria: user.passportSeries as string,
        pass_number: user.passportNumber as string,
      };
    }
    return {
      birth_date: policy.vehicle.ownerBirthDate as string,
      pass_seria: policy.vehicle.ownerPassportSeries as string,
      pass_number: policy.vehicle.ownerPassportNumber as string,
    };
  }

  private buildDrivers(policy: InsurancePolicy): SavePolicyDriver[] {
    return policy.drivers.map((d) => ({
      pass_seria: d.passportSeries,
      pass_number: d.passportNumber,
      birth_date: d.birthDate,
      relative: d.relativeId as number,
    }));
  }

  private async resolveOneYearPeriodId(): Promise<number> {
    if (this.oneYearPeriodId !== null) return this.oneYearPeriodId;
    const { items } = await this.asiaInsuranceClient.getPeriods();
    const oneYear =
      items.find((i) => /\byil\b|год|year/i.test(i.name) && /1/.test(i.name)) ??
      items.find((i) => i.period === 1);
    if (!oneYear) {
      throw new BadRequestException(
        "Asia Insurance davrlar ro'yxatida 1 yillik muddat topilmadi",
      );
    }
    this.oneYearPeriodId = oneYear.period;
    return this.oneYearPeriodId;
  }

  // Called once /save-policy succeeds, right after it returns.
  // Looked up by ourTransactionId (the id we sent them), not the uuid,
  // since that's the only thing our side knows before this call resolves.
  async recordPartnerResult(
    ourTransactionId: number,
    result: PartnerSaveResult,
  ): Promise<PartnerSubmission> {
    const submission = await this.submissionsRepository.findOne({
      where: { ourTransactionId },
    });
    if (!submission) {
      throw new NotFoundException('Bunday ourTransactionId topilmadi');
    }
    submission.transactionId = result.transactionUuid;
    submission.partnerOrderId = result.orderId;
    submission.partnerPolicyUuid = result.polisUuid;
    submission.insurancePremium = result.insurancePremium;
    submission.commissionAmount = result.comission;
    submission.payallUrl = result.payallUrl;
    return this.submissionsRepository.save(submission);
  }

  // Looked up by the partner-issued uuid — this is what
  // PartnerTransactionsController uses to answer the regulator.
  async findByTransactionId(
    transactionId: string,
  ): Promise<PartnerSubmission | null> {
    return this.submissionsRepository.findOne({ where: { transactionId } });
  }

  // Called by PaymentCallbackController once the customer finishes paying
  // at payallUrl. Correlated by contract_id, which Asia Insurance confirmed
  // equals the order_id we already stored as partnerOrderId from the
  // /save-policy response — NOT ourTransactionId, which they never see.
  async recordPaymentCallback(
    contractId: number,
    payload: {
      contractNum: string;
      policyNo: string;
      policyStatus: string;
      policyCheckUrl: string;
    },
  ): Promise<PartnerSubmission> {
    const submission = await this.submissionsRepository.findOne({
      where: { partnerOrderId: contractId },
    });
    if (!submission) {
      throw new NotFoundException('Bunday contract_id topilmadi');
    }
    submission.partnerContractNum = payload.contractNum;
    submission.partnerPolicyNo = payload.policyNo;
    submission.partnerPolicyStatus = payload.policyStatus;
    submission.partnerPolicyCheckUrl = payload.policyCheckUrl;
    return this.submissionsRepository.save(submission);
  }

  // Used by PartnerPolicySyncCron (backend/src/policies/) — submissions
  // where Asia Insurance's result already arrived (via the payment-callback
  // webhook, or the polling fallback below) but the linked InsurancePolicy
  // hasn't been flipped to PAID yet. Kept here rather than as an instant
  // side effect of recordPaymentCallback() so the two InsurancePartner<->
  // Policies module dependency stays one-directional (Policies depends on
  // InsurancePartner, not the other way around) — see PoliciesModule.
  async findReadyForFinalization(): Promise<PartnerSubmission[]> {
    return this.submissionsRepository
      .createQueryBuilder('submission')
      .innerJoinAndSelect('submission.policy', 'policy')
      .where('submission.partnerPolicyNo IS NOT NULL')
      .andWhere('policy.status = :status', {
        status: PolicyStatus.AWAITING_PARTNER_PAYMENT,
      })
      .getMany();
  }

  // Submissions where /save-policy succeeded (we have a partnerOrderId) but
  // no payment-callback webhook ever arrived — polled via getPolicy() as a
  // fallback in case Asia Insurance's webhook delivery failed.
  async findStaleAwaitingPartnerResult(
    olderThan: Date,
  ): Promise<PartnerSubmission[]> {
    return this.submissionsRepository.find({
      where: {
        partnerOrderId: Not(IsNull()),
        partnerPolicyNo: IsNull(),
        createdAt: LessThan(olderThan),
      },
    });
  }

  // Polls Asia Insurance directly for a submission stuck without a webhook
  // — same recordPaymentCallback() write path the webhook itself uses, so
  // PartnerPolicySyncCron's next tick picks it up via findReadyForFinalization().
  async reconcileFromPartner(submission: PartnerSubmission): Promise<void> {
    if (submission.partnerOrderId == null) return;
    const result = await this.asiaInsuranceClient.getPolicy({
      order_id: submission.partnerOrderId,
      transaction_id: submission.ourTransactionId,
    });
    if (result.result !== 0 || result.policy_status !== 'ISSUED') return;
    await this.recordPaymentCallback(submission.partnerOrderId, {
      contractNum: result.contract_num,
      policyNo: result.policy_no,
      policyStatus: result.policy_status,
      policyCheckUrl: result.policy_check,
    });
  }
}
