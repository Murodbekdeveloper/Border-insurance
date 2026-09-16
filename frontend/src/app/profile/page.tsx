'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChangePasswordFormData,
  getChangePasswordSchema,
  UpdateProfileFormData,
  updateProfileSchema,
} from '@/lib/validation/schemas';
import { Card as CardModel, CardType, InsurancePolicy, User, Vehicle } from '@/types';
import { deleteCard, listCards } from '@/lib/api/cards';
import { changePassword, confirmEmailChange, requestEmailChange, updateProfile } from '@/lib/api/auth';
import { listVehicles } from '@/lib/api/vehicles';
import { listPolicies } from '@/lib/api/policies';
import { useAuthStore } from '@/store/authStore';
import { useAccountsStore } from '@/store/accountsStore';
import { useAccountSwitch } from '@/hooks/useAccountSwitch';
import { toast } from '@/store/toastStore';
import { AuthGuard } from '@/components/AuthGuard';
import { DashboardShell } from '@/components/DashboardShell';
import { AccountSwitcherList } from '@/components/AccountSwitcherList';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import Link from 'next/link';

const WEIGHT_LABEL: Record<string, string> = { yengil: 'Yengil', "og'ir": "Og'ir" };
const CARD_TYPE_LABELS: Record<CardType, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  uzcard: 'Uzcard',
  humo: 'Humo',
};

function ExpiryBanner({ policies }: { policies: InsurancePolicy[] }) {
  const now = new Date();
  const soonest = policies
    .filter((p) => p.status === 'paid' && p.validTo)
    .map((p) => ({ policy: p, daysLeft: Math.ceil((new Date(p.validTo!).getTime() - now.getTime()) / 86_400_000) }))
    .filter((p) => p.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];

  if (!soonest) return null;
  const expired = soonest.daysLeft < 0;

  return (
    <div
      className={`mb-6 flex items-center gap-4 rounded-2xl border px-5 py-4 ${
        expired
          ? 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30'
          : 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30'
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${expired ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${expired ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
          {expired
            ? `${soonest.policy.policyNumber} raqamli polisingiz muddati tugagan`
            : `${soonest.policy.policyNumber} raqamli polisingiz muddati ${soonest.daysLeft} kundan so'ng tugaydi`}
        </p>
        <p className={`text-xs ${expired ? 'text-red-600/80 dark:text-red-400/80' : 'text-amber-600/80 dark:text-amber-400/80'}`}>
          {soonest.policy.vehicle.plateNumber} · Yangi polis rasmiylashtirishni unutmang
        </p>
      </div>
      <Link
        href="/resident-type"
        className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap ${
          expired ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-500 text-white hover:bg-amber-600'
        }`}
      >
        Yangilash
      </Link>
    </div>
  );
}

function PersonalInfoCard({ user }: { user: User }) {
  const updateUser = useAuthStore((s) => s.updateUser);
  const [editing, setEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: user.fullName,
      phone: user.phone ?? '',
      passportSeries: user.passportSeries ?? '',
      passportNumber: user.passportNumber ?? '',
      birthDate: user.birthDate ?? '',
    },
  });

  const onSubmit = async (data: UpdateProfileFormData) => {
    try {
      // Bo'sh qatorlarni yubormaymiz — backend ularni "AB" kabi qisqa
      // qiymat sifatida rad etadi, buning o'rniga umuman kiritilmagan deb
      // hisoblanishi kerak (maydonlar hozircha ixtiyoriy).
      const updated = await updateProfile({
        fullName: data.fullName,
        phone: data.phone || undefined,
        passportSeries: data.passportSeries || undefined,
        passportNumber: data.passportNumber || undefined,
        birthDate: data.birthDate || undefined,
      });
      updateUser(updated);
      toast.success('Profil yangilandi');
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Profilni saqlashda xatolik yuz berdi');
    }
  };

  const cancelEdit = () => {
    reset({
      fullName: user.fullName,
      phone: user.phone ?? '',
      passportSeries: user.passportSeries ?? '',
      passportNumber: user.passportNumber ?? '',
      birthDate: user.birthDate ?? '',
    });
    setEditing(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{user.fullName}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10"
          >
            Tahrirlash
          </button>
        )}
      </div>

      {user.googleId && (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
          <svg width="13" height="13" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
          </svg>
          Google orqali ulangan
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 dark:border-slate-800">
          <Input label="F.I.O." error={errors.fullName?.message} {...register('fullName')} />
          <Input label="Telefon (ixtiyoriy)" placeholder="+998901234567" error={errors.phone?.message} {...register('phone')} />

          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">Pasport ma&apos;lumotlari</p>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              OSAGO polisini rasman rasmiylashtirish uchun kerak bo&apos;ladi — hozircha ixtiyoriy.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Pasport seriyasi" placeholder="AB" error={errors.passportSeries?.message} {...register('passportSeries')} />
              <Input label="Pasport raqami" placeholder="1234567" error={errors.passportNumber?.message} {...register('passportNumber')} />
            </div>
            <div className="mt-4">
              <Input
                label="Tug'ilgan sana"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                error={errors.birthDate?.message}
                {...register('birthDate')}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="px-6">
              Saqlash
            </Button>
            <Button type="button" variant="outline" onClick={cancelEdit}>
              Bekor qilish
            </Button>
          </div>
        </form>
      ) : (
        <dl className="mt-6 grid grid-cols-2 gap-5 border-t border-slate-100 pt-5 text-sm dark:border-slate-800">
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
            <dt className="text-slate-400">Pasport</dt>
            <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {user.passportSeries && user.passportNumber ? `${user.passportSeries} ${user.passportNumber}` : '-'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Tug&apos;ilgan sana</dt>
            <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">{user.birthDate ?? '-'}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

// Faqat mehmon hisoblar uchun — ularning emaili haqiqiy emas
// (guest.<uuid>@guest.borderinsurance.uz), shuning uchun bu yerda
// haqiqiy email qo'shish va tasdiqlash imkoniyati beriladi.
function EmailVerificationCard({ user }: { user: User }) {
  const updateUser = useAuthStore((s) => s.updateUser);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  if (!user.isGuest) return null;

  const handleSendCode = async () => {
    if (!email.trim()) {
      toast.error('Email kiriting');
      return;
    }
    setIsSending(true);
    try {
      await requestEmailChange(email.trim());
      toast.success('Tasdiqlash kodi emailingizga yuborildi');
      setCodeSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kod yuborishda xatolik yuz berdi');
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirm = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast.error('Kod 6 ta raqamdan iborat bo\'lishi kerak');
      return;
    }
    setIsConfirming(true);
    try {
      const updated = await confirmEmailChange(code);
      updateUser(updated);
      toast.success('Email tasdiqlandi');
      setCodeSent(false);
      setEmail('');
      setCode('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kodni tasdiqlashda xatolik yuz berdi');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email qo&apos;shish</h2>
      <p className="mt-1 text-xs text-slate-400">
        Mehmon sifatida kirgansiz — hisobingizni saqlab qolish uchun haqiqiy email qo&apos;shib, tasdiqlang.
      </p>

      {!codeSent ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button type="button" variant="primary" isLoading={isSending} onClick={handleSendCode} className="sm:px-6">
            Kod yuborish
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="6 xonali kod"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1"
          />
          <Button type="button" variant="primary" isLoading={isConfirming} onClick={handleConfirm} className="sm:px-6">
            Tasdiqlash
          </Button>
          <Button type="button" variant="ghost" onClick={() => setCodeSent(false)}>
            Emailni o&apos;zgartirish
          </Button>
        </div>
      )}
    </div>
  );
}

function PasswordCard({ user }: { user: User }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(getChangePasswordSchema(!!user.hasPassword)),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success(user.hasPassword ? 'Parol yangilandi' : 'Parol o\'rnatildi');
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Parolni saqlashda xatolik yuz berdi');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {user.hasPassword ? 'Parolni almashtirish' : 'Parol o\'rnatish'}
      </h2>
      {!user.hasPassword && (
        <p className="mt-1 text-xs text-slate-400">
          Hisobingiz Google orqali yaratilgan. Parol o&apos;rnatsangiz, email va parol bilan ham kira olasiz.
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
        {user.hasPassword && (
          <PasswordInput
            label="Joriy parol"
            placeholder="Joriy parolingiz"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
        )}
        <PasswordInput
          label="Yangi parol"
          placeholder="Kamida 6 ta belgi"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordInput
          label="Yangi parolni tasdiqlang"
          placeholder="Yangi parolni qayta kiriting"
          error={errors.confirmNewPassword?.message}
          {...register('confirmNewPassword')}
        />
        <Button type="submit" variant="primary" isLoading={isSubmitting} className="self-start px-6">
          {user.hasPassword ? 'Parolni yangilash' : 'Parolni o\'rnatish'}
        </Button>
      </form>
    </div>
  );
}

function VehiclesCard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setVehicles(await listVehicles());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Avtomobillarni olishda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Mening avtomobillarim</h2>
      {loading && <p className="text-sm text-slate-500">Yuklanmoqda...</p>}
      {!loading && vehicles.length === 0 && <p className="text-sm text-slate-400">Hozircha avtomobil qo&apos;shilmagan</p>}
      <div className="flex flex-col gap-2">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{vehicle.plateNumber}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{vehicle.model} · {vehicle.city}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-white/5 dark:text-slate-400">
              {WEIGHT_LABEL[vehicle.weightCategory] ?? vehicle.weightCategory}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardsCard() {
  const [cards, setCards] = useState<CardModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setCards(await listCards());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Kartalarni olishda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRemove = async (cardId: string) => {
    try {
      await deleteCard(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      toast.success('Karta o\'chirildi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kartani o\'chirishda xatolik yuz berdi');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Saqlangan kartalar</h2>
      {loading && <p className="text-sm text-slate-500">Yuklanmoqda...</p>}
      {!loading && cards.length === 0 && <p className="text-sm text-slate-400">Saqlangan karta yo&apos;q</p>}
      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <div key={card.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {CARD_TYPE_LABELS[card.cardType]} · **** **** **** {card.maskedNumber}
            </span>
            <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => handleRemove(card.id)}>
              O&apos;chirish
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectedAccountsCard({ currentUserId }: { currentUserId: string }) {
  const accounts = useAccountsStore((s) => s.accounts);
  const removeAccount = useAccountsStore((s) => s.removeAccount);
  const { select, switchingUserId } = useAccountSwitch('/policies');

  return (
    <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Bog&apos;langan hisoblar</h2>
      <AccountSwitcherList
        accounts={accounts}
        currentUserId={currentUserId}
        switchingUserId={switchingUserId}
        onSelect={select}
        onRemove={removeAccount}
      />
      <Link
        href="/login"
        className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-orange-300 text-orange-500 dark:border-orange-800">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
        Boshqa hisob qo&apos;shish
      </Link>
    </div>
  );
}

function ProfileContent({ user }: { user: User }) {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setPolicies(await listPolicies());
      } catch {
        // Non-critical for this page — the expiry banner simply stays hidden.
      }
    })();
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profil</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Shaxsiy ma&apos;lumotlaringiz, xavfsizlik va to&apos;lov sozlamalari</p>

      <div className="mt-6">
        <ExpiryBanner policies={policies} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <EmailVerificationCard user={user} />
        <PersonalInfoCard user={user} />
        <PasswordCard user={user} />
        <VehiclesCard />
        <CardsCard />
        <ConnectedAccountsCard currentUserId={user.id} />
      </div>
    </>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <AuthGuard>
      <DashboardShell>{user && <ProfileContent user={user} />}</DashboardShell>
    </AuthGuard>
  );
}
