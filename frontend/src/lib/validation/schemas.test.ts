import { describe, expect, it } from 'vitest';
import { cardSchema, driverRestrictionSchema, loginSchema, registerSchema, vehicleSchema } from './schemas';

describe('loginSchema', () => {
  it('accepts a valid email/password pair', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const base = {
    fullName: 'Aziz Karimov',
    email: 'aziz@example.com',
    phone: '+998901234567',
    password: 'password123',
    confirmPassword: 'password123',
  };

  it('accepts valid registration data', () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a phone number without the +998 prefix', () => {
    const result = registerSchema.safeParse({ ...base, phone: '901234567' });
    expect(result.success).toBe(false);
  });

  it('rejects a phone number with the wrong digit count', () => {
    const result = registerSchema.safeParse({ ...base, phone: '+99890123456' });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: 'different' });
    expect(result.success).toBe(false);
  });
});

describe('vehicleSchema', () => {
  const base = {
    weightCategory: 'yengil' as const,
    registrationCountry: 'UZ' as const,
    plateNumber: '01 A 123 AA',
    techPassportSeries: 'AAB',
    techPassportNumber: '1234567',
    model: 'Chevrolet Cobalt',
    vehicleType: 'yengil_avtomobil',
    techPassportIssueDate: '2022-05-10',
    manufactureYear: '2021',
    bodyNumber: 'ABC1234567',
    engineNumber: 'ENG1234567',
    city: 'Toshkent shahri',
    phone: '+998901234567',
  };

  it('accepts a fully valid vehicle', () => {
    expect(vehicleSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a manufacture year before 1970', () => {
    expect(vehicleSchema.safeParse({ ...base, manufactureYear: '1969' }).success).toBe(false);
  });

  it('rejects a manufacture year in the future', () => {
    const nextYear = String(new Date().getFullYear() + 1);
    expect(vehicleSchema.safeParse({ ...base, manufactureYear: nextYear }).success).toBe(false);
  });

  it('rejects a body number shorter than 5 characters', () => {
    expect(vehicleSchema.safeParse({ ...base, bodyNumber: 'AB1' }).success).toBe(false);
  });

  it('rejects a body number with non-alphanumeric characters', () => {
    expect(vehicleSchema.safeParse({ ...base, bodyNumber: 'ABC-123!' }).success).toBe(false);
  });
});

describe('driverRestrictionSchema', () => {
  const validDriver = {
    fullName: 'Ali Valiyev',
    birthDate: '1990-01-01',
    passportSeries: 'AA',
    passportNumber: '1234567',
    licenseNumber: 'LIC123456',
    licenseIssueDate: '2015-06-01',
    drivingExperienceSince: '2015',
  };

  it('allows an unrestricted policy with no drivers', () => {
    const result = driverRestrictionSchema.safeParse({ driverRestriction: 'cheklanmagan', drivers: [] });
    expect(result.success).toBe(true);
  });

  it('rejects a restricted policy with no drivers', () => {
    const result = driverRestrictionSchema.safeParse({ driverRestriction: 'cheklangan', drivers: [] });
    expect(result.success).toBe(false);
  });

  it('accepts a restricted policy with at least one valid driver', () => {
    const result = driverRestrictionSchema.safeParse({ driverRestriction: 'cheklangan', drivers: [validDriver] });
    expect(result.success).toBe(true);
  });

  it('rejects a driver with a passport series longer than 2 letters', () => {
    const result = driverRestrictionSchema.safeParse({
      driverRestriction: 'cheklangan',
      drivers: [{ ...validDriver, passportSeries: 'ABC' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('cardSchema', () => {
  const base = { cardHolderName: 'ALI VALIYEV', cardNumber: '4111111111111111', expDate: '12/30', cvv: '123' };

  it('accepts a valid Visa card', () => {
    expect(cardSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a valid Mastercard number', () => {
    expect(cardSchema.safeParse({ ...base, cardNumber: '5111111111111111' }).success).toBe(true);
  });

  it('rejects a card number that is neither Visa nor Mastercard', () => {
    expect(cardSchema.safeParse({ ...base, cardNumber: '6111111111111111' }).success).toBe(false);
  });

  it('rejects a card number with the wrong digit count', () => {
    expect(cardSchema.safeParse({ ...base, cardNumber: '41111111' }).success).toBe(false);
  });

  it('rejects an expired card', () => {
    expect(cardSchema.safeParse({ ...base, expDate: '01/20' }).success).toBe(false);
  });

  it('rejects a CVV that is not 3 digits', () => {
    expect(cardSchema.safeParse({ ...base, cvv: '12' }).success).toBe(false);
  });
});
