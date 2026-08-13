'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { useAdminAuthHydrated } from '@/hooks/useAdminAuthHydrated';
import { LoadingScreen } from '@/components/LoadingScreen';

export function AdminGuard({ children }: { children: ReactNode }) {
  const hydrated = useAdminAuthHydrated();
  const admin = useAdminAuthStore((s) => s.admin);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !admin) {
      router.replace('/profile/admin/login');
    }
  }, [hydrated, admin, router]);

  if (!hydrated || !admin) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
