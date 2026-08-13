'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Admin, AdminRole } from '@/types';
import { createAdmin, deleteAdmin, listAdmins } from '@/lib/api/admin';
import { toast } from '@/store/toastStore';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminShell } from '@/components/AdminShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Select } from '@/components/ui/Select';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Superadmin' },
];

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('uz-UZ');
}

function CreateAdminForm({ onCreated }: { onCreated: () => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('admin');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAdmin({ fullName, email, password, role });
      toast.success('Administrator yaratildi');
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('admin');
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Admin yaratishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Yangi administrator qo&apos;shish</h2>
      <div className="grid grid-cols-2 gap-4">
        <Input label="F.I.O." required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordInput label="Parol" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Select label="Roli" options={ROLE_OPTIONS} value={role} onChange={(e) => setRole(e.target.value as AdminRole)} />
      </div>
      <Button type="submit" variant="primary" isLoading={submitting} className="mt-4 px-6">
        Qo&apos;shish
      </Button>
    </form>
  );
}

function AdminsContent() {
  const currentAdmin = useAdminAuthStore((s) => s.admin);
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setAdmins(await listAdmins());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adminlarni olishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentAdmin && currentAdmin.role !== 'superadmin') {
      router.replace('/admin');
      return;
    }
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAdmin]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Ushbu administratorni o'chirmoqchimisiz?")) return;
    setDeletingId(id);
    try {
      await deleteAdmin(id);
      toast.success("Administrator o'chirildi");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi");
    } finally {
      setDeletingId(null);
    }
  };

  if (currentAdmin && currentAdmin.role !== 'superadmin') {
    return null;
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Administratorlar</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Boshqaruv paneliga kirish huquqiga ega xodimlar</p>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <CreateAdminForm onCreated={load} />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Ro&apos;yxat ({admins.length})</h2>
          {loading && <p className="text-sm text-slate-500">Yuklanmoqda...</p>}
          <div className="flex flex-col gap-2">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {a.fullName} {a.id === currentAdmin?.id && <span className="text-xs text-slate-400">(siz)</span>}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{a.email} · {formatDate(a.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      a.role === 'superadmin'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {a.role === 'superadmin' ? 'Superadmin' : 'Admin'}
                  </span>
                  {a.id !== currentAdmin?.id && (
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      isLoading={deletingId === a.id}
                      onClick={() => handleDelete(a.id)}
                    >
                      O&apos;chirish
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminAdminsPage() {
  return (
    <AdminGuard>
      <AdminShell>
        <AdminsContent />
      </AdminShell>
    </AdminGuard>
  );
}
