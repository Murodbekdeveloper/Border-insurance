'use client';

import { useSyncExternalStore } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useAuthHydrated(): boolean {
  return useSyncExternalStore(
    (callback) => useAuthStore.persist.onFinishHydration(callback),
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );
}
