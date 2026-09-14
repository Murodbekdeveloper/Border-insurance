import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as Sentry from '@sentry/nestjs';
import { PoliciesService } from './policies.service';
import { InsurancePartnerService } from '../insurance-partner/insurance-partner.service';
import { ApexBoxService } from '../insurance-partner/apex-box.service';

// Bridges InsurancePartnerModule (talks to Asia Insurance, owns
// PartnerSubmission) and PoliciesModule (owns InsurancePolicy.status) —
// lives here rather than reacting instantly inside PaymentCallbackController
// so the module dependency stays one-directional (Policies -> InsurancePartner
// only, no forwardRef). A one-minute delay between "Asia Insurance confirmed
// payment" and "customer sees PAID" is a non-issue since payallUrl is an
// external redirect the customer may not even return from immediately.
const STALE_AWAITING_PARTNER_MS = 15 * 60_000;

// If a submission is still stuck after this much longer, the customer has
// already been charged/redirected to pay but neither the webhook nor
// polling has resolved it — that's worth a human's attention, not just an
// indefinite silent retry loop.
const NEEDS_ATTENTION_MS = 6 * 60 * 60_000;

@Injectable()
export class PartnerPolicySyncCron {
  private readonly logger = new Logger(PartnerPolicySyncCron.name);

  constructor(
    private readonly policiesService: PoliciesService,
    private readonly insurancePartnerService: InsurancePartnerService,
    private readonly apexBoxService: ApexBoxService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sync(): Promise<void> {
    await this.reconcileStaleSubmissions();
    await this.finalizeReadySubmissions();
    await this.reconcileStaleApexBoxSubmissions();
    await this.finalizeReadyApexBoxSubmissions();
  }

  // /save-policy succeeded but no payment-callback webhook ever arrived —
  // poll Asia Insurance's getPolicy() directly as a fallback.
  private async reconcileStaleSubmissions(): Promise<void> {
    const staleBefore = new Date(Date.now() - STALE_AWAITING_PARTNER_MS);
    const stale =
      await this.insurancePartnerService.findStaleAwaitingPartnerResult(
        staleBefore,
      );
    for (const submission of stale) {
      try {
        await this.insurancePartnerService.reconcileFromPartner(submission);
      } catch (err) {
        this.logger.warn(
          `reconcileFromPartner failed for submission ${submission.id}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
      if (Date.now() - submission.createdAt.getTime() > NEEDS_ATTENTION_MS) {
        Sentry.captureMessage(
          'PartnerSubmission stuck awaiting Asia Insurance payment result for over 6 hours',
          {
            level: 'warning',
            extra: {
              submissionId: submission.id,
              policyId: submission.policyId,
            },
          },
        );
      }
    }
  }

  // Partner result already recorded (webhook or the reconcile pass above) —
  // flip the linked InsurancePolicy to PAID.
  private async finalizeReadySubmissions(): Promise<void> {
    const ready = await this.insurancePartnerService.findReadyForFinalization();
    for (const submission of ready) {
      try {
        await this.policiesService.finalizeAfterPartnerPayment(
          submission.policyId,
          submission.partnerPolicyNo as string,
          submission.startDate,
        );
      } catch (err) {
        this.logger.error(
          `finalizeAfterPartnerPayment failed for policy ${submission.policyId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }

  // Apex_Box equivalent of reconcileStaleSubmissions() above — required
  // because, unlike osago_v3, Apex_Box has no payment-callback webhook at
  // all (see ApexBoxService.reconcileFromPartner), so polling is the ONLY
  // way a foreign-vehicle policy's payment is ever detected.
  private async reconcileStaleApexBoxSubmissions(): Promise<void> {
    const staleBefore = new Date(Date.now() - STALE_AWAITING_PARTNER_MS);
    const stale =
      await this.apexBoxService.findStaleAwaitingResult(staleBefore);
    for (const submission of stale) {
      try {
        await this.apexBoxService.reconcileFromPartner(submission);
      } catch (err) {
        this.logger.warn(
          `Apex_Box reconcileFromPartner failed for submission ${submission.id}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
      if (Date.now() - submission.createdAt.getTime() > NEEDS_ATTENTION_MS) {
        Sentry.captureMessage(
          'ApexBoxSubmission stuck awaiting Apex_Box payment result for over 6 hours',
          {
            level: 'warning',
            extra: {
              submissionId: submission.id,
              policyId: submission.policyId,
            },
          },
        );
      }
    }
  }

  // Apex_Box equivalent of finalizeReadySubmissions() above. `startDate` is
  // passed as null (falls back to "now" in finalizeAfterPartnerPayment) —
  // ApexBoxSubmission doesn't track a separate declared start date the way
  // PartnerSubmission does, since Apex_Box's details.startDate is currently
  // always "today" at submission time anyway (see the NOT YET RESOLVED
  // comment in ApexBoxService.buildCreatePolicyRequest).
  private async finalizeReadyApexBoxSubmissions(): Promise<void> {
    const ready = await this.apexBoxService.findReadyForFinalization();
    for (const submission of ready) {
      try {
        await this.policiesService.finalizeAfterPartnerPayment(
          submission.policyId,
          submission.policyNo as string,
          null,
        );
      } catch (err) {
        this.logger.error(
          `finalizeAfterPartnerPayment (Apex_Box) failed for policy ${submission.policyId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }
}
