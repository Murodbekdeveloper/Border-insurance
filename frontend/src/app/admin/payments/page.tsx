'use client';

import { useEffect, useState } from 'react';
import { Payment, PaymentStatus } from '@/types';
import { exportAdminPayments, listAdminPayments } from '@/lib/api/admin';
import { formatCurrency } from '@/lib/utils';
import { PAYMENT_STATUS_LABELS } from '@/lib/adminLabels';
import { toast } from '@/store/toastStore';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminShell } from '@/components/AdminShell';
import { Pager } from '@/components/admin/Pager';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'success', label: 'Muvaffaqiyatli' },
  { value: 'failed', label: 'Rad etilgan' },
  { value: 'pending', label: 'Kutilmoqda' },
];

function PaymentsContent() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const result = await listAdminPayments(page, PAGE_SIZE, status);
        setPayments(result.data);
        setTotal(result.total);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "To'lovlarni olishda xatolik yuz berdi");
      } finally {
        setLoading(false);
      }
    })();
  }, [page, status]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAdminPayments(status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eksport qilishda xatolik yuz berdi');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">To&apos;lovlar</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Jami {total} ta to&apos;lov urinishi</p>
        </div>
        <Button variant="outline" isLoading={exporting} onClick={handleExport} className="px-4 py-2 text-sm">
          CSV eksport
        </Button>
      </div>

      <div className="mt-6 max-w-xs">
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as PaymentStatus | '');
            setPage(1);
          }}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading && <p className="p-6 text-sm text-slate-500">Yuklanmoqda...</p>}
        {!loading && payments.length === 0 && <p className="p-6 text-sm text-slate-400">To&apos;lov topilmadi</p>}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {payments.map((payment) => {
            const statusInfo = PAYMENT_STATUS_LABELS[payment.status];
            return (
              <div key={payment.id} className="flex items-center justify-between px-6 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatCurrency(payment.amount)}
                    {payment.policy?.policyNumber && ` · ${payment.policy.policyNumber}`}
                    {payment.card?.maskedNumber && ` · **** ${payment.card.maskedNumber}`}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {payment.transactionId} · {new Date(payment.createdAt).toLocaleString('uz-UZ')}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.className}`}>{statusInfo.label}</span>
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

export default function AdminPaymentsPage() {
  return (
    <AdminGuard>
      <AdminShell>
        <PaymentsContent />
      </AdminShell>
    </AdminGuard>
  );
}
