import type { TranslationKey } from './i18n/useTranslation';

export const CITIES = [
  'Toshkent shahri',
  'Andijon',
  'Buxoro',
  'Farg\'ona',
  'Jizzax',
  'Namangan',
  'Navoiy',
  'Qashqadaryo',
  'Qoraqalpog\'iston',
  'Samarqand',
  'Sirdaryo',
  'Surxondaryo',
  'Toshkent viloyati',
  'Xorazm',
] as const;

export const VEHICLE_TYPES: { value: string; labelKey: TranslationKey }[] = [
  { value: 'yengil_avtomobil', labelKey: 'vehicleInfo.types.car' },
  { value: 'yuk_mashinasi', labelKey: 'vehicleInfo.types.truck' },
  { value: 'avtobus', labelKey: 'vehicleInfo.types.bus' },
  { value: 'mototsikl', labelKey: 'vehicleInfo.types.motorcycle' },
  { value: 'pritsep', labelKey: 'vehicleInfo.types.trailer' },
  { value: 'maxsus_texnika', labelKey: 'vehicleInfo.types.special' },
];

export const CAR_MODELS = [
  'Chevrolet Cobalt',
  'Chevrolet Nexia 3',
  'Chevrolet Gentra',
  'Chevrolet Malibu 2',
  'Chevrolet Spark',
  'Chevrolet Lacetti',
  'Chevrolet Damas',
  'Chevrolet Matiz',
  'Chevrolet Onix',
  'Chevrolet Tracker',
  'Chevrolet Captiva',
  'Chevrolet Equinox',
  'Chevrolet Trailblazer',
  'Ravon R2',
  'Ravon R4',
  'Daewoo Tico',
  'Daewoo Nexia',
  'Lada Granta',
  'Lada Vesta',
  'Lada Priora',
  'Lada Niva',
  'Kia Cerato',
  'Kia Sportage',
  'Kia Rio',
  'Kia K5',
  'Hyundai Solaris',
  'Hyundai Elantra',
  'Hyundai Tucson',
  'Hyundai Sonata',
  'Hyundai Santa Fe',
  'Toyota Camry',
  'Toyota Corolla',
  'Toyota Land Cruiser',
  'Toyota Land Cruiser Prado',
  'Toyota RAV4',
  'Isuzu NQR',
  'Isuzu Elf',
  'BYD Song Plan',
  'BYD Han',
  'Malibu XL',
] as const;

export const PRICING_CONFIG = {
  basePrice: 400_000,
  weightCategoryMultiplier: {
    'yengil': 1,
    'og\'ir': 1.5,
  },
  driverRestrictionMultiplier: {
    'cheklangan': 1,
    'cheklanmagan': 1.3,
  },
  residentTypeMultiplier: {
    'resident': 1,
    'non_resident': 1.2,
  },
  registrationCountryMultiplier: {
    'UZ': 1,
    'Xorij': 1.1,
  },
} as const;

export const STEP_LABELS: { path: string; labelKey: TranslationKey }[] = [
  { path: '/vehicle-info', labelKey: 'wizardShell.steps.vehicleInfo' },
  { path: '/driver-restriction', labelKey: 'wizardShell.steps.driverRestriction' },
  { path: '/payment', labelKey: 'wizardShell.steps.payment' },
  { path: '/confirmation', labelKey: 'wizardShell.steps.confirmation' },
];

export const TOTAL_STEPS = STEP_LABELS.length;
