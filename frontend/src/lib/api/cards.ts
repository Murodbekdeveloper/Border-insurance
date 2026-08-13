import { Card } from '@/types';
import { CardFormData } from '@/lib/validation/schemas';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';

export async function listCards(): Promise<Card[]> {
  try {
    const { data } = await apiClient.get<Card[]>('/cards');
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Kartalarni olishda xatolik yuz berdi'));
  }
}

export async function addCard(data: CardFormData): Promise<Card> {
  try {
    const { data: card } = await apiClient.post<Card>('/cards', data);
    return card;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Kartani qo\'shishda xatolik yuz berdi'));
  }
}

export async function deleteCard(cardId: string): Promise<void> {
  try {
    await apiClient.delete(`/cards/${cardId}`);
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Kartani o\'chirishda xatolik yuz berdi'));
  }
}

// Only meaningful when Card.requiresCardVerification is true — sends the
// Payme SMS code to the cardholder's phone. Under the mock gateway no card
// is ever Payme-tokenized, so this path is never hit.
export async function requestCardVerification(cardId: string): Promise<void> {
  try {
    await apiClient.post(`/cards/${cardId}/payme/verify-request`);
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Tasdiqlash kodini yuborishda xatolik yuz berdi'));
  }
}

export async function confirmCardVerification(cardId: string, code: string): Promise<Card> {
  try {
    const { data } = await apiClient.post<Card>(`/cards/${cardId}/payme/verify`, { code });
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Kartani tasdiqlashda xatolik yuz berdi'));
  }
}
