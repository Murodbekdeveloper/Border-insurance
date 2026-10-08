'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminStats, DashboardData, getAdminDashboard, getAdminStats } from '@/lib/api/admin';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/store/toastStore';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminShell } from '@/components/AdminShell';
import { StatTile } from '@/components/admin/StatTile';
import { RevenueBarChart } from '@/components/admin/RevenueBarChart';
import { SuccessRateMeter } from '@/components/admin/SuccessRateMeter';
import { ActivityFeed } from '@/components/admin/ActivityFeed';

function QuickLinkCard({ href, title, value, description, delay = 0 }: { href: string; title: string; value: string; description: string; delay?: number }) {
  return (
    <Link
      href={href}
      className="group animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200">
        Barchasini ko&apos;rish
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
        </svg>
      </p>
    </Link>
  );
}

function AdminContent() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    (async () => {
      try {
        setStats(await getAdminStats());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Ma'lumotlarni olishda xatolik yuz berdi");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setDashboard(await getAdminDashboard(months));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Ma'lumotlarni olishda xatolik yuz berdi");
      }
    })();
  }, [months]);

  return (
    <>
      <h1 className="animate-fade-in-up text-2xl font-bold text-slate-900 dark:text-slate-100">Bosh sahifa</h1>
      <p className="animate-fade-in-up mt-1 text-sm text-slate-500 dark:text-slate-400" style={{ animationDelay: '40ms' }}>
        Umumiy statistika
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Foydalanuvchilar" value={stats ? String(stats.totalUsers) : '-'} numericValue={stats?.totalUsers} delay={0} />
        <StatTile label="Umumiy tushum" value={stats ? formatCurrency(stats.totalRevenue) : '-'} numericValue={stats?.totalRevenue} formatter={formatCurrency} delay={40} />
        <StatTile label="Faol (to'langan) so'rovlar" value={stats ? String(stats.activePolicies) : '-'} numericValue={stats?.activePolicies} delay={80} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Bugun ro'yxatdan o'tganlar" value={dashboard ? String(dashboard.newUsersToday) : '-'} numericValue={dashboard?.newUsersToday} delay={120} />
        <StatTile label="Shu hafta ro'yxatdan o'tganlar" value={dashboard ? String(dashboard.newUsersThisWeek) : '-'} numericValue={dashboard?.newUsersThisWeek} delay={160} />
        <StatTile label="Muddati yaqinlashgan so'rovlar" value={dashboard ? String(dashboard.expiringPoliciesCount) : '-'} numericValue={dashboard?.expiringPoliciesCount} delay={200} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          {dashboard && (
            <RevenueBarChart key={months} data={dashboard.monthlyRevenue} months={months} onMonthsChange={setMonths} />
          )}
        </div>
        <div>
          {dashboard && <SuccessRateMeter {...dashboard.paymentSuccessRate} />}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickLinkCard
          href="/admin/users"
          title="Foydalanuvchilar"
          value={stats ? String(stats.totalUsers) : '-'}
          description="Ro'yxatdan o'tgan barcha foydalanuvchilar"
          delay={0}
        />
        <QuickLinkCard
          href="/admin/policies"
          title="So'rovlar"
          value={stats ? String(stats.totalPolicies) : '-'}
          description="Yuborilgan barcha OSAGO so'rovlari"
          delay={40}
        />
        <QuickLinkCard
          href="/admin/payments"
          title="To'lovlar"
          value={stats ? String(stats.successfulPayments + stats.failedPayments) : '-'}
          description={stats ? `${stats.successfulPayments} muvaffaqiyatli · ${stats.failedPayments} rad etilgan` : ''}
          delay={80}
        />
      </div>

      <div className="mt-6">
        {dashboard && <ActivityFeed items={dashboard.recentActivity} />}
      </div>
    </>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminShell>
        <AdminContent />
      </AdminShell>
    </AdminGuard>
  );
}
