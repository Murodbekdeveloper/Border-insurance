'use client';

import { useEffect, useState } from 'react';
import { AdminLoginAttempt } from '@/types';
import { listLoginAttempts } from '@/lib/api/admin';
import { toast } from '@/store/toastStore';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminShell } from '@/components/AdminShell';
import { Pager } from '@/components/admin/Pager';

const PAGE_SIZE = 30;

function SecurityContent() {
  const [attempts, setAttempts] = useState<AdminLoginAttempt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const result = await listLoginAttempts(page, PAGE_SIZE);
        setAttempts(result.data);
        setTotal(result.total);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Kirish urinishlarini olishda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  const failedCount = attempts.filter((a) => !a.success).length;

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Xavfsizlik</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Admin panelga kirish urinishlari — kim, qachon, muvaffaqiyatli yoki yo&apos;q
      </p>

      {!loading && failedCount > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          Ushbu sahifadagi {failedCount} ta urinish muvaffaqiyatsiz tugagan.
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading && <p className="p-6 text-sm text-slate-500">Yuklanmoqda...</p>}
        {!loading && attempts.length === 0 && <p className="p-6 text-sm text-slate-400">Hozircha urinishlar yo&apos;q</p>}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {attempts.map((attempt) => (
            <div key={attempt.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    attempt.success ? 'bg-[#0ca30c]' : 'bg-[#d03b3b]'
                  }`}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {attempt.email}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {attempt.ipAddress ?? "IP noma'lum"} · {new Date(attempt.createdAt).toLocaleString('uz-UZ')}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  attempt.success
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                }`}
              >
                {attempt.success ? 'Muvaffaqiyatli' : "Rad etildi"}
              </span>
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

export default function AdminSecurityPage() {
  return (
    <AdminGuard>
      <AdminShell>
        <SecurityContent />
      </AdminShell>
    </AdminGuard>
  );
}
