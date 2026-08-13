import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Admin } from '@/types';

interface AdminAuthState {
  admin: Admin | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (admin: Admin, accessToken: string, refreshToken: string) => void;
  updateAdmin: (admin: Admin) => void;
  logout: () => void;
}

// Deliberately a separate persisted store (own localStorage key) from the
// customer authStore — an admin session must never mix with, or be read
// as, a customer session in the same browser.
export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      admin: null,
      accessToken: null,
      refreshToken: null,
      setSession: (admin, accessToken, refreshToken) =>
        set({ admin, accessToken, refreshToken }),
      updateAdmin: (admin) => set({ admin }),
      logout: () => set({ admin: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'osago-admin-auth' },
  ),
);
