'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail, resendVerificationCode } from '@/lib/api/auth';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { AuthShell } from '@/components/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailContent() {
  const router = useRouter();
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
      toast.success('Email muvaffaqiyatli tasdiqlandi');
      router.push('/resident-type');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kodni tasdiqlashda xatolik yuz berdi');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationCode(email);
      toast.success('Tasdiqlash kodi qayta yuborildi');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kodni qayta yuborishda xatolik yuz berdi');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell title="Emailni tasdiqlang" subtitle={`${email} manziliga yuborilgan 6 xonali kodni kiriting`}>
      <div className="flex flex-col gap-4">
        <Input
          label="Tasdiqlash kodi"
          placeholder="123456"
          inputMode="numeric"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />

        <Button type="button" fullWidth isLoading={verifying} disabled={code.length !== 6} onClick={handleVerify}>
          Tasdiqlash
        </Button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="text-center text-sm font-semibold text-orange-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline dark:text-orange-400 dark:disabled:text-slate-600"
        >
          {cooldown > 0 ? `Qayta yuborish (${cooldown}s)` : 'Kodni qayta yuborish'}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href="/login" className="font-semibold text-orange-600 hover:underline">
          Kirish sahifasiga qaytish
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
