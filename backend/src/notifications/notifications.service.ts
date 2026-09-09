import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import { renderEmailLayout } from './email-template';
import { InsurancePolicy } from '../policies/entities/insurance-policy.entity';
import { User } from '../users/entities/user.entity';

function formatDate(date: Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('uz-UZ');
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly emailService: EmailService) {}

  async notifyPolicyConfirmed(
    policy: InsurancePolicy,
    user: User,
  ): Promise<void> {
    const subject = `Polis tasdiqlandi — ${policy.policyNumber}`;
    const html = renderEmailLayout(`
      <p style="margin:0 0 12px;">Hurmatli ${user.fullName},</p>
      <p style="margin:0 0 16px;"><strong>${policy.policyNumber}</strong> raqamli OSAGO sug'urta polisingiz muvaffaqiyatli rasmiylashtirildi. ✅</p>
      <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;color:#166534;">
        Amal qilish muddati:<br />
        <strong>${formatDate(policy.validFrom)} — ${formatDate(policy.validTo)}</strong>
      </div>
      <p style="margin:16px 0 0;">Bizni tanlaganingiz uchun rahmat!</p>
    `);

    await this.dispatch(user, subject, html);
  }

  async notifyPolicyExpiring(
    policy: InsurancePolicy,
    user: User,
    daysLeft: number,
  ): Promise<void> {
    const subject = `Polis muddati tugashi yaqinlashdi — ${policy.policyNumber}`;
    const html = renderEmailLayout(`
      <p style="margin:0 0 12px;">Hurmatli ${user.fullName},</p>
      <div style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;color:#92400e;margin-bottom:16px;">
        ⚠️ <strong>${policy.policyNumber}</strong> raqamli OSAGO polisingizning amal qilish muddati <strong>${daysLeft} kundan so'ng</strong> (${formatDate(policy.validTo)}) tugaydi.
      </div>
      <p style="margin:0;">Uzluksiz himoyalanish uchun yangi polis rasmiylashtirishni unutmang.</p>
    `);

    await this.dispatch(user, subject, html);
  }

  private async dispatch(
    user: User,
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      await this.emailService.send({ to: user.email, subject, html });
    } catch (err) {
      this.logger.warn(
        `Email notification failed for ${user.email}: ${(err as Error).message}`,
      );
    }
  }
}
