'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { me } from '@/lib/api/auth';

// Refreshes the cached user (role, hasPassword, etc.) once whenever a
// session becomes active — e.g. right after hydrating from localStorage,
// or after switching accounts — so server-side changes like an
// ADMIN_EMAILS promotion show up without requiring a fresh login.
export function AuthSync() {
  const userId = useAuthStore((s) => s.user?.id);
  const updateUser = useAuthStore((s) => s.updateUser);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        updateUser(await me());
      } catch {
        // Non-critical — falls back to the already-cached user. A real
        // auth failure is already handled by the axios interceptor.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}
