'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RememberedAccount, useAccountsStore } from '@/store/accountsStore';
import { useAuthStore } from '@/store/authStore';
import { useApplicationStore } from '@/store/applicationStore';
import { switchAccount as switchAccountRequest } from '@/lib/api/auth';
import { toast } from '@/store/toastStore';

export function useAccountSwitch(redirectTo: string = '/policies') {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const resetApplication = useApplicationStore((s) => s.reset);
  const removeAccount = useAccountsStore((s) => s.removeAccount);
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null);

  const select = async (account: RememberedAccount) => {
    setSwitchingUserId(account.user.id);
    try {
      const result = await switchAccountRequest(account.user, account.refreshToken);
      resetApplication();
      setSession(result.user, result.accessToken, result.refreshToken);
      router.push(redirectTo);
    } catch (err) {
      removeAccount(account.user.id);
      toast.error(err instanceof Error ? err.message : 'Hisobga ulanishda xatolik yuz berdi, qayta kiring');
    } finally {
      setSwitchingUserId(null);
    }
  };

  return { select, switchingUserId };
}
