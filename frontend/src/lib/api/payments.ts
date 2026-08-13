import { Payment } from '@/types';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';

interface PayInput {
  policyId: string;
  cardId: string;
}

export async function pay(input: PayInput): Promise<Payment> {
  try {
    const { data } = await apiClient.post<Payment>('/payments', input);
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'To\'lovda xatolik yuz berdi'));
  }
}
