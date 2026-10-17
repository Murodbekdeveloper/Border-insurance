import axios from 'axios';
import { apiClient } from '@/lib/api/client';
import type { MultiLangNamed } from '@/lib/i18n/multiLang';
import type { RelativeOption } from '@/lib/api/insurancePartner';

export class ApexBoxNotConfiguredError extends Error {}

const NOT_CONFIGURED_CODE = 'APEX_BOX_NOT_CONFIGURED';

// nameRu/nameEn/nameKy/nameZh (from MultiLangNamed) are populated by the
// backend for both /countries and /foreign-vehicle-durations — see
// lib/i18n/multiLang.ts's localizedName()/localizedSearchText() for how the
// frontend picks the right one to display/search by the active UI locale.
// nameNative (countries only — see backend's translateCountryItems) is the
// country's own name in its own titular language, e.g. "O‘zbekiston" — used
// instead of localizedName() so the citizenship picker doesn't depend on
// the active UI language.
export interface ApexBoxReferenceOption extends MultiLangNamed {
  id: number | string;
  nameNative?: string;
}

async function getReferenceList<T>(path: string): Promise<T[]> {
  try {
    const { data } = await apiClient.get<{ items: T[] }>(path);
    return data.items;
  } catch (err) {
    if (
      axios.isAxiosError(err) &&
      (err.response?.data as { code?: string } | undefined)?.code === NOT_CONFIGURED_CODE
    ) {
      throw new ApexBoxNotConfiguredError();
    }
    throw err;
  }
}

export function getCountries(): Promise<ApexBoxReferenceOption[]> {
  return getReferenceList<ApexBoxReferenceOption>('/apex-box/countries');
}

export function getForeignVehicleDurations(): Promise<ApexBoxReferenceOption[]> {
  return getReferenceList<ApexBoxReferenceOption>('/apex-box/foreign-vehicle-durations');
}

// Apex_Box's own kinship list (/osago_relative, "sp_id"-numbered) — a
// different scheme than osago_v3's /get-relative (see insurancePartner.ts's
// getRelatives()). Foreign-registered vehicles submit through Apex_Box, so
// their driver's relativeId must come from here, not osago_v3's list, or
// the wrong kinship value gets recorded on the issued policy. Shaped the
// same as RelativeOption (not ApexBoxReferenceOption) so driver-restriction/
// page.tsx's relative picker works unchanged against either source.
export function getApexBoxRelatives(): Promise<RelativeOption[]> {
  return getReferenceList<RelativeOption>('/apex-box/relatives');
}
