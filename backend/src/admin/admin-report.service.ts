import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PoliciesService } from '../policies/policies.service';
import { PaymentsService } from '../payments/payments.service';
import { PaymentStatus } from '../payments/entities/payment.entity';
import { AdminAuthService } from './admin-auth.service';
import { EmailService } from '../notifications/email.service';

export interface MonthlyReportStats {
  monthLabel: string;
  newUsers: number;
  paidPolicies: number;
  revenue: number;
  successfulPayments: number;
  failedPayments: number;
}

const MONTH_LABELS = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
];

@Injectable()
export class AdminReportService {
  private readonly logger = new Logger(AdminReportService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly policiesService: PoliciesService,
    private readonly paymentsService: PaymentsService,
    private readonly adminAuthService: AdminAuthService,
    private readonly emailService: EmailService,
  ) {}

  // Previous full calendar month — run on the 1st, this is the month that
  // just ended, not the one still in progress.
  async buildPreviousMonthReport(): Promise<MonthlyReportStats> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      newUsers,
      paidPolicies,
      revenue,
      successfulPayments,
      failedPayments,
    ] = await Promise.all([
      this.usersService.countCreatedBetween(start, end),
      this.policiesService.countPaidBetween(start, end),
      this.policiesService.sumRevenueBetween(start, end),
      this.paymentsService.countByStatusBetween(
        PaymentStatus.SUCCESS,
        start,
        end,
      ),
      this.paymentsService.countByStatusBetween(
        PaymentStatus.FAILED,
        start,
        end,
      ),
    ]);

    return {
      monthLabel: `${MONTH_LABELS[start.getMonth()]} ${start.getFullYear()}`,
      newUsers,
      paidPolicies,
      revenue,
      successfulPayments,
      failedPayments,
    };
  }

  async sendPreviousMonthReport(): Promise<void> {
    const stats = await this.buildPreviousMonthReport();
    const admins = await this.adminAuthService.findAll();
    if (admins.length === 0) return;

    const subject = `OSAGO oylik hisobot — ${stats.monthLabel}`;
    const html = `
      <p>Hurmatli administrator,</p>
      <p><strong>${stats.monthLabel}</strong> oyi uchun OSAGO tizimi statistikasi:</p>
      <ul>
        <li>Yangi foydalanuvchilar: <strong>${stats.newUsers}</strong></li>
        <li>To'langan so'rovlar: <strong>${stats.paidPolicies}</strong></li>
        <li>Umumiy tushum: <strong>${stats.revenue.toLocaleString('uz-UZ')} so'm</strong></li>
        <li>Muvaffaqiyatli to'lovlar: <strong>${stats.successfulPayments}</strong></li>
        <li>Rad etilgan to'lovlar: <strong>${stats.failedPayments}</strong></li>
      </ul>
    `;

    for (const admin of admins) {
      try {
        await this.emailService.send({ to: admin.email, subject, html });
      } catch (err) {
        this.logger.warn(
          `Monthly report email failed for ${admin.email}: ${(err as Error).message}`,
        );
      }
    }
    this.logger.log(
      `Sent monthly report for ${stats.monthLabel} to ${admins.length} admin(s)`,
    );
  }
}
