import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DriverRestriction, ResidentType } from '@/types';
import { DriverFormData, VehicleFormData } from '@/lib/validation/schemas';

export const MAX_DRIVERS = 6;

interface ApplicationState {
  residentType: ResidentType | null;
  vehicle: VehicleFormData | null;
  vehicleId: string | null;
  driverRestriction: DriverRestriction | null;
  drivers: DriverFormData[];
  policyId: string | null;
  price: number | null;

  setResidentType: (type: ResidentType) => void;
  setVehicle: (vehicle: VehicleFormData, vehicleId: string) => void;
  setDriverRestriction: (restriction: DriverRestriction, drivers: DriverFormData[]) => void;
  setPolicy: (policyId: string) => void;
  setPrice: (price: number) => void;
  reset: () => void;
}

const initialState = {
  residentType: null,
  vehicle: null,
  vehicleId: null,
  driverRestriction: null,
  drivers: [],
  policyId: null,
  price: null,
};

export const useApplicationStore = create<ApplicationState>()(
  persist(
    (set) => ({
      ...initialState,
      setResidentType: (residentType) => set({ residentType }),
      setVehicle: (vehicle, vehicleId) => set({ vehicle, vehicleId }),
      setDriverRestriction: (driverRestriction, drivers) => set({ driverRestriction, drivers }),
      setPolicy: (policyId) => set({ policyId }),
      setPrice: (price) => set({ price }),
      reset: () => set(initialState),
    }),
    { name: 'osago-application' },
  ),
);
