'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InsurancePolicy, User } from '@/types';
import { getPolicyPdfBlob, listPolicies } from '@/lib/api/policies';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { TranslationKey } from '@/lib/i18n/useTranslation';
import { useAuthStore } from '@/store/authStore';
import { useApplicationStore } from '@/store/applicationStore';
import { toast } from '@/store/toastStore';
import { AuthGuard } from '@/components/AuthGuard';
import { DashboardShell } from '@/components/DashboardShell';
import { ResumeApplicationBanner } from '@/components/ResumeApplicationBanner';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

// Statuses where the application isn't finished yet — the customer can
// still pick it back up and pay. "paid"/"cancelled" are end states.
const RESUMABLE_STATUSES: InsurancePolicy['status'][] = [
  'draft',
  'pending_payment',
  'awaiting_partner_payment',
];

type StatusFilter = InsurancePolicy['status'] | 'all';

const STATUS_LABELS: Record<InsurancePolicy['status'], { labelKey: TranslationKey; className: string }> = {
  draft: { labelKey: 'policies.statusDraft', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  pending_payment: { labelKey: 'policies.statusPendingPayment', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  awaiting_partner_payment: { labelKey: 'policies.statusAwaitingPartnerPayment', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  paid: { labelKey: 'policies.statusPaid', className: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' },
  cancelled: { labelKey: 'policies.statusCancelled', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
};

const STATUS_FILTER_KEYS: { value: StatusFilter; labelKey: TranslationKey }[] = [
  { value: 'all', labelKey: 'policies.statusAll' },
  { value: 'draft', labelKey: 'policies.statusDraft' },
  { value: 'pending_payment', labelKey: 'policies.statusPendingPayment' },
  { value: 'awaiting_partner_payment', labelKey: 'policies.statusAwaitingPartnerPayment' },
  { value: 'paid', labelKey: 'policies.statusPaid' },
  { value: 'cancelled', labelKey: 'policies.statusCancelled' },
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
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { setPolicy, setPrice } = useApplicationStore();
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
        toast.error(err instanceof Error ? err.message : t('policies.fetchError'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.success(t('policies.pdfDownloadedToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('policies.pdfError'));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleResume = (policy: InsurancePolicy) => {
    setPolicy(policy.id);
    setPrice(policy.price);
    router.push('/payment');
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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('policies.title')}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('policies.subtitle')}</p>

      <ResumeApplicationBanner />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label={t('policies.totalPolicies')} value={String(policies.length)} />
        <StatTile label={t('policies.activePolicies')} value={String(activeCount)} />
        <StatTile label={t('policies.totalSpent')} value={formatCurrency(totalSpent, locale)} />
      </div>

      {!loading && policies.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('policies.searchPlaceholder')}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <Select
            options={STATUS_FILTER_KEYS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          />
        </div>
      )}

      {loading && <p className="mt-8 text-sm text-slate-500">{t('common.loading')}</p>}

      {!loading && policies.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          {t('policies.noPolicies')}
        </div>
      )}

      {!loading && policies.length > 0 && filteredPolicies.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          {t('policies.noSearchResults')}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {filteredPolicies.map((policy) => {
          const status = STATUS_LABELS[policy.status];
          const resumable = RESUMABLE_STATUSES.includes(policy.status);
          return (
            <div
              key={policy.id}
              role={resumable ? 'button' : undefined}
              tabIndex={resumable ? 0 : undefined}
              onClick={resumable ? () => handleResume(policy) : undefined}
              onKeyDown={
                resumable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleResume(policy);
                    }
                  : undefined
              }
              className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${resumable ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {policy.policyNumber ?? t('policies.noPolicyNumber')}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {policy.vehicle ? `${policy.vehicle.model} · ${policy.vehicle.plateNumber}` : '-'}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                  {t(status.labelKey)}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <span>
                  {t('policies.priceLabel')} <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(policy.price, locale)}</span>
                </span>
                {policy.validTo && (
                  <span className="text-xs text-slate-500">
                    {formatDate(policy.validFrom!, locale)} — {formatDate(policy.validTo, locale)}
                  </span>
                )}
              </div>

              {resumable && (
                <p className="mt-4 text-xs font-medium text-orange-600 dark:text-orange-400">
                  {t('policies.resumeHint')} →
                </p>
              )}

              {policy.status === 'paid' && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    isLoading={downloadingId === policy.id}
                    onClick={() => handleDownload(policy.id, policy.policyNumber)}
                  >
                    {t('policies.downloadPdf')}
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
