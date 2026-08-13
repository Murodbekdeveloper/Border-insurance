import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { useAccountsStore } from '@/store/accountsStore';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: User, accessToken: string, refreshToken: string) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken });
        // Remember this account (and its latest refresh token) so it can be
        // instantly switched back to later, even after logging out.
        useAccountsStore.getState().upsertAccount(user, refreshToken);
      },
      updateUser: (user) => {
        set({ user });
        const { refreshToken } = get();
        if (refreshToken) useAccountsStore.getState().upsertAccount(user, refreshToken);
      },
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'osago-auth' },
  ),
);
