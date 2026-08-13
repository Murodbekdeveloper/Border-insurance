import { Vehicle } from '@/types';
import { VehicleFormData } from '@/lib/validation/schemas';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';

export async function createVehicle(data: VehicleFormData): Promise<Vehicle> {
  try {
    const { data: vehicle } = await apiClient.post<Vehicle>('/vehicles', data);
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
