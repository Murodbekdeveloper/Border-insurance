import { DriverRestriction, InsurancePolicy } from '@/types';
import { DriverFormData } from '@/lib/validation/schemas';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';

interface CreatePolicyInput {
  vehicleId: string;
  driverRestriction: DriverRestriction;
  drivers: DriverFormData[];
}

export async function createPolicy(input: CreatePolicyInput): Promise<InsurancePolicy> {
  try {
    const { data } = await apiClient.post<InsurancePolicy>('/policies', input);
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Arizani saqlashda xatolik yuz berdi'));
  }
}

export async function getPrice(policyId: string): Promise<number> {
  try {
    const { data } = await apiClient.get<{ price: number }>(`/policies/${policyId}/price`);
    return data.price;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Narxni hisoblashda xatolik yuz berdi'));
  }
}

export async function submitToPartner(policyId: string): Promise<{ payallUrl: string }> {
  try {
    const { data } = await apiClient.post<{ payallUrl: string }>(
      `/policies/${policyId}/submit-to-partner`,
    );
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Asia Insurance'ga yuborishda xatolik yuz berdi"));
  }
}

export async function confirmPolicy(policyId: string): Promise<InsurancePolicy> {
  try {
    const { data } = await apiClient.post<InsurancePolicy>(`/policies/${policyId}/confirm`);
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Polisni tasdiqlashda xatolik yuz berdi'));
  }
}

export async function getPolicy(policyId: string): Promise<InsurancePolicy> {
  try {
    const { data } = await apiClient.get<InsurancePolicy>(`/policies/${policyId}`);
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Arizani olishda xatolik yuz berdi'));
  }
}

export async function listPolicies(): Promise<InsurancePolicy[]> {
  try {
    const { data } = await apiClient.get<InsurancePolicy[]>('/policies');
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Polislar ro\'yxatini olishda xatolik yuz berdi'));
  }
}

export async function getPolicyPdfBlob(policyId: string): Promise<Blob> {
  try {
    const { data } = await apiClient.get<Blob>(`/policies/${policyId}/pdf`, {
      responseType: 'blob',
    });
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'PDF faylni yuklab olishda xatolik yuz berdi'));
  }
}
