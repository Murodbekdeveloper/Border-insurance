import { Admin, AdminAuditLogEntry, AdminLoginAttempt, AdminRole, InsurancePolicy, Payment, PaymentStatus, PolicyStatus, User, Vehicle } from '@/types';
import { adminApiClient as apiClient } from '@/lib/api/adminClient';
import { getErrorMessage } from '@/lib/api/errors';

export interface AdminStats {
  totalUsers: number;
  totalPolicies: number;
  activePolicies: number;
  totalRevenue: number;
  successfulPayments: number;
  failedPayments: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  try {
    const { data } = await apiClient.get<AdminStats>('/admin/stats');
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Statistikani olishda xatolik yuz berdi'));
  }
}

export async function listAdminUsers(page: number, limit: number, search?: string): Promise<PaginatedResult<User>> {
  try {
    const { data } = await apiClient.get<PaginatedResult<User>>('/admin/users', {
      params: { page, limit, search: search || undefined },
    });
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Foydalanuvchilarni olishda xatolik yuz berdi'));
  }
}

export async function listAdminPolicies(page: number, limit: number, status?: PolicyStatus | ''): Promise<PaginatedResult<InsurancePolicy>> {
  try {
    const { data } = await apiClient.get<PaginatedResult<InsurancePolicy>>('/admin/policies', {
      params: { page, limit, status: status || undefined },
    });
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Polislarni olishda xatolik yuz berdi'));
  }
}

export async function listAdminPayments(page: number, limit: number, status?: PaymentStatus | ''): Promise<PaginatedResult<Payment>> {
  try {
    const { data } = await apiClient.get<PaginatedResult<Payment>>('/admin/payments', {
      params: { page, limit, status: status || undefined },
    });
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, "To'lovlarni olishda xatolik yuz berdi"));
  }
}

export interface AdminUserDetail {
  user: User;
  vehicles: Vehicle[];
  policies: InsurancePolicy[];
  payments: Payment[];
}

export async function getAdminUserDetail(id: string): Promise<AdminUserDetail> {
  try {
    const { data } = await apiClient.get<AdminUserDetail>(`/admin/users/${id}`);
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Foydalanuvchi ma'lumotlarini olishda xatolik yuz berdi"));
  }
}

export async function setUserActive(id: string, isActive: boolean): Promise<User> {
  try {
    const { data } = await apiClient.patch<User>(`/admin/users/${id}/status`, { isActive });
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Foydalanuvchi holatini o'zgartirishda xatolik yuz berdi"));
  }
}

export async function cancelAdminPolicy(id: string): Promise<InsurancePolicy> {
  try {
    const { data } = await apiClient.patch<InsurancePolicy>(`/admin/policies/${id}/cancel`);
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, "So'rovni bekor qilishda xatolik yuz berdi"));
  }
}

async function downloadCsv(path: string, params: Record<string, string | undefined>, filename: string): Promise<void> {
  const { data } = await apiClient.get<Blob>(path, { params, responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function exportAdminUsers(search?: string): Promise<void> {
  try {
    await downloadCsv('/admin/users/export', { search: search || undefined }, 'foydalanuvchilar.csv');
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Eksport qilishda xatolik yuz berdi'));
  }
}

export async function exportAdminPolicies(status?: PolicyStatus | ''): Promise<void> {
  try {
    await downloadCsv('/admin/policies/export', { status: status || undefined }, 'sorovlar.csv');
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Eksport qilishda xatolik yuz berdi'));
  }
}

export async function exportAdminPayments(status?: PaymentStatus | ''): Promise<void> {
  try {
    await downloadCsv('/admin/payments/export', { status: status || undefined }, 'tolovlar.csv');
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Eksport qilishda xatolik yuz berdi'));
  }
}

export async function listAdmins(): Promise<Admin[]> {
  try {
    const { data } = await apiClient.get<Admin[]>('/admin/admins');
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Adminlarni olishda xatolik yuz berdi"));
  }
}

export async function createAdmin(input: { fullName: string; email: string; password: string; role?: AdminRole }): Promise<Admin> {
  try {
    const { data } = await apiClient.post<Admin>('/admin/admins', input);
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Admin yaratishda xatolik yuz berdi'));
  }
}

export async function deleteAdmin(id: string): Promise<void> {
  try {
    await apiClient.delete(`/admin/admins/${id}`);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Adminni o'chirishda xatolik yuz berdi"));
  }
}

export async function listAuditLog(page: number, limit: number): Promise<PaginatedResult<AdminAuditLogEntry>> {
  try {
    const { data } = await apiClient.get<PaginatedResult<AdminAuditLogEntry>>('/admin/audit-log', {
      params: { page, limit },
    });
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Amallar tarixini olishda xatolik yuz berdi"));
  }
}

export interface DashboardData {
  monthlyRevenue: { month: string; revenue: number }[];
  paymentSuccessRate: { success: number; failed: number; rate: number | null };
  expiringPoliciesCount: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  recentActivity: { type: 'user' | 'policy' | 'payment'; description: string; createdAt: string }[];
}

export async function getAdminDashboard(months = 6): Promise<DashboardData> {
  try {
    const { data } = await apiClient.get<DashboardData>('/admin/stats/dashboard', {
      params: { months },
    });
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Bosh sahifa ma'lumotlarini olishda xatolik yuz berdi"));
  }
}

export async function updateAdminProfile(fullName: string): Promise<Admin> {
  try {
    const { data } = await apiClient.patch<Admin>('/admin/auth/me', { fullName });
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Profilni yangilashda xatolik yuz berdi'));
  }
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    await apiClient.patch('/admin/auth/password', { currentPassword, newPassword });
  } catch (err) {
    throw new Error(getErrorMessage(err, "Parolni almashtirishda xatolik yuz berdi"));
  }
}

export async function listLoginAttempts(page: number, limit: number): Promise<PaginatedResult<AdminLoginAttempt>> {
  try {
    const { data } = await apiClient.get<PaginatedResult<AdminLoginAttempt>>('/admin/security/login-attempts', {
      params: { page, limit },
    });
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Kirish urinishlarini olishda xatolik yuz berdi'));
  }
}

export interface GlobalSearchResult {
  users: User[];
  policies: InsurancePolicy[];
  payments: Payment[];
}

export async function globalSearch(q: string): Promise<GlobalSearchResult> {
  try {
    const { data } = await apiClient.get<GlobalSearchResult>('/admin/search', {
      params: { q },
    });
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Qidirishda xatolik yuz berdi'));
  }
}

export interface MonthlyReportPreview {
  monthLabel: string;
  newUsers: number;
  paidPolicies: number;
  revenue: number;
  successfulPayments: number;
  failedPayments: number;
}

export async function getMonthlyReportPreview(): Promise<MonthlyReportPreview> {
  try {
    const { data } = await apiClient.get<MonthlyReportPreview>('/admin/reports/monthly-preview');
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Hisobotni olishda xatolik yuz berdi"));
  }
}

export async function sendMonthlyReportNow(): Promise<void> {
  try {
    await apiClient.post('/admin/reports/monthly/send-now');
  } catch (err) {
    throw new Error(getErrorMessage(err, "Hisobotni yuborishda xatolik yuz berdi"));
  }
}
