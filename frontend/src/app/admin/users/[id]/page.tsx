'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminUserDetail, cancelAdminPolicy, getAdminUserDetail, setUserActive } from '@/lib/api/admin';
import { formatCurrency } from '@/lib/utils';
import { POLICY_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/adminLabels';
import { toast } from '@/store/toastStore';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminShell } from '@/components/AdminShell';
import { Button } from '@/components/ui/Button';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('uz-UZ');
}

function Section({ title, children, empty }: { title: string; children: React.ReactNode; empty: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h2>
      {empty ? <p className="text-sm text-slate-400">Ma&apos;lumot topilmadi</p> : <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}

function UserDetailContent({ id }: { id: string }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingActive, setTogglingActive] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setDetail(await getAdminUserDetail(id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ma'lumotlarni olishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleToggleActive = async () => {
    if (!detail) return;
    const nextActive = !detail.user.isActive;
    if (!nextActive && !window.confirm("Ushbu foydalanuvchini bloklamoqchimisiz? U tizimga kira olmay qoladi.")) {
      return;
    }
    setTogglingActive(true);
    try {
      const updated = await setUserActive(id, nextActive);
      setDetail({ ...detail, user: updated });
      toast.success(nextActive ? 'Foydalanuvchi blokdan chiqarildi' : 'Foydalanuvchi bloklandi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Holatni o'zgartirishda xatolik yuz berdi");
    } finally {
      setTogglingActive(false);
    }
  };

  const handleCancelPolicy = async (policyId: string) => {
    setCancellingId(policyId);
    try {
      await cancelAdminPolicy(policyId);
      toast.success("So'rov bekor qilindi");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bekor qilishda xatolik yuz berdi");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Yuklanmoqda...</p>;
  }

  if (!detail) {
    return <p className="text-sm text-slate-400">Foydalanuvchi topilmadi</p>;
  }

  const { user, vehicles, policies, payments } = detail;

  return (
    <>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Foydalanuvchilarga qaytish
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{user.fullName}</h1>
              {user.isActive === false && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
                  Bloklangan
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
        </div>
        <Button
          variant={user.isActive === false ? 'success' : 'danger'}
          isLoading={togglingActive}
          onClick={handleToggleActive}
          className="px-4 py-2 text-sm"
        >
          {user.isActive === false ? 'Blokdan chiqarish' : 'Bloklash'}
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Shaxsiy ma&apos;lumotlar</h2>
          <dl className="grid grid-cols-4 gap-5 text-sm">
            <div>
              <dt className="text-slate-400">Telefon</dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">{user.phone ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Rezident turi</dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {user.residentType === 'non_resident' ? 'Norezident' : user.residentType === 'resident' ? 'Rezident' : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Kirish usuli</dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">{user.googleId ? 'Google' : 'Email/parol'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Ro&apos;yxatdan o&apos;tgan sana</dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <Section title={`Avtomobillari (${vehicles.length})`} empty={vehicles.length === 0}>
          {vehicles.map((v) => (
            <div key={v.id} className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{v.plateNumber}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{v.city ? `${v.model} · ${v.city}` : v.model}</p>
            </div>
          ))}
        </Section>

        <Section title={`So'rovlari (${policies.length})`} empty={policies.length === 0}>
          {policies.map((p) => {
            const status = POLICY_STATUS_LABELS[p.status];
            const canCancel = p.status !== 'cancelled';
            return (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {p.policyNumber ?? 'Qoralama'} · {p.vehicle?.plateNumber ?? '-'}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{formatCurrency(p.price)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                  {canCancel && (
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      isLoading={cancellingId === p.id}
                      onClick={() => handleCancelPolicy(p.id)}
                    >
                      Bekor qilish
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </Section>

        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">To&apos;lovlari ({payments.length})</h2>
          {payments.length === 0 && <p className="text-sm text-slate-400">To&apos;lov topilmadi</p>}
          <div className="flex flex-col gap-2">
            {payments.map((payment) => {
              const status = PAYMENT_STATUS_LABELS[payment.status];
              return (
                <div key={payment.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatCurrency(payment.amount)}
                      {payment.card?.maskedNumber && ` · **** ${payment.card.maskedNumber}`}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {payment.transactionId} · {new Date(payment.createdAt).toLocaleString('uz-UZ')}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AdminGuard>
      <AdminShell>
        <UserDetailContent id={id} />
      </AdminShell>
    </AdminGuard>
  );
}
