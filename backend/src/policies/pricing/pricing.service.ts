import { Injectable } from '@nestjs/common';
import { PRICING_CONFIG } from './pricing.config';
import { DriverRestriction } from '../entities/insurance-policy.entity';
import {
  RegistrationCountry,
  WeightCategory,
} from '../../vehicles/entities/vehicle.entity';
import { ResidentType } from '../../users/entities/user.entity';

export interface CalculatePriceParams {
  weightCategory: WeightCategory;
  driverRestriction: DriverRestriction;
  residentType: ResidentType | null | undefined;
  registrationCountry: RegistrationCountry;
}

@Injectable()
export class PricingService {
  calculatePrice(params: CalculatePriceParams): number {
    const resident = params.residentType ?? ResidentType.RESIDENT;
    const price =
      PRICING_CONFIG.basePrice *
      PRICING_CONFIG.weightCategoryMultiplier[params.weightCategory] *
      PRICING_CONFIG.driverRestrictionMultiplier[params.driverRestriction] *
      PRICING_CONFIG.residentTypeMultiplier[resident] *
      PRICING_CONFIG.registrationCountryMultiplier[params.registrationCountry];

    return Math.round(price / 1000) * 1000;
  }
}
