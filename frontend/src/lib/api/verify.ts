import { PolicyVerification } from '@/types';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';

export async function verifyPolicy(policyNumber: string): Promise<PolicyVerification> {
  try {
    const { data } = await apiClient.get<PolicyVerification>(
      `/policies/verify/${encodeURIComponent(policyNumber)}`,
    );
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Polisni tekshirishda xatolik yuz berdi'));
  }
}
