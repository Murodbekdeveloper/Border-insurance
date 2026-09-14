import axios from 'axios';
import { Vehicle } from '@/types';
import { VehicleFormData } from '@/lib/validation/schemas';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';

export async function createVehicle(data: VehicleFormData): Promise<Vehicle> {
  try {
    // foreignPolicyDurationId belongs to the policy (see CreatePolicyDto in
    // policies.ts), not the vehicle — the backend's CreateVehicleDto has no
    // such field and the global ValidationPipe rejects unknown properties
    // with a 400, so it must not be forwarded here even though it lives on
    // the same form/store object for convenience.
    const payload = { ...data };
    delete payload.foreignPolicyDurationId;
    const { data: vehicle } = await apiClient.post<Vehicle>('/vehicles', payload);
    return vehicle;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Transport ma\'lumotlarini saqlashda xatolik yuz berdi'));
  }
}

export async function listVehicles(): Promise<Vehicle[]> {
  try {
    const { data } = await apiClient.get<Vehicle[]>('/vehicles');
    return data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Transport vositalarini olishda xatolik yuz berdi'));
  }
}

export interface VehicleLookupResult {
  model: string;
  manufactureYear: number;
  bodyNumber: string;
  engineNumber: string;
}

const LOOKUP_NOT_CONFIGURED_CODE = 'VEHICLE_LOOKUP_NOT_CONFIGURED';
const LOOKUP_NOT_FOUND_CODE = 'VEHICLE_LOOKUP_NOT_FOUND';

// Asia Insurance orqali topilmasa yoki integratsiya hali sozlanmagan bo'lsa,
// foydalanuvchi shunchaki qo'lda to'ldirishda davom etadi — shuning uchun bu
// funksiya xato tashlash o'rniga shu holatlarda null qaytaradi.
export async function lookupVehicle(
  plateNumber: string,
  techPassportSeries: string,
  techPassportNumber: string,
): Promise<VehicleLookupResult | null> {
  try {
    const { data } = await apiClient.get<VehicleLookupResult>('/vehicles/lookup', {
      params: { plateNumber, techPassportSeries, techPassportNumber },
    });
    return data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const code = (err.response?.data as { code?: string } | undefined)?.code;
      if (code === LOOKUP_NOT_FOUND_CODE || code === LOOKUP_NOT_CONFIGURED_CODE) {
        return null;
      }
    }
    throw new Error(getErrorMessage(err, "Transport ma'lumotlarini olishda xatolik yuz berdi"));
  }
}
