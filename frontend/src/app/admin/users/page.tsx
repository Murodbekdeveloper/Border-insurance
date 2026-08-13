'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User } from '@/types';
import { exportAdminUsers, listAdminUsers } from '@/lib/api/admin';
import { toast } from '@/store/toastStore';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminShell } from '@/components/AdminShell';
import { Pager } from '@/components/admin/Pager';
import { Button } from '@/components/ui/Button';

const PAGE_SIZE = 20;

function UsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const result = await listAdminUsers(page, PAGE_SIZE, debouncedSearch);
        setUsers(result.data);
        setTotal(result.total);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Foydalanuvchilarni olishda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    })();
  }, [page, debouncedSearch]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAdminUsers(debouncedSearch);
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Foydalanuvchilar</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Jami {total} ta ro&apos;yxatdan o&apos;tgan foydalanuvchi</p>
        </div>
        <Button variant="outline" isLoading={exporting} onClick={handleExport} className="px-4 py-2 text-sm">
          CSV eksport
        </Button>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Ism yoki email bo'yicha qidirish"
        className="mt-6 w-full max-w-md rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      />

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading && <p className="p-6 text-sm text-slate-500">Yuklanmoqda...</p>}
        {!loading && users.length === 0 && <p className="p-6 text-sm text-slate-400">Foydalanuvchi topilmadi</p>}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.map((u) => (
            <Link
              key={u.id}
              href={`/admin/users/${u.id}`}
              className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {u.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{u.fullName}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                {u.isActive === false && (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    Bloklangan
                  </span>
                )}
                <span className="hidden text-xs text-slate-400 sm:block">{u.phone ?? '-'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-slate-300 dark:text-slate-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
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

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <AdminShell>
        <UsersContent />
      </AdminShell>
    </AdminGuard>
  );
}
