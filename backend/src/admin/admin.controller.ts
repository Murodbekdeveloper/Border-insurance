import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { PoliciesService } from '../policies/policies.service';
import { PolicyStatus } from '../policies/entities/insurance-policy.entity';
import { PaymentsService } from '../payments/payments.service';
import { PaymentStatus } from '../payments/entities/payment.entity';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

interface ActivityItem {
  type: 'user' | 'policy' | 'payment';
  description: string;
  createdAt: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly policiesService: PoliciesService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get('stats')
  @ApiOperation({
    summary:
      "Umumiy statistika (foydalanuvchilar, so'rovlar, to'lovlar, tushum)",
  })
  async stats() {
    const [
      totalUsers,
      totalPolicies,
      activePolicies,
      totalRevenue,
      successfulPayments,
      failedPayments,
    ] = await Promise.all([
      this.usersService.countAll(),
      this.policiesService.countAll(),
      this.policiesService.countByStatus(PolicyStatus.PAID),
      this.policiesService.sumRevenue(),
      this.paymentsService.countByStatus(PaymentStatus.SUCCESS),
      this.paymentsService.countByStatus(PaymentStatus.FAILED),
    ]);
    return {
      totalUsers,
      totalPolicies,
      activePolicies,
      totalRevenue,
      successfulPayments,
      failedPayments,
    };
  }

  @Get('stats/dashboard')
  @ApiOperation({
    summary:
      "Bosh sahifa uchun kengaytirilgan statistika (oylik tushum, to'lov muvaffaqiyat darajasi, so'nggi faoliyat)",
  })
  async dashboard(@Query() query: DashboardQueryDto) {
    const months = query.months ?? 6;

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      monthlyRevenueRows,
      successThisMonth,
      failedThisMonth,
      expiringPoliciesCount,
      newUsersToday,
      newUsersThisWeek,
      recentUsers,
      recentPolicies,
      recentPayments,
    ] = await Promise.all([
      this.policiesService.monthlyRevenue(months),
      this.paymentsService.countByStatusSince(
        PaymentStatus.SUCCESS,
        startOfMonth,
      ),
      this.paymentsService.countByStatusSince(
        PaymentStatus.FAILED,
        startOfMonth,
      ),
      this.policiesService.countExpiringSoon(30),
      this.usersService.countCreatedSince(startOfToday),
      this.usersService.countCreatedSince(startOfWeek),
      this.usersService.findRecent(10),
      this.policiesService.findRecent(10),
      this.paymentsService.findRecent(10),
    ]);

    // Zero-fill months with no revenue so the chart always shows a full,
    // contiguous range rather than skipping quiet months.
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    const cursor = new Date(
      now.getFullYear(),
      now.getMonth() - (months - 1),
      1,
    );
    for (let i = 0; i < months; i++) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const found = monthlyRevenueRows.find((r) => r.month === key);
      monthlyRevenue.push({ month: key, revenue: found?.revenue ?? 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const totalThisMonth = successThisMonth + failedThisMonth;
    const successRate =
      totalThisMonth === 0
        ? null
        : Math.round((successThisMonth / totalThisMonth) * 100);

    const activity: ActivityItem[] = [
      ...recentUsers.map((u): ActivityItem => ({
        type: 'user',
        description: `${u.fullName} ro'yxatdan o'tdi`,
        createdAt: u.createdAt.toISOString(),
      })),
      ...recentPolicies.map((p): ActivityItem => ({
        type: 'policy',
        description: p.policyNumber
          ? `${p.policyNumber} so'rovi to'landi`
          : "Yangi so'rov yaratildi",
        createdAt: p.createdAt.toISOString(),
      })),
      ...recentPayments.map((pay): ActivityItem => ({
        type: 'payment',
        description:
          pay.status === PaymentStatus.SUCCESS
            ? `${pay.amount.toLocaleString('uz-UZ')} so'mlik to'lov muvaffaqiyatli o'tdi`
            : `${pay.amount.toLocaleString('uz-UZ')} so'mlik to'lov rad etildi`,
        createdAt: pay.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 10);

    return {
      monthlyRevenue,
      paymentSuccessRate: {
        success: successThisMonth,
        failed: failedThisMonth,
        rate: successRate,
      },
      expiringPoliciesCount,
      newUsersToday,
      newUsersThisWeek,
      recentActivity: activity,
    };
  }
}
