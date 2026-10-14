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
import {
  tashkentTodayIsoDate,
  tashkentTomorrowIsoDate,
} from '../common/tashkent-date';

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

// CONFIRMED 2026-09-15: Apex_Box's money fields in CalculatePremiumResponse
// come back as locale-formatted strings ("224 000,00 UZS" — thousands
// space, comma decimal, currency suffix), not plain numbers. A bare
// `Number(...)` on that is NaN, which is what made every real submission
// fail before this was noticed (masked by an unrelated, misleading
// "period/date" error surfaced first — see buildCreatePolicyRequest).
function parseApexBoxAmount(raw: string): number {
  return Number(raw.split(',')[0].replace(/\D/g, ''));
}

// Apex_Box's /osago validates the requested date range against the chosen
// foreignVehicleId duration server-side and, when rejected, states the
// valid range directly in result_message (e.g. "endDate должен быть в
// диапазоне 2026-09-15 .. 2026-09-29"). There is no other source for this
// per-duration day-count — not their reference endpoint, not their
// Swagger doc (both confirmed 2026-09-15 to omit it entirely) — so a
// probe-and-correct call is the only general way to get it right for
// every foreignVehicleId, not just the ones tested by hand.
function parseValidDateRange(
  message: string,
): { startDate: string; endDate: string } | null {
  const match = /(\d{4}-\d{2}-\d{2})\s*\.\.\s*(\d{4}-\d{2}-\d{2})/.exec(
    message,
  );
  return match ? { startDate: match[1], endDate: match[2] } : null;
}

export interface ApexBoxSubmitResult {
  clickLink: string;
  paymeLink: string;
  payallUrl?: string;
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
        payallUrl: submission.payallUrl ?? undefined,
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

    // /osago_calculation has to happen before CreatePolicyRequest either
    // way, since cost.insurancePremium/sumInsured are required *inputs* to
    // /osago (CreatePolicyResponse.premium below only confirms it after the
    // fact — it can't replace this call). Without this, those fields would
    // just be our own rough local PricingService estimate (a flat 10%
    // foreign-vehicle surcharge on the full-year base price, blind to the
    // selected foreignVehicleId duration) submitted to Apex_Box as if it
    // were the real premium — wrong for anything shorter than a year, and
    // the number actually shown to and charged from the customer.
    const { insurancePremium, sumInsured } = await this.runCalculation(
      policy,
      user,
      foreignPolicyDurationId,
    );

    const today = tashkentTodayIsoDate();
    // A same-day probe (startDate === endDate) hits a *different*, harder
    // validation error ("endDate must be greater than startDate", no valid
    // range stated) instead of the informative one this probe relies on —
    // one day out is enough to dodge that while still being wrong for any
    // real duration, so it reliably reaches the useful rejection.
    let startDate = today;
    let endDate = tashkentTomorrowIsoDate();
    let result = await this.apexBoxClient.createPolicy(
      this.buildCreatePolicyRequest(
        policy,
        user,
        foreignPolicyDurationId,
        submission.ourTransactionId,
        insurancePremium,
        sumInsured,
        startDate,
        endDate,
      ),
    );

    // The placeholder startDate/endDate above are almost certainly wrong
    // for any duration longer than one day — Asia Insurance's own
    // rejection message states the valid range directly (see
    // parseValidDateRange's comment for why this probe is necessary at
    // all), so retry once with the corrected range instead of failing the
    // whole submission over a guessable date mismatch.
    if (result.result === 8) {
      const range = parseValidDateRange(result.result_message ?? '');
      if (range) {
        startDate = range.startDate;
        endDate = range.endDate;
        result = await this.apexBoxClient.createPolicy(
          this.buildCreatePolicyRequest(
            policy,
            user,
            foreignPolicyDurationId,
            submission.ourTransactionId,
            insurancePremium,
            sumInsured,
            startDate,
            endDate,
          ),
        );
      }
    }

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
    submission.payallUrl = result.payall_url;
    submission.transactionId = result.transaction_uuid;
    submission.commissionAmount = result.commission;
    submission.insurancePremium = result.premium;
    await this.submissionsRepository.save(submission);

    return {
      clickLink: result.click_link,
      paymeLink: result.payme_link,
      payallUrl: result.payall_url,
      amountUzs: insurancePremium,
    };
  }

  // Mirrors InsurancePartnerService.findByTransactionId() for the Apex_Box
  // (foreign-vehicle) flow — used by PartnerTransactionsController so the
  // regulator (NAPP/ЕАИС «ЕРСП») can reconcile these policies too, not just
  // osago_v3 ones.
  async findByTransactionId(
    transactionId: string,
  ): Promise<ApexBoxSubmission | null> {
    return this.submissionsRepository.findOne({ where: { transactionId } });
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

  // Pricing-only preview: runs Apex_Box's calculator without registering a
  // contract, so the amount shown to the customer before they submit (e.g.
  // on the payment screen) is their real premium, not a local flat-rate
  // guess (see submitPolicy's comment on why the local estimate is wrong
  // for anything but a full year). Deliberately gated by
  // assertReadyForPricing, not the full assertReadyForSubmission — a price
  // preview should only require what /osago_calculation itself reads
  // (the applicant's own passport), not e.g. city/citizenship/each
  // restricted driver's license+relativeId, which only /osago (the actual
  // contract) needs. Otherwise a customer who hasn't yet filled in every
  // submission-time field could never see a price at all.
  async calculatePrice(
    policy: InsurancePolicy,
    user: User,
    foreignPolicyDurationId: string,
  ): Promise<number> {
    this.assertReadyForPricing(user);
    const { insurancePremium } = await this.runCalculation(
      policy,
      user,
      foreignPolicyDurationId,
    );
    return insurancePremium;
  }

  // Shared by calculatePrice and submitPolicy so Apex_Box's calc-call
  // request-building, result/amount validation, and error messages can't
  // drift between the two — both ultimately need the same premium/sum
  // figures from the same call.
  private async runCalculation(
    policy: InsurancePolicy,
    user: User,
    foreignPolicyDurationId: string,
  ): Promise<{ insurancePremium: number; sumInsured: number }> {
    const calc = await this.apexBoxClient.calculatePremium(
      this.buildCalculatePremiumRequest(policy, user, foreignPolicyDurationId),
    );
    if (calc.result !== 0) {
      throw new BadRequestException(
        `Apex_Box: ${calc.result_message || "noma'lum xatolik"}`,
      );
    }
    const insurancePremium = parseApexBoxAmount(calc.insurance_premium);
    const sumInsured = parseApexBoxAmount(calc.insurance_sum);
    if (!Number.isFinite(insurancePremium) || !Number.isFinite(sumInsured)) {
      throw new BadRequestException(
        "Apex_Box'dan noto'g'ri sug'urta mukofoti qaytdi",
      );
    }
    return { insurancePremium, sumInsured };
  }

  // The subset of assertReadyForSubmission's checks that
  // /osago_calculation itself actually reads — buildCalculatePremiumRequest
  // only ever touches the applicant's own passport series/number (not even
  // birthDate — see its own passportData comment), unlike the full
  // /osago contract request.
  private assertReadyForPricing(user: User): void {
    if (!user.passportSeries || !user.passportNumber) {
      throw new BadRequestException(
        "Quyidagi ma'lumotlar to'ldirilmagan: arizachining pasport ma'lumotlari (profil)",
      );
    }
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
    // Only required for a foreign-registered vehicle (this whole flow) —
    // see Vehicle.city's comment. The form only collects it unconditionally
    // for a "Xorij" vehicle, so an already-created vehicle reaching this
    // service should always have it, but check explicitly rather than
    // sending Apex_Box an empty applicant.address.
    if (!policy.vehicle.city) {
      missing.push('mashina manzili (shahar)');
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
      // See Driver.licenseNumber's comment — required here (Apex_Box), not
      // at the DTO level, since that's only known once the vehicle is.
      const missingLicense = policy.drivers.find(
        (d) => !d.licenseNumber || !d.licenseIssueDate,
      );
      if (missingLicense) {
        missing.push(
          `${missingLicense.fullName}: haydovchilik guvohnomasi ma'lumotlari`,
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
  // the vehicle's plate/tech-passport/type, and the cost fields that affect
  // the premium, not the full contract payload.
  private buildCalculatePremiumRequest(
    policy: InsurancePolicy,
    user: User,
    foreignPolicyDurationId: string,
  ): CalculatePremiumRequest {
    const today = tashkentTodayIsoDate();
    // CONFIRMED 2026-09-15: unlike /osago (create), which wants an EMPTY
    // pinfl for a foreign citizen, /osago_calculation rejects that with
    // "Не указан ПИНФЛ владельца ТС" and instead wants this literal
    // 14-zero placeholder — the same asymmetry already found on osago_v3's
    // equivalent calc/create pair.
    const APEX_BOX_CALC_PINFL_PLACEHOLDER = '00000000000000';
    const passportData = {
      pinfl: APEX_BOX_CALC_PINFL_PLACEHOLDER,
      seria: user.passportSeries as string,
      number: user.passportNumber as string,
      issuedBy: '-',
      issueDate: today,
    };
    const drivers =
      policy.driverRestriction === DriverRestriction.RESTRICTED
        ? policy.drivers.map((d: Driver) => ({
            passportData: {
              pinfl: APEX_BOX_CALC_PINFL_PLACEHOLDER,
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
        // See the module-level CONFIRMED 2026-10-14 comment in
        // apex-box.types.ts — without this, Asia Insurance tried to derive
        // the vehicle type from govNumber against their own Uzbek registry,
        // which fails outright for a genuinely foreign-registered plate.
        typeId: VEHICLE_TYPE_ID_MAP[policy.vehicle.vehicleType] ?? '1',
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
    sumInsured: number,
    startDate: string,
    endDate: string,
  ): CreatePolicyRequest {
    const name = splitFullName(user.fullName);
    const today = tashkentTodayIsoDate();
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
              // Guaranteed non-null here (as is relative below) —
              // assertReadyForSubmission() above already rejected the
              // submission otherwise.
              licenseNumber: d.licenseNumber as string,
              licenseSeria: '-',
              licenseIssueDate: d.licenseIssueDate as string,
              birthDate: d.birthDate,
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
        // Guaranteed non-null here — assertReadyForSubmission() above
        // already rejected the submission otherwise.
        address: policy.vehicle.city as string,
        residentOfUzb: ApexBoxResidentOfUzb.FOREIGNER,
        citizenshipId: user.citizenshipId as string,
      },
      owner: {
        person: { passportData, fullName: name },
        applicantIsOwner: policy.vehicle.ownerIsApplicant,
        residentOfUzb: ApexBoxResidentOfUzb.FOREIGNER,
      },
      details: {
        // RESOLVED 2026-09-15: the "dates don't match the chosen period"
        // rejection this used to always hit turned out to be caused by
        // residentOfUzb being sent as a string ("2") instead of the
        // integer their schema actually requires — once fixed, Asia
        // Insurance's real per-duration date range came back correctly.
        // startDate/endDate here are still just a same-day placeholder;
        // submitPolicy() probes with this, reads the authoritative range
        // out of a result:8 rejection, and rebuilds via this same method
        // with the corrected dates (see parseValidDateRange's comment for
        // why a probe is the only general way to get this right).
        issueDate: startDate,
        startDate,
        endDate,
        driverNumberRestriction:
          policy.driverRestriction === DriverRestriction.RESTRICTED,
        transactionId: String(ourTransactionId),
      },
      cost: {
        discountId: '1',
        insurancePremium: String(insurancePremium),
        // CONFIRMED 2026-09-15: must be Apex_Box's own calculated sum, not
        // a fixed default — a hardcoded 40,000,000 was rejected (result:
        // 17, "Ошибка в страховой сумме") for a vehicle whose real
        // calculated sum differs (e.g. a heavy truck's 80,000,000).
        sumInsured: String(sumInsured),
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
