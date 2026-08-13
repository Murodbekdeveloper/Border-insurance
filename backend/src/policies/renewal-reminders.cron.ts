import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PoliciesService } from './policies.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

const REMINDER_THRESHOLD_DAYS = 30;

@Injectable()
export class RenewalRemindersCron {
  private readonly logger = new Logger(RenewalRemindersCron.name);

  constructor(
    private readonly policiesService: PoliciesService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendRenewalReminders(): Promise<void> {
    const policies = await this.policiesService.findExpiringPolicies(
      REMINDER_THRESHOLD_DAYS,
    );

    for (const policy of policies) {
      const user = await this.usersService.findById(policy.userId);
      if (!user || !policy.validTo) continue;

      const daysLeft = Math.ceil(
        (new Date(policy.validTo).getTime() - Date.now()) / 86_400_000,
      );
      await this.notificationsService.notifyPolicyExpiring(
        policy,
        user,
        daysLeft,
      );
      await this.policiesService.markReminderSent(policy.id);
    }

    if (policies.length > 0) {
      this.logger.log(`Sent ${policies.length} renewal reminder(s)`);
    }
  }
}
