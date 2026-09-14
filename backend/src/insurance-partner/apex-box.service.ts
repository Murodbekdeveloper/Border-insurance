import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository } from 'typeorm';
import { ApexBoxSubmission } from './entities/apex-box-submission.entity';
import { ApexBoxClientService } from './apex-box-client.service';
import {
  ApexBoxDriver,
  ApexBoxResidentOfUzb,
  CalculatePremiumRequest,
  CreatePolicyRequest,
} from './apex-box.types';
import {
  InsurancePolicy,
  DriverRestriction,
  PolicyStatus,
} from '../policies/entities/insurance-policy.entity';
import { Driver } from '../policies/entities/driver.entity';
import { User } from '../users/entities/user.entity';

// Uzbek-only Vehicle.vehicleType string ids (frontend's VEHICLE_TYPES,
// src/lib/constants.ts) -> Apex_Box's typeId (GET
// /osago_references_vehicle_type). Anything unmapped falls back to
// "Легковые автомобили" (1) — the most common case — rather than failing
// the whole submission over a categorization detail that (per Asia
// Insurance) isn't validated for a non-resident applicant anyway.
const VEHICLE_TYPE_ID_MAP: Record<string, string> = {
  yengil_avtomobil: '1',
  yuk_mashinasi: '6',
  avtobus: '9',
  mototsikl: '15',
  pritsep: '15',
  maxsus_texnika: '15',
};

// Placeholder region/district for the applicant and vehicle (Tashkent city
// / its central district) — Apex_Box requires these ids but Asia Insurance
// confirmed a non-resident applicant's/foreign vehicle's data isn't
// checked against any registry, and this app doesn't collect a real
// region/district for either yet. Revisit if that ever changes.
const PLACEHOLDER_REGION_ID = '10'; // "г. Ташкент"
const PLACEHOLDER_DISTRICT_ID = '1001';

// Splits a single "Familiya Ism Otasining ismi" string (this app's
// fullName convention) into Apex_Box's separate firstname/lastname/
// middlename — a lossy best-effort mapping since Apex_Box has no single
// full-name field, but (per Asia Insurance) unvalidated for foreigners.
function splitFullName(fullName: string): {
  firstname: string;
  lastname: string;
  middlename: string;
} {
  const parts = fullName.trim().split(/\s+/);
  return {
    lastname: parts[0] ?? fullName,
    firstname: parts[1] ?? '-',
    middlename: parts.slice(2).join(' ') || '-',
  };
}

export interface ApexBoxSubmitResult {
  clickLink: string;
  paymeLink: string;
  amountUzs: number;
}

@Injectable()
export class ApexBoxService {
  constructor(
    @InjectRepository(ApexBoxSubmission)
    private readonly submissionsRepository: Repository<ApexBoxSubmission>,
    private readonly apexBoxClient: ApexBoxClientService,
  ) {}

  async findByPolicyId(policyId: string): Promise<ApexBoxSubmission | null> {
    return this.submissionsRepository.findOne({ where: { policyId } });
  }

  // Full outbound flow for a foreign-registered vehicle/citizen, via
  // Apex_Box's POST /osago (not osago_v3 — that API has no foreign-vehicle
  // support at all, confirmed against its published spec). Idempotent like
  // InsurancePartnerService.submitPolicy(): a second call for the same
  // policy reuses the existing row and short-circuits once contract_id is
  // already known.
  async submitPolicy(
    policy: InsurancePolicy,
    user: User,
    foreignPolicyDurationId: string,
  ): Promise<ApexBoxSubmitResult> {
    this.assertReadyForSubmission(policy, user);

    let submission = await this.findByPolicyId(policy.id);
    if (submission?.contractId) {
      return {
        clickLink: submission.clickLink as string,
        paymeLink: submission.paymeLink as string,
        amountUzs: policy.price,
      };
    }
    if (!submission) {
      const insertResult = await this.submissionsRepository.insert({
        policyId: policy.id,
      });
      submission = await this.submissionsRepository.findOneByOrFail({
        id: insertResult.identifiers[0].id as string,
      });
    }

    // Apex_Box's CreatePolicyResponse carries no premium field at all
    // (unlike osago_v3's SavePolicyResponse.amount_uzs) — the only way to
    // get their authoritative premium is /osago_calculation beforehand, the
    // same two-step pattern InsurancePartnerService.submitPolicy() uses.
    // Without this, cost.insurancePremium below would just be our own
    // rough local PricingService estimate (a flat 10% foreign-vehicle
    // surcharge on the full-year base price, blind to the selected
    // foreignVehicleId duration) submitted to Apex_Box as if it were the
    // real premium — wrong for anything shorter than a year, and the
    // number actually shown to and charged from the customer.
    const calc = await this.apexBoxClient.calculatePremium(
      this.buildCalculatePremiumRequest(policy, user, foreignPolicyDurationId),
    );
    if (calc.result !== 0) {
      throw new BadRequestException(
        `Apex_Box: ${calc.result_message || "noma'lum xatolik"}`,
      );
    }
    const insurancePremium = Number(calc.insurance_premium);
    if (!Number.isFinite(insurancePremium)) {
      throw new BadRequestException(
        "Apex_Box'dan noto'g'ri sug'urta mukofoti qaytdi",
      );
    }

    const request = this.buildCreatePolicyRequest(
      policy,
      user,
      foreignPolicyDurationId,
      submission.ourTransactionId,
      insurancePremium,
    );
    const result = await this.apexBoxClient.createPolicy(request);

    if (result.result !== 0 && result.result !== 123456) {
      // Apex_Box returns HTTP 200 even for business-logic errors — the
      // only signal is a non-zero `result` (their examples show both 0 and
      // a large echoed code for success, inconsistently).
      throw new BadRequestException(
        `Apex_Box: ${result.result_message || "noma'lum xatolik"}`,
      );
    }

    submission.contractId = result.contract_id;
    submission.uuid = result.uuid;
    submission.clickLink = result.click_link;
    submission.paymeLink = result.payme_link;
    await this.submissionsRepository.save(submission);

    return {
      clickLink: result.click_link,
      paymeLink: result.payme_link,
      amountUzs: insurancePremium,
    };
  }

  // Used by PartnerPolicySyncCron — mirrors
  // InsurancePartnerService.findReadyForFinalization() for the osago_v3
  // flow: submissions where Apex_Box already confirmed payment (polyNo
  // set by reconcileFromPartner below) but the linked InsurancePolicy
  // hasn't been flipped to PAID yet.
  async findReadyForFinalization(): Promise<ApexBoxSubmission[]> {
    return this.submissionsRepository
      .createQueryBuilder('submission')
      .innerJoinAndSelect('submission.policy', 'policy')
      .where('submission.policyNo IS NOT NULL')
      .andWhere('policy.status = :status', {
        status: PolicyStatus.AWAITING_PARTNER_PAYMENT,
      })
      .getMany();
  }

  // Submissions where CreatePolicyRequest succeeded (we have a contractId)
  // but payment hasn't been confirmed yet — polled via getIssuedPolicy() as
  // the only way to learn that, since Apex_Box (unlike osago_v3) has no
  // payment-callback webhook at all.
  findStaleAwaitingResult(olderThan: Date): Promise<ApexBoxSubmission[]> {
    return this.submissionsRepository.find({
      where: {
        contractId: Not(IsNull()),
        policyNo: IsNull(),
        createdAt: LessThan(olderThan),
      },
    });
  }

  // Polls Apex_Box directly for a submission stuck awaiting payment —
  // result===0 with a non-empty policy_no is the only signal their GET
  // /policy gives that the contract is actually paid/issued (no separate
  // status field, unlike osago_v3's GetPolicyResponse.policy_status).
  async reconcileFromPartner(submission: ApexBoxSubmission): Promise<void> {
    if (submission.contractId == null) return;
    const result = await this.apexBoxClient.getIssuedPolicy({
      contract_id: submission.contractId,
    });
    if (result.result !== 0 || !result.policy_no) return;
    submission.policyNo = result.policy_no;
    await this.submissionsRepository.save(submission);
  }

  private assertReadyForSubmission(policy: InsurancePolicy, user: User): void {
    const missing: string[] = [];
    if (!user.passportSeries || !user.passportNumber || !user.birthDate) {
      missing.push(
        "arizachining pasport ma'lumotlari/tug'ilgan sanasi (profil)",
      );
    }
    if (!user.citizenshipId) {
      missing.push('fuqarolik (davlat) tanlanmagan (profil)');
    }
    // Mirrors InsurancePartnerService.assertReadyForSubmission's identical
    // check — without it, a driver with no relativeId set would silently
    // go out as relative "1" (ОТЕЦ/father) below instead of failing loudly,
    // fabricating a kinship claim on a real, government-facing OSAGO
    // contract.
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

  // Mirrors the relevant subset of buildCreatePolicyRequest's fields —
  // Apex_Box's /osago_calculation only wants owner/driver passportData,
  // the vehicle's plate/tech-passport, and the cost fields that affect the
  // premium, not the full contract payload.
  private buildCalculatePremiumRequest(
    policy: InsurancePolicy,
    user: User,
    foreignPolicyDurationId: string,
  ): CalculatePremiumRequest {
    const today = new Date().toISOString().slice(0, 10);
    const passportData = {
      pinfl: '',
      seria: user.passportSeries as string,
      number: user.passportNumber as string,
      issuedBy: '-',
      issueDate: today,
    };
    const drivers =
      policy.driverRestriction === DriverRestriction.RESTRICTED
        ? policy.drivers.map((d: Driver) => ({
            passportData: {
              pinfl: '',
              seria: d.passportSeries,
              number: d.passportNumber,
              issuedBy: '-',
              issueDate: today,
            },
          }))
        : [];

    return {
      owner: { person: { passportData } },
      details: {
        driverNumberRestriction:
          policy.driverRestriction === DriverRestriction.RESTRICTED,
      },
      cost: {
        contractTermConclusionId: '3',
        useTerritoryId: '3',
        seasonalInsuranceId: '',
        foreignVehicleId: foreignPolicyDurationId,
      },
      vehicle: {
        techPassport: {
          number: policy.vehicle.techPassportNumber,
          seria: policy.vehicle.techPassportSeries,
        },
        govNumber: policy.vehicle.plateNumber,
      },
      drivers,
    };
  }

  private buildCreatePolicyRequest(
    policy: InsurancePolicy,
    user: User,
    foreignPolicyDurationId: string,
    ourTransactionId: number,
    insurancePremium: number,
  ): CreatePolicyRequest {
    const name = splitFullName(user.fullName);
    const today = new Date().toISOString().slice(0, 10);
    const passportData = {
      // Confirmed by Asia Insurance: PINFL must be an empty string for a
      // foreign citizen (residentOfUzb = FOREIGNER) — never a placeholder
      // like all-zeros.
      pinfl: '',
      seria: user.passportSeries as string,
      number: user.passportNumber as string,
      // Not collected by this app yet; confirmed unvalidated for a
      // non-resident applicant.
      issuedBy: '-',
      issueDate: today,
    };

    const drivers: ApexBoxDriver[] =
      policy.driverRestriction === DriverRestriction.RESTRICTED
        ? policy.drivers.map((d: Driver) => {
            const driverName = splitFullName(d.fullName);
            return {
              passportData: {
                pinfl: '',
                seria: d.passportSeries,
                number: d.passportNumber,
                issuedBy: '-',
                issueDate: today,
              },
              fullName: driverName,
              licenseNumber: d.licenseNumber,
              licenseSeria: '-',
              licenseIssueDate: d.licenseIssueDate,
              birthDate: d.birthDate,
              // Guaranteed non-null here — assertReadyForSubmission()
              // above already rejected the submission otherwise.
              relative: String(d.relativeId),
              residentOfUzb: ApexBoxResidentOfUzb.FOREIGNER,
            };
          })
        : [];

    return {
      applicant: {
        person: {
          passportData,
          fullName: name,
          phoneNumber: policy.vehicle.phone.replace(/^\+/, ''),
          gender: 'm',
          birthDate: user.birthDate as string,
          regionId: PLACEHOLDER_REGION_ID,
          districtId: PLACEHOLDER_DISTRICT_ID,
        },
        address: policy.vehicle.city,
        residentOfUzb: ApexBoxResidentOfUzb.FOREIGNER,
        citizenshipId: user.citizenshipId as string,
      },
      owner: {
        person: { passportData, fullName: name },
        applicantIsOwner: policy.vehicle.ownerIsApplicant,
      },
      details: {
        // NOT YET RESOLVED (2026-09-10): Apex_Box's live /osago rejected
        // every startDate/endDate combination tried (including its own
        // suggested endDate verbatim) with "Переданные даты не
        // соответствуют выбранному периоду" — the exact date-computation
        // rule for a given foreignVehicleId duration is still unconfirmed
        // by Asia Insurance. `today`/`today` is a placeholder until they
        // answer; expect this call to fail with a clear result_message
        // (surfaced below) until then.
        issueDate: today,
        startDate: today,
        endDate: today,
        driverNumberRestriction:
          policy.driverRestriction === DriverRestriction.RESTRICTED,
        transactionId: String(ourTransactionId),
      },
      cost: {
        discountId: '1',
        insurancePremium: String(insurancePremium),
        sumInsured: '40000000',
        // "На срок временного использования ТС, зарегистрированного в
        // иностранных государствах" — the foreign-vehicle contract term.
        contractTermConclusionId: '3',
        useTerritoryId: '3', // "Для иностранцев"
        commission: '0',
        insurancePremiumPaidToInsurer: String(insurancePremium),
        // Confirmed: must be empty when contractTermConclusionId === '3'.
        seasonalInsuranceId: '',
        foreignVehicleId: foreignPolicyDurationId,
      },
      vehicle: {
        techPassport: {
          number: policy.vehicle.techPassportNumber,
          seria: policy.vehicle.techPassportSeries,
          issueDate: policy.vehicle.techPassportIssueDate,
        },
        modelCustomName: policy.vehicle.model,
        engineNumber: policy.vehicle.engineNumber,
        typeId: VEHICLE_TYPE_ID_MAP[policy.vehicle.vehicleType] ?? '1',
        issueYear: String(policy.vehicle.manufactureYear),
        govNumber: policy.vehicle.plateNumber,
        bodyNumber: policy.vehicle.bodyNumber,
        regionId: PLACEHOLDER_REGION_ID,
      },
      drivers,
    };
  }
}
