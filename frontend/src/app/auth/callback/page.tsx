'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/lib/api/client';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { User } from '@/types';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (!accessToken || !refreshToken) {
      toast.error('Google orqali kirishda xatolik yuz berdi');
      router.replace('/login');
      return;
    }

    (async () => {
      try {
        const { data: user } = await axios.get<User>(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setSession(user, accessToken, refreshToken);
        toast.success('Muvaffaqiyatli kirdingiz');
        router.replace('/policies');
      } catch {
        toast.error('Google orqali kirishda xatolik yuz berdi');
        router.replace('/login');
      }
    })();
  }, [searchParams, setSession, router]);

  return <LoadingScreen />;
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
