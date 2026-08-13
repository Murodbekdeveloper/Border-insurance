'use client';

import { useEffect, useState } from 'react';
import { AdminAuditLogEntry } from '@/types';
import { listAuditLog } from '@/lib/api/admin';
import { toast } from '@/store/toastStore';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminShell } from '@/components/AdminShell';
import { Pager } from '@/components/admin/Pager';

const PAGE_SIZE = 30;

const ACTION_LABELS: Record<string, string> = {
  'user.block': 'foydalanuvchini bloklandi',
  'user.unblock': 'foydalanuvchi blokdan chiqarildi',
  'policy.cancel': "so'rov bekor qilindi",
  'admin.create': 'yangi admin yaratildi',
  'admin.delete': "admin o'chirildi",
};

function AuditLogContent() {
  const [entries, setEntries] = useState<AdminAuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const result = await listAuditLog(page, PAGE_SIZE);
        setEntries(result.data);
        setTotal(result.total);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Amallar tarixini olishda xatolik yuz berdi");
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Amallar tarixi</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Adminlar tomonidan bajarilgan amallar (kim, qachon, nima qildi)</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading && <p className="p-6 text-sm text-slate-500">Yuklanmoqda...</p>}
        {!loading && entries.length === 0 && <p className="p-6 text-sm text-slate-400">Hozircha amallar yo&apos;q</p>}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-6 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {entry.adminEmail} · {ACTION_LABELS[entry.action] ?? entry.action}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {entry.details && `${entry.details} · `}
                  {new Date(entry.createdAt).toLocaleString('uz-UZ')}
                </p>
              </div>
            </div>
          ))}
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

export default function AdminAuditLogPage() {
  return (
    <AdminGuard>
      <AdminShell>
        <AuditLogContent />
      </AdminShell>
    </AdminGuard>
  );
}
