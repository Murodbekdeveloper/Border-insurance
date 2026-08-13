import { Admin } from '@/types';
import { adminApiClient } from '@/lib/api/adminClient';
import { getErrorMessage } from '@/lib/api/errors';

interface AdminAuthResult {
  admin: Admin;
  accessToken: string;
  refreshToken: string;
}

export async function adminLogin(email: string, password: string): Promise<AdminAuthResult> {
  try {
    const { data } = await adminApiClient.post<AdminAuthResult>('/admin/auth/login', {
      email,
      password,
    });
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Kirishda xatolik yuz berdi'));
  }
}

export async function adminMe(): Promise<Admin> {
  try {
    const { data } = await adminApiClient.get<Admin>('/admin/auth/me');
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Ma'lumotlarni olishda xatolik yuz berdi"));
  }
}
