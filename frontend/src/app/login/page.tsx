'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginFormData, getLoginSchema } from '@/lib/validation/schemas';
import { login, loginAsGuest } from '@/lib/api/auth';
import { API_URL } from '@/lib/api/client';
import { getErrorCode } from '@/lib/api/errors';
import { useAuthStore } from '@/store/authStore';
import { useAccountsStore } from '@/store/accountsStore';
import { useAccountSwitch } from '@/hooks/useAccountSwitch';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/store/toastStore';
import { AuthShell } from '@/components/AuthShell';
import { AccountSwitcherList } from '@/components/AccountSwitcherList';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';

const EMAIL_NOT_VERIFIED_CODE = 'EMAIL_NOT_VERIFIED';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const accounts = useAccountsStore((s) => s.accounts);
  const removeAccount = useAccountsStore((s) => s.removeAccount);
  const { select: selectAccount, switchingUserId } = useAccountSwitch('/policies');
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(getLoginSchema(t)),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    const email = data.email.trim();
    try {
      const result = await login(data);
      setSession(result.user, result.accessToken, result.refreshToken);
      toast.success(t('login.loggedInToast'));
      router.push('/policies');
    } catch (err) {
      if (getErrorCode(err) === EMAIL_NOT_VERIFIED_CODE) {
        toast.error(err instanceof Error ? err.message : t('login.emailNotVerified'));
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      toast.error(err instanceof Error ? err.message : t('login.loginError'));
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    try {
      const result = await loginAsGuest();
      setSession(result.user, result.accessToken, result.refreshToken);
      toast.success(t('login.guestLoggedInToast'));
      router.push('/policies');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('login.guestLoginError'));
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <AuthShell title={t('login.title')} subtitle={t('login.subtitle')}>
      <div className="flex flex-col gap-4">
        {accounts.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('login.yourAccounts')}
            </p>
            <AccountSwitcherList
              accounts={accounts}
              currentUserId={currentUserId}
              switchingUserId={switchingUserId}
              onSelect={selectAccount}
              onRemove={removeAccount}
            />
            <div className="flex items-center gap-3 pt-1 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              {t('login.loginWithOtherAccount')}
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        )}

        <Button type="button" variant="google" fullWidth onClick={handleGoogleLogin}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
          </svg>
          {t('login.googleLogin')}
        </Button>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          {t('login.or')}
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label={t('login.email')}
            type="email"
            placeholder="email@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <PasswordInput
            label={t('login.password')}
            placeholder={t('login.passwordPlaceholder')}
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
            {t('login.submit')}
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          fullWidth
          isLoading={isGuestLoading}
          onClick={handleGuestLogin}
        >
          {t('login.guestLogin')}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {t('login.noAccount')}{' '}
        <Link href="/register" className="font-semibold text-orange-600 hover:underline">
          {t('login.register')}
        </Link>
      </p>
    </AuthShell>
  );
}
