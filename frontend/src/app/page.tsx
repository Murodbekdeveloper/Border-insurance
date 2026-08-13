'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function Home() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(user ? '/policies' : '/login');
  }, [hydrated, user, router]);

  return <LoadingScreen />;
}
