import { DriverRestriction, InsurancePolicy } from '@/types';
import { DriverFormData } from '@/lib/validation/schemas';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';

interface CreatePolicyInput {
  vehicleId: string;
  driverRestriction: DriverRestriction;
  drivers: DriverFormData[];
  // Only for a vehicle with registrationCountry "Xorij" — see
  // GET /apex-box/foreign-vehicle-durations.
  foreignPolicyDurationId?: string;
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

interface SubmitToPartnerResult {
  // osago_v3 (domestic) — a single redirect to the partner's own payment page.
  payallUrl?: string;
  // Apex_Box (foreign vehicle) — two separate payment-provider links; the
  // customer picks one.
  clickLink?: string;
  paymeLink?: string;
}

const SUBMIT_TO_PARTNER_FALLBACK = "Sug'urta kompaniyasiga yuborishda xatolik yuz berdi";

export async function submitToPartner(policyId: string): Promise<SubmitToPartnerResult> {
  try {
    const { data } = await apiClient.post<SubmitToPartnerResult>(
      `/policies/${policyId}/submit-to-partner`,
    );
    return data;
  } catch (err) {
    const message = getErrorMessage(err, SUBMIT_TO_PARTNER_FALLBACK);
    // The partner integrations sometimes surface their own raw, non-localized
    // text through this endpoint — Apex_Box echoes its own error verbatim
    // (prefixed "Apex_Box:", e.g. a known date-validation quirk on their
    // side), and an unhandled partner-client error reaches the customer as
    // the generic Nest "Internal server error". Neither is something a
    // customer should see, so fall back to a clean Uzbek message instead.
    const isTechnical = message.startsWith('Apex_Box:') || message === 'Internal server error';
    throw new Error(isTechnical ? SUBMIT_TO_PARTNER_FALLBACK : message);
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
