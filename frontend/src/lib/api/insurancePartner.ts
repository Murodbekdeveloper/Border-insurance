import axios from 'axios';
import { apiClient } from '@/lib/api/client';

export class InsurancePartnerNotConfiguredError extends Error {
  constructor() {
    super('Asia Insurance API hali ulanmagan');
    this.name = 'InsurancePartnerNotConfiguredError';
  }
}

export interface RelativeOption {
  relative: number;
  name: string;
}

const NOT_CONFIGURED_CODE = 'INSURANCE_PARTNER_NOT_CONFIGURED';

// Haydovchining transport egasi bilan qarindoshlik darajalari ro'yxati —
// Asia Insurance'ning API kaliti hali sozlanmagan bo'lsa, backend
// ServiceUnavailableException + shu kod bilan javob beradi (OCR
// ulanmaganda ishlatiladigan patternning aynan o'zi); bu holatda chaqiruvchi
// tomon maydonni shunchaki ko'rsatmasligi kerak.
export async function getRelatives(): Promise<RelativeOption[]> {
  try {
    const { data } = await apiClient.get<{ items: RelativeOption[] }>('/insurance-partner/relatives');
    return data.items;
  } catch (err) {
    if (axios.isAxiosError(err) && (err.response?.data as { code?: string } | undefined)?.code === NOT_CONFIGURED_CODE) {
      throw new InsurancePartnerNotConfiguredError();
    }
    throw err;
  }
}
