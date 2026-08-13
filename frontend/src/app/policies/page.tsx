'use client';

import { useEffect, useMemo, useState } from 'react';
import { InsurancePolicy, User } from '@/types';
import { getPolicyPdfBlob, listPolicies } from '@/lib/api/policies';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { AuthGuard } from '@/components/AuthGuard';
import { DashboardShell } from '@/components/DashboardShell';
import { ResumeApplicationBanner } from '@/components/ResumeApplicationBanner';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

type StatusFilter = InsurancePolicy['status'] | 'all';

const STATUS_LABELS: Record<InsurancePolicy['status'], { label: string; className: string }> = {
  draft: { label: 'Qoralama', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  pending_payment: { label: 'To\'lov kutilmoqda', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  awaiting_partner_payment: { label: 'Sug\'urta kompaniyasida to\'lov kutilmoqda', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  paid: { label: 'To\'langan', className: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' },
  cancelled: { label: 'Bekor qilingan', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Barchasi' },
  { value: 'draft', label: 'Qoralama' },
  { value: 'pending_payment', label: 'To\'lov kutilmoqda' },
  { value: 'awaiting_partner_payment', label: 'Sug\'urta kompaniyasida to\'lov kutilmoqda' },
  { value: 'paid', label: 'To\'langan' },
  { value: 'cancelled', label: 'Bekor qilingan' },
];

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function PoliciesContent({ user }: { user: User }) {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    (async () => {
      try {
        const data = await listPolicies();
        setPolicies(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Polislar ro\'yxatini olishda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  const handleDownload = async (policyId: string, policyNumber: string | null) => {
    setDownloadingId(policyId);
    try {
      const blob = await getPolicyPdfBlob(policyId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${policyNumber ?? 'osago-polis'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF muvaffaqiyatli yuklab olindi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PDF faylni yuklab olishda xatolik yuz berdi');
    } finally {
      setDownloadingId(null);
    }
  };

  const activeCount = policies.filter((p) => p.status === 'paid').length;
  const totalSpent = policies.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.price, 0);

  const filteredPolicies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return policies.filter((policy) => {
      const matchesStatus = statusFilter === 'all' || policy.status === statusFilter;
      if (!matchesStatus) return false;
      if (!normalizedQuery) return true;
      const haystack = [policy.policyNumber, policy.vehicle?.model, policy.vehicle?.plateNumber]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [policies, query, statusFilter]);

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mening polislarim</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Barcha OSAGO arizalaringiz va faol polislaringiz</p>

      <ResumeApplicationBanner />

      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatTile label="Jami polislar" value={String(policies.length)} />
        <StatTile label="Faol polislar" value={String(activeCount)} />
        <StatTile label="Umumiy to'lov" value={formatCurrency(totalSpent)} />
      </div>

      {!loading && policies.length > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Polis raqami, model yoki davlat raqami bo'yicha qidirish"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <Select
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          />
        </div>
      )}

      {loading && <p className="mt-8 text-sm text-slate-500">Yuklanmoqda...</p>}

      {!loading && policies.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Hozircha sizda sug&apos;urta polislari yo&apos;q.
        </div>
      )}

      {!loading && policies.length > 0 && filteredPolicies.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Qidiruv bo&apos;yicha polis topilmadi.
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-5">
        {filteredPolicies.map((policy) => {
          const status = STATUS_LABELS[policy.status];
          return (
            <div
              key={policy.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {policy.policyNumber ?? 'Polis raqami hali berilmagan'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {policy.vehicle ? `${policy.vehicle.model} · ${policy.vehicle.plateNumber}` : '-'}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                  {status.label}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <span>
                  Narxi: <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(policy.price)}</span>
                </span>
                {policy.validTo && (
                  <span className="text-xs text-slate-500">
                    {new Date(policy.validFrom!).toLocaleDateString('uz-UZ')} — {new Date(policy.validTo).toLocaleDateString('uz-UZ')}
                  </span>
                )}
              </div>

              {policy.status === 'paid' && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    isLoading={downloadingId === policy.id}
                    onClick={() => handleDownload(policy.id, policy.policyNumber)}
                  >
                    PDF yuklab olish
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function PoliciesPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <AuthGuard>
      <DashboardShell>{user && <PoliciesContent user={user} />}</DashboardShell>
    </AuthGuard>
  );
}
