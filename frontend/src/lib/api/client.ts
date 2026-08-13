import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, user } = useAuthStore.getState();
  if (!refreshToken || !user) return null;

  try {
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${API_URL}/auth/refresh`,
      { refreshToken },
    );
    useAuthStore.getState().setSession(user, data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(original);
      }
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  },
);
