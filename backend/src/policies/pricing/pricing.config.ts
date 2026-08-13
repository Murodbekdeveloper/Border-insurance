import { DriverRestriction } from '../entities/insurance-policy.entity';
import {
  RegistrationCountry,
  WeightCategory,
} from '../../vehicles/entities/vehicle.entity';
import { ResidentType } from '../../users/entities/user.entity';

export interface PricingConfig {
  basePrice: number;
  weightCategoryMultiplier: Record<WeightCategory, number>;
  driverRestrictionMultiplier: Record<DriverRestriction, number>;
  residentTypeMultiplier: Record<ResidentType, number>;
  registrationCountryMultiplier: Record<RegistrationCountry, number>;
}

/**
 * Tariff table for OSAGO premiums. Kept as data (not inlined in the service)
 * so it can later move to the database or an admin-editable settings table
 * without touching PricingService's logic.
 */
export const PRICING_CONFIG: PricingConfig = {
  basePrice: 400_000,
  weightCategoryMultiplier: {
    [WeightCategory.LIGHT]: 1,
    [WeightCategory.HEAVY]: 1.5,
  },
  driverRestrictionMultiplier: {
    [DriverRestriction.RESTRICTED]: 1,
    [DriverRestriction.UNRESTRICTED]: 1.3,
  },
  residentTypeMultiplier: {
    [ResidentType.RESIDENT]: 1,
    [ResidentType.NON_RESIDENT]: 1.2,
  },
  registrationCountryMultiplier: {
    [RegistrationCountry.UZ]: 1,
    [RegistrationCountry.FOREIGN]: 1.1,
  },
};
