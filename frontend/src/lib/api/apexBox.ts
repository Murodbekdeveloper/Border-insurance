import axios from 'axios';
import { apiClient } from '@/lib/api/client';

export class ApexBoxNotConfiguredError extends Error {}

const NOT_CONFIGURED_CODE = 'APEX_BOX_NOT_CONFIGURED';

export interface ApexBoxReferenceOption {
  id: number | string;
  name: string;
}

async function getReferenceList(path: string): Promise<ApexBoxReferenceOption[]> {
  try {
    const { data } = await apiClient.get<{ items: ApexBoxReferenceOption[] }>(path);
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
  return getReferenceList('/apex-box/countries');
}

export function getForeignVehicleDurations(): Promise<ApexBoxReferenceOption[]> {
  return getReferenceList('/apex-box/foreign-vehicle-durations');
}
