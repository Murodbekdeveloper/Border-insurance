import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

export interface RememberedAccount {
  user: User;
  refreshToken: string;
}

interface AccountsState {
  accounts: RememberedAccount[];
  upsertAccount: (user: User, refreshToken: string) => void;
  removeAccount: (userId: string) => void;
}

export const useAccountsStore = create<AccountsState>()(
  persist(
    (set, get) => ({
      accounts: [],
      upsertAccount: (user, refreshToken) => {
        const rest = get().accounts.filter((a) => a.user.id !== user.id);
        set({ accounts: [{ user, refreshToken }, ...rest] });
      },
      removeAccount: (userId) => {
        set({ accounts: get().accounts.filter((a) => a.user.id !== userId) });
      },
    }),
    { name: 'osago-accounts' },
  ),
);
