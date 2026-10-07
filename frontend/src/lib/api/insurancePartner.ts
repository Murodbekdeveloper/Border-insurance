import axios from 'axios';
import { apiClient } from '@/lib/api/client';
import type { MultiLangNamed } from '@/lib/i18n/multiLang';

export class InsurancePartnerNotConfiguredError extends Error {
  constructor() {
    super('Asia Insurance API hali ulanmagan');
    this.name = 'InsurancePartnerNotConfiguredError';
  }
}

// nameRu/nameEn/nameKy/nameZh (from MultiLangNamed) are populated by the
// backend — see lib/i18n/multiLang.ts's localizedName()/localizedSearchText()
// for how the frontend picks the right one to display/search by the active
// UI locale.
export interface RelativeOption extends MultiLangNamed {
  relative: number;
}

export interface PeriodOption extends MultiLangNamed {
  period: number;
}

const NOT_CONFIGURED_CODE = 'INSURANCE_PARTNER_NOT_CONFIGURED';

// O'zbekistonda ro'yxatdan o'tgan transport uchun sug'urta muddatlari
// ro'yxati — GET /insurance-partner/periods. getRelatives() bilan bir xil
// "hali ulanmagan" naqshi.
export async function getPeriods(): Promise<PeriodOption[]> {
  try {
    const { data } = await apiClient.get<{ items: PeriodOption[] }>('/insurance-partner/periods');
    return data.items;
  } catch (err) {
    if (axios.isAxiosError(err) && (err.response?.data as { code?: string } | undefined)?.code === NOT_CONFIGURED_CODE) {
      throw new InsurancePartnerNotConfiguredError();
    }
    throw err;
  }
}

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
