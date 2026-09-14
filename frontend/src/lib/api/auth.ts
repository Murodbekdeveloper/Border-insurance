import axios from 'axios';
import { User } from '@/types';
import { LoginFormData, RegisterFormData } from '@/lib/validation/schemas';
import { apiClient, API_URL } from '@/lib/api/client';
import { throwApiError } from '@/lib/api/errors';

interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// No tokens yet — the account stays unverified server-side until the
// emailed code is confirmed via verifyEmail(), so nothing is persisted here.
export async function register(data: RegisterFormData): Promise<{ email: string; message: string }> {
  try {
    const { data: result } = await apiClient.post<{ email: string; message: string }>('/auth/register', {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
    });
    return result;
  } catch (err) {
    throwApiError(err, 'Ro\'yxatdan o\'tishda xatolik yuz berdi');
  }
}

export async function verifyEmail(email: string, code: string): Promise<AuthResult> {
  try {
    const { data } = await apiClient.post<AuthResult>('/auth/verify-email', { email, code });
    return data;
  } catch (err) {
    throwApiError(err, 'Kodni tasdiqlashda xatolik yuz berdi');
  }
}

export async function resendVerificationCode(email: string): Promise<void> {
  try {
    await apiClient.post('/auth/resend-verification', { email });
  } catch (err) {
    throwApiError(err, 'Kodni qayta yuborishda xatolik yuz berdi');
  }
}

export async function login(data: LoginFormData): Promise<AuthResult> {
  try {
    const { data: result } = await apiClient.post<AuthResult>('/auth/login', data);
    return result;
  } catch (err) {
    throwApiError(err, 'Kirishda xatolik yuz berdi');
  }
}

export async function updateResidentType(residentType: NonNullable<User['residentType']>): Promise<User> {
  try {
    const { data } = await apiClient.patch<User>('/users/me/resident-type', { residentType });
    return data;
  } catch (err) {
    throwApiError(err, 'Rezident turini saqlashda xatolik yuz berdi');
  }
}

// Only meaningful for a non-resident applicant — an id from
// GET /apex-box/countries, required to submit a foreign-vehicle policy via
// Apex_Box. Reuses the general profile endpoint (every field there is
// optional server-side) rather than a dedicated route.
export async function updateCitizenship(citizenshipId: string): Promise<User> {
  try {
    const { data } = await apiClient.patch<User>('/users/me', { citizenshipId });
    return data;
  } catch (err) {
    throwApiError(err, 'Fuqarolikni saqlashda xatolik yuz berdi');
  }
}

// Exchanges a remembered account's refresh token for a fresh session,
// without touching (or requiring) the currently active session's tokens.
export async function switchAccount(user: User, refreshToken: string): Promise<AuthResult> {
  try {
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${API_URL}/auth/refresh`,
      { refreshToken },
    );
    return { user, accessToken: data.accessToken, refreshToken: data.refreshToken };
  } catch (err) {
    throwApiError(err, 'Sessiya muddati tugagan, qayta kiring');
  }
}

export async function me(): Promise<User> {
  try {
    const { data } = await apiClient.get<User>('/users/me');
    return data;
  } catch (err) {
    throwApiError(err, 'Foydalanuvchi ma\'lumotlarini olishda xatolik yuz berdi');
  }
}

export async function updateProfile(data: {
  fullName: string;
  phone: string;
  passportSeries?: string;
  passportNumber?: string;
  birthDate?: string;
}): Promise<User> {
  try {
    const { data: result } = await apiClient.patch<User>('/users/me', data);
    return result;
  } catch (err) {
    throwApiError(err, 'Profilni saqlashda xatolik yuz berdi');
  }
}

export async function changePassword(data: { currentPassword?: string; newPassword: string }): Promise<User> {
  try {
    const { data: result } = await apiClient.patch<User>('/users/me/password', data);
    return result;
  } catch (err) {
    throwApiError(err, 'Parolni saqlashda xatolik yuz berdi');
  }
}
