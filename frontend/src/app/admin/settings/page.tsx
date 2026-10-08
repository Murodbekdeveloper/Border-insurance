'use client';

import { useEffect, useState } from 'react';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import {
  changeAdminPassword,
  getMonthlyReportPreview,
  MonthlyReportPreview,
  sendMonthlyReportNow,
  updateAdminProfile,
} from '@/lib/api/admin';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/store/toastStore';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminShell } from '@/components/AdminShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';

function ProfileForm() {
  const admin = useAdminAuthStore((s) => s.admin);
  const updateAdmin = useAdminAuthStore((s) => s.updateAdmin);
  const [fullName, setFullName] = useState(admin?.fullName ?? '');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updated = await updateAdminProfile(fullName);
      updateAdmin(updated);
      toast.success('Profil yangilandi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Profilni yangilashda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Profil</h2>
      <div className="flex flex-col gap-4">
        <Input label="F.I.O." required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Email" value={admin?.email ?? ''} disabled />
      </div>
      <Button type="submit" variant="primary" isLoading={submitting} className="mt-4 px-6">
        Saqlash
      </Button>
    </form>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Yangi parollar mos kelmadi');
      return;
    }
    setSubmitting(true);
    try {
      await changeAdminPassword(currentPassword, newPassword);
      toast.success('Parol almashtirildi');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Parolni almashtirishda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Parolni almashtirish</h2>
      <div className="flex flex-col gap-4">
        <PasswordInput label="Joriy parol" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        <PasswordInput label="Yangi parol" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <PasswordInput label="Yangi parolni tasdiqlang" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      </div>
      <Button type="submit" variant="primary" isLoading={submitting} className="mt-4 px-6">
        Almashtirish
      </Button>
    </form>
  );
}

function MonthlyReportCard() {
  const [preview, setPreview] = useState<MonthlyReportPreview | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setPreview(await getMonthlyReportPreview());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Hisobotni olishda xatolik yuz berdi");
      }
    })();
  }, []);

  const handleSendNow = async () => {
    setSending(true);
    try {
      await sendMonthlyReportNow();
      toast.success("Hisobot barcha adminlarga yuborildi (yoki konsolga yozildi, agar SMTP sozlanmagan bo'lsa)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hisobotni yuborishda xatolik yuz berdi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">Oylik hisobot</h2>
      <p className="mb-4 text-xs text-slate-400">
        Har oyning 1-kunida barcha adminlarga avtomatik email yuboriladi
      </p>
      {preview && (
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <p className="text-xs text-slate-400">{preview.monthLabel}</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(preview.revenue)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <p className="text-xs text-slate-400">Yangi foydalanuvchilar</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{preview.newUsers}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <p className="text-xs text-slate-400">To&apos;langan so&apos;rovlar</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{preview.paidPolicies}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <p className="text-xs text-slate-400">To&apos;lovlar (M/R)</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{preview.successfulPayments} / {preview.failedPayments}</p>
          </div>
        </div>
      )}
      <Button variant="outline" isLoading={sending} className="mt-4 px-6" onClick={handleSendNow}>
        Hozir yuborish
      </Button>
    </div>
  );
}

function SettingsContent() {
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sozlamalar</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Profilingiz, parolingiz va hisobot sozlamalari</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProfileForm />
        <PasswordForm />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6">
        <MonthlyReportCard />
      </div>
    </>
  );
}

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <AdminShell>
        <SettingsContent />
      </AdminShell>
    </AdminGuard>
  );
}
