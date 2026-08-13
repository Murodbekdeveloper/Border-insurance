import { PricingService } from './pricing.service';
import { DriverRestriction } from '../entities/insurance-policy.entity';
import {
  RegistrationCountry,
  WeightCategory,
} from '../../vehicles/entities/vehicle.entity';
import { ResidentType } from '../../users/entities/user.entity';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService();
  });

  it('returns the base price for the cheapest combination', () => {
    const price = service.calculatePrice({
      weightCategory: WeightCategory.LIGHT,
      driverRestriction: DriverRestriction.RESTRICTED,
      residentType: ResidentType.RESIDENT,
      registrationCountry: RegistrationCountry.UZ,
    });
    expect(price).toBe(400_000);
  });

  it('applies the heavy-vehicle multiplier', () => {
    const price = service.calculatePrice({
      weightCategory: WeightCategory.HEAVY,
      driverRestriction: DriverRestriction.RESTRICTED,
      residentType: ResidentType.RESIDENT,
      registrationCountry: RegistrationCountry.UZ,
    });
    expect(price).toBe(600_000);
  });

  it('applies the unrestricted-driver multiplier', () => {
    const price = service.calculatePrice({
      weightCategory: WeightCategory.LIGHT,
      driverRestriction: DriverRestriction.UNRESTRICTED,
      residentType: ResidentType.RESIDENT,
      registrationCountry: RegistrationCountry.UZ,
    });
    expect(price).toBe(520_000);
  });

  it('applies the non-resident multiplier', () => {
    const price = service.calculatePrice({
      weightCategory: WeightCategory.LIGHT,
      driverRestriction: DriverRestriction.RESTRICTED,
      residentType: ResidentType.NON_RESIDENT,
      registrationCountry: RegistrationCountry.UZ,
    });
    expect(price).toBe(480_000);
  });

  it('applies the foreign-registration multiplier', () => {
    const price = service.calculatePrice({
      weightCategory: WeightCategory.LIGHT,
      driverRestriction: DriverRestriction.RESTRICTED,
      residentType: ResidentType.RESIDENT,
      registrationCountry: RegistrationCountry.FOREIGN,
    });
    expect(price).toBe(440_000);
  });

  it('defaults to resident pricing when residentType is missing', () => {
    const withNull = service.calculatePrice({
      weightCategory: WeightCategory.LIGHT,
      driverRestriction: DriverRestriction.RESTRICTED,
      residentType: null,
      registrationCountry: RegistrationCountry.UZ,
    });
    const withResident = service.calculatePrice({
      weightCategory: WeightCategory.LIGHT,
      driverRestriction: DriverRestriction.RESTRICTED,
      residentType: ResidentType.RESIDENT,
      registrationCountry: RegistrationCountry.UZ,
    });
    expect(withNull).toBe(withResident);
  });

  it('stacks every multiplier for the most expensive combination', () => {
    const price = service.calculatePrice({
      weightCategory: WeightCategory.HEAVY,
      driverRestriction: DriverRestriction.UNRESTRICTED,
      residentType: ResidentType.NON_RESIDENT,
      registrationCountry: RegistrationCountry.FOREIGN,
    });
    // 400000 * 1.5 * 1.3 * 1.2 * 1.1 = 1029600 -> rounded to nearest 1000
    expect(price).toBe(1_030_000);
  });

  it('always rounds to the nearest 1000', () => {
    const price = service.calculatePrice({
      weightCategory: WeightCategory.HEAVY,
      driverRestriction: DriverRestriction.UNRESTRICTED,
      residentType: ResidentType.RESIDENT,
      registrationCountry: RegistrationCountry.UZ,
    });
    expect(price % 1000).toBe(0);
  });
});
