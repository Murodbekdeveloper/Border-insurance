import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { API_URL } from '@/lib/api/client';

// Deliberately a separate axios instance from apiClient — it attaches the
// admin token (never the customer token) and refreshes against
// /admin/auth/refresh, so admin and customer sessions never cross over.
export const adminApiClient = axios.create({ baseURL: API_URL });

adminApiClient.interceptors.request.use((config) => {
  const token = useAdminAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAdminAccessToken(): Promise<string | null> {
  const { refreshToken, admin } = useAdminAuthStore.getState();
  if (!refreshToken || !admin) return null;

  try {
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${API_URL}/admin/auth/refresh`,
      { refreshToken },
    );
    useAdminAuthStore.getState().setSession(admin, data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

adminApiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      if (!refreshPromise) {
        refreshPromise = refreshAdminAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return adminApiClient(original);
      }
      useAdminAuthStore.getState().logout();
    }

    return Promise.reject(error);
  },
);
