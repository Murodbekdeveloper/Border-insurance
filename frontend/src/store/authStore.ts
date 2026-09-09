import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { useAccountsStore } from '@/store/accountsStore';
import { useApplicationStore } from '@/store/applicationStore';

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
        // The in-progress application wizard (vehicle/driver PII) is keyed
        // to whichever identity is active, not to the browser — if a
        // *different* account is signing in (plain login, Google/Apple
        // OAuth, or a stale session that expired and someone else logged
        // in), the previous user's unfinished draft must not carry over on
        // a shared device. Same-user re-login (e.g. reopening the app) is
        // deliberately left untouched so ResumeApplicationBanner still works.
        const previousUserId = get().user?.id;
        if (previousUserId && previousUserId !== user.id) {
          useApplicationStore.getState().reset();
        }
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
      logout: () => {
        useApplicationStore.getState().reset();
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    { name: 'osago-auth' },
  ),
);
