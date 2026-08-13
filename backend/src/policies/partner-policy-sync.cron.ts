import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PoliciesService } from './policies.service';
import { InsurancePartnerService } from '../insurance-partner/insurance-partner.service';

// Bridges InsurancePartnerModule (talks to Asia Insurance, owns
// PartnerSubmission) and PoliciesModule (owns InsurancePolicy.status) —
// lives here rather than reacting instantly inside PaymentCallbackController
// so the module dependency stays one-directional (Policies -> InsurancePartner
// only, no forwardRef). A one-minute delay between "Asia Insurance confirmed
// payment" and "customer sees PAID" is a non-issue since payallUrl is an
// external redirect the customer may not even return from immediately.
const STALE_AWAITING_PARTNER_MS = 15 * 60_000;

@Injectable()
export class PartnerPolicySyncCron {
  private readonly logger = new Logger(PartnerPolicySyncCron.name);

  constructor(
    private readonly policiesService: PoliciesService,
    private readonly insurancePartnerService: InsurancePartnerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sync(): Promise<void> {
    await this.reconcileStaleSubmissions();
    await this.finalizeReadySubmissions();
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
}
