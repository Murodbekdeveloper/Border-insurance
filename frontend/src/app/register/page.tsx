'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterFormData, registerSchema } from '@/lib/validation/schemas';
import { maskLetters, maskPhoneUZ } from '@/lib/masks';
import { register as registerUser } from '@/lib/api/auth';
import { API_URL } from '@/lib/api/client';
import { toast } from '@/store/toastStore';
import { AuthShell } from '@/components/AuthShell';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();

  const {
    register: registerField,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '+998', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const email = data.email.trim();
      await registerUser(data);
      toast.success('Tasdiqlash kodi emailingizga yuborildi');
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ro\'yxatdan o\'tishda xatolik yuz berdi');
    }
  };

  const handleGoogleRegister = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <AuthShell title="Ro'yxatdan o'tish" subtitle="Yangi hisob yarating">
      <div className="flex flex-col gap-4">
        <Button type="button" variant="google" fullWidth onClick={handleGoogleRegister}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
          </svg>
          Google orqali ro&apos;yxatdan o&apos;tish
        </Button>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          yoki
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
        <Input
          label="F.I.O."
          placeholder="To'liq ism-sharifingiz"
          error={errors.fullName?.message}
          {...registerField('fullName')}
          onChange={(e) => setValue('fullName', maskLetters(e.target.value, 60), { shouldValidate: true, shouldDirty: true })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="email@example.com"
            error={errors.email?.message}
            {...registerField('email')}
          />
          <Input
            label="Telefon raqami"
            placeholder="+998901234567"
            inputMode="numeric"
            error={errors.phone?.message}
            {...registerField('phone')}
            onChange={(e) => setValue('phone', maskPhoneUZ(e.target.value), { shouldValidate: true, shouldDirty: true })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <PasswordInput
            label="Parol"
            placeholder="Kamida 6 ta belgi"
            error={errors.password?.message}
            {...registerField('password')}
          />
          <PasswordInput
            label="Parolni tasdiqlang"
            placeholder="Parolni qayta kiriting"
            error={errors.confirmPassword?.message}
            {...registerField('confirmPassword')}
          />
        </div>

        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
          Ro&apos;yxatdan o&apos;tish
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Hisobingiz bormi?{' '}
        <Link href="/login" className="font-semibold text-orange-600 hover:underline">
          Kirish
        </Link>
      </p>
    </AuthShell>
  );
}
