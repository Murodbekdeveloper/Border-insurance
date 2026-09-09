import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PoliciesService } from './policies.service';

// Abandoned DRAFT/PENDING_PAYMENT applications never expired on their own,
// which meant create()'s one-active-policy-per-vehicle lock could
// permanently block a user from re-applying for a vehicle they started but
// never paid for — the only fix used to be a manual admin cancellation.
const STALE_DRAFT_HOURS = 24;

@Injectable()
export class StaleDraftCleanupCron {
  private readonly logger = new Logger(StaleDraftCleanupCron.name);

  constructor(private readonly policiesService: PoliciesService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanup(): Promise<void> {
    const cancelled =
      await this.policiesService.cancelStaleDrafts(STALE_DRAFT_HOURS);
    if (cancelled > 0) {
      this.logger.log(`Cancelled ${cancelled} stale draft/unpaid policies`);
    }
  }
}
