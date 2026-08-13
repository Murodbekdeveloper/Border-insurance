'use client';

import { useSyncExternalStore } from 'react';
import { useAdminAuthStore } from '@/store/adminAuthStore';

export function useAdminAuthHydrated(): boolean {
  return useSyncExternalStore(
    (callback) => useAdminAuthStore.persist.onFinishHydration(callback),
    () => useAdminAuthStore.persist.hasHydrated(),
    () => false,
  );
}
