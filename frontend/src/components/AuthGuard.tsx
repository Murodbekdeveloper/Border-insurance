'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { LoadingScreen } from '@/components/LoadingScreen';

export function AuthGuard({ children }: { children: ReactNode }) {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !user) {
      router.replace('/login');
    }
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
