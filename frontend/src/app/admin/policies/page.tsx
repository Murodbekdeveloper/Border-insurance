'use client';

import { useEffect, useState } from 'react';
import { InsurancePolicy, PolicyStatus } from '@/types';
import { cancelAdminPolicy, exportAdminPolicies, listAdminPolicies } from '@/lib/api/admin';
import { formatCurrency } from '@/lib/utils';
import { POLICY_STATUS_LABELS } from '@/lib/adminLabels';
import { toast } from '@/store/toastStore';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminShell } from '@/components/AdminShell';
import { Pager } from '@/components/admin/Pager';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'draft', label: 'Qoralama' },
  { value: 'pending_payment', label: "To'lov kutilmoqda" },
  { value: 'awaiting_partner_payment', label: "Sug'urta kompaniyasida to'lov kutilmoqda" },
  { value: 'paid', label: "To'langan" },
  { value: 'cancelled', label: 'Bekor qilingan' },
];

function PoliciesContent() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PolicyStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await listAdminPolicies(page, PAGE_SIZE, status);
      setPolicies(result.data);
      setTotal(result.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Polislarni olishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAdminPolicies(status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eksport qilishda xatolik yuz berdi');
    } finally {
      setExporting(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelAdminPolicy(id);
      toast.success("So'rov bekor qilindi");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bekor qilishda xatolik yuz berdi");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">So&apos;rovlar</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Jami {total} ta yuborilgan OSAGO so&apos;rovi</p>
        </div>
        <Button variant="outline" isLoading={exporting} onClick={handleExport} className="self-start px-4 py-2 text-sm sm:self-auto">
          CSV eksport
        </Button>
      </div>

      <div className="mt-6 max-w-xs">
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as PolicyStatus | '');
            setPage(1);
          }}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading && <p className="p-6 text-sm text-slate-500">Yuklanmoqda...</p>}
        {!loading && policies.length === 0 && <p className="p-6 text-sm text-slate-400">Polis topilmadi</p>}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {policies.map((policy) => {
            const statusInfo = POLICY_STATUS_LABELS[policy.status];
            const canCancel = policy.status !== 'cancelled';
            return (
              <div key={policy.id} className="flex items-center justify-between px-6 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {policy.policyNumber ?? 'Qoralama'} · {policy.vehicle?.plateNumber ?? '-'}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {policy.vehicle?.model ?? '-'} · {formatCurrency(policy.price)} · {new Date(policy.createdAt).toLocaleDateString('uz-UZ')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.className}`}>{statusInfo.label}</span>
                  {canCancel && (
                    <Button
                      variant="ghost"
                      className="px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      isLoading={cancellingId === policy.id}
                      onClick={() => handleCancel(policy.id)}
                    >
                      Bekor qilish
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {total > PAGE_SIZE && (
          <div className="px-6 pb-5">
            <Pager page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminPoliciesPage() {
  return (
    <AdminGuard>
      <AdminShell>
        <PoliciesContent />
      </AdminShell>
    </AdminGuard>
  );
}
