'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail, resendVerificationCode } from '@/lib/api/auth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { AuthShell } from '@/components/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const setSession = useAuthStore((s) => s.setSession);

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    try {
      const result = await verifyEmail(email, code);
      setSession(result.user, result.accessToken, result.refreshToken);
      toast.success(t('verifyEmail.verifiedToast'));
      router.push('/resident-type');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('verifyEmail.verifyError'));
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationCode(email);
      toast.success(t('verifyEmail.resentToast'));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('verifyEmail.resendError'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell title={t('verifyEmail.title')} subtitle={t('verifyEmail.subtitle', { email })}>
      <div className="flex flex-col gap-4">
        <Input
          label={t('verifyEmail.codeLabel')}
          placeholder="123456"
          inputMode="numeric"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />

        <Button type="button" fullWidth isLoading={verifying} disabled={code.length !== 6} onClick={handleVerify}>
          {t('verifyEmail.confirm')}
        </Button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="text-center text-sm font-semibold text-orange-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline dark:text-orange-400 dark:disabled:text-slate-600"
        >
          {cooldown > 0 ? t('verifyEmail.resendWithCooldown', { seconds: cooldown }) : t('verifyEmail.resend')}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href="/login" className="font-semibold text-orange-600 hover:underline">
          {t('verifyEmail.backToLogin')}
        </Link>
      </p>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
