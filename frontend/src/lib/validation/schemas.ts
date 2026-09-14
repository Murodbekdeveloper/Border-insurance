import { z } from 'zod';
import { detectCardType } from '@/lib/utils';

const phoneRegex = /^\+998[0-9]{9}$/;
const alphanumericRegex = /^[A-Za-z0-9]+$/;
const passportSeriesRegex = /^[A-Z]{2}$/;
const passportNumberRegex = /^[0-9]{7}$/;

export const loginSchema = z.object({
  email: z.string().min(1, 'Email kiritilishi shart').email('Email formati noto\'g\'ri'),
  password: z.string().min(1, 'Parol kiritilishi shart'),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(3, 'To\'liq ism-sharif kiritilishi shart'),
    email: z.string().min(1, 'Email kiritilishi shart').email('Email formati noto\'g\'ri'),
    phone: z.string().regex(phoneRegex, 'Telefon raqami +998XXXXXXXXX formatida bo\'lishi kerak'),
    password: z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
    confirmPassword: z.string().min(1, 'Parolni tasdiqlang'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Parollar mos kelmadi',
    path: ['confirmPassword'],
  });
export type RegisterFormData = z.infer<typeof registerSchema>;

const currentYear = new Date().getFullYear();

export const vehicleSchema = z.object({
  weightCategory: z.enum(['yengil', 'og\'ir'], { message: 'Og\'irlik toifasini tanlang' }),
  registrationCountry: z.enum(['UZ', 'Xorij'], { message: 'Ro\'yxatga olingan davlatni tanlang' }),
  plateNumber: z
    .string()
    .min(5, 'Davlat raqami to\'liq kiritilmagan')
    .max(20, 'Davlat raqami juda uzun'),
  techPassportSeries: z
    .string()
    .min(2, 'Texpasport seriyasi to\'liq kiritilmagan')
    .max(10, 'Texpasport seriyasi juda uzun'),
  techPassportNumber: z
    .string()
    .min(4, 'Texpasport raqami to\'liq kiritilmagan')
    .max(20, 'Texpasport raqami juda uzun'),
  model: z.string().min(1, 'Avtomobil modeli kiritilishi shart'),
  vehicleType: z.string().min(1, 'Transport turini tanlang'),
  techPassportIssueDate: z
    .string()
    .min(1, 'Texpasport berilgan sanasini kiriting')
    .refine((val) => new Date(val) <= new Date(), 'Sana kelajakda bo\'lishi mumkin emas'),
  manufactureYear: z
    .string()
    .regex(/^[0-9]{4}$/, 'Ishlab chiqarilgan yilini kiriting')
    .refine((val) => Number(val) >= 1970, 'Yil 1970 dan katta bo\'lishi kerak')
    .refine((val) => Number(val) <= currentYear, `Yil ${currentYear} dan katta bo'lishi mumkin emas`),
  bodyNumber: z
    .string()
    .min(5, 'Kuzov raqami kamida 5 ta belgidan iborat bo\'lishi kerak')
    .max(17, 'Kuzov raqami 17 ta belgidan oshmasligi kerak')
    .regex(alphanumericRegex, 'Kuzov raqami faqat lotin harflar va raqamlardan iborat bo\'lishi kerak'),
  engineNumber: z
    .string()
    .min(5, 'Dvigatel raqami kamida 5 ta belgidan iborat bo\'lishi kerak')
    .max(17, 'Dvigatel raqami 17 ta belgidan oshmasligi kerak')
    .regex(alphanumericRegex, 'Dvigatel raqami faqat lotin harflar va raqamlardan iborat bo\'lishi kerak'),
  city: z.string().min(1, 'Shaharni tanlang'),
  phone: z.string().regex(phoneRegex, 'Telefon raqami +998XXXXXXXXX formatida bo\'lishi kerak'),
  // Sug'urta kompaniyasi transport egasi ma'lumotini alohida talab qiladi —
  // odatda sug'urta oluvchining o'zi, shuning uchun standart holatda true.
  // false bo'lganda quyidagi uchta maydon to'ldirilishi shart.
  ownerIsApplicant: z.boolean(),
  ownerPassportSeries: z.string().optional(),
  ownerPassportNumber: z.string().optional(),
  ownerBirthDate: z.string().optional(),
  // Faqat registrationCountry "Xorij" bo'lganda kerak — Apex_Box orqali
  // yuboriladigan sug'urta muddati (GET /apex-box/foreign-vehicle-durations).
  foreignPolicyDurationId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.registrationCountry === 'Xorij' && !data.foreignPolicyDurationId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sug'urta muddatini tanlang", path: ['foreignPolicyDurationId'] });
  }
  if (data.ownerIsApplicant) return;
  if (!data.ownerPassportSeries) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Egasining pasport seriyasini kiriting', path: ['ownerPassportSeries'] });
  }
  if (!data.ownerPassportNumber) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Egasining pasport raqamini kiriting', path: ['ownerPassportNumber'] });
  }
  if (!data.ownerBirthDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Egasining tug\'ilgan sanasini kiriting', path: ['ownerBirthDate'] });
  } else if (new Date(data.ownerBirthDate) > new Date()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Sana kelajakda bo\'lishi mumkin emas', path: ['ownerBirthDate'] });
  }
});
export type VehicleFormData = z.infer<typeof vehicleSchema>;

const driverBaseSchema = z.object({
  fullName: z.string().min(3, 'F.I.O. kiritilishi shart'),
  birthDate: z
    .string()
    .min(1, 'Tug\'ilgan sanani kiriting')
    .refine((val) => new Date(val) <= new Date(), 'Sana kelajakda bo\'lishi mumkin emas'),
  licenseNumber: z.string().min(1, 'Guvohnoma raqamini kiriting'),
  licenseIssueDate: z
    .string()
    .min(1, 'Guvohnoma berilgan sanasini kiriting')
    .refine((val) => new Date(val) <= new Date(), 'Sana kelajakda bo\'lishi mumkin emas'),
  // Asia Insurance API hali ulanmagan bo'lsa forma bu maydonni ko'rsatmaydi
  // — shuning uchun ixtiyoriy.
  relativeId: z.number().optional(),
});

// O'zbekiston pasporti "2 lotin harfi + 7 raqam" formatida bo'ladi, lekin chet
// el fuqarolarining pasportlari bu formatga umuman to'g'ri kelmaydi — shuning
// uchun norezident arizalar uchun bu maydonlar erkinroq (istalgan alfanumerik
// qiymat) qabul qilinadi.
export function getDriverSchema(isForeign: boolean) {
  return driverBaseSchema.extend({
    passportSeries: isForeign
      ? z.string().min(1, 'Pasport seriyasi/kodini kiriting').max(10, 'Ko\'pi bilan 10 ta belgi')
      : z
          .string()
          .toUpperCase()
          .regex(passportSeriesRegex, 'Seriya 2 ta lotin harfidan iborat bo\'lishi kerak (masalan, AA)'),
    passportNumber: isForeign
      ? z.string().min(3, 'Pasport raqamini kiriting').max(20, 'Ko\'pi bilan 20 ta belgi')
      : z.string().regex(passportNumberRegex, 'Pasport raqami 7 ta raqamdan iborat bo\'lishi kerak'),
  });
}
export const driverSchema = getDriverSchema(false);
export type DriverFormData = z.infer<ReturnType<typeof getDriverSchema>>;

export function getDriverRestrictionSchema(isForeign: boolean) {
  return z
    .object({
      driverRestriction: z.enum(['cheklangan', 'cheklanmagan']),
      drivers: z.array(getDriverSchema(isForeign)),
    })
    .refine(
      (data) => data.driverRestriction === 'cheklanmagan' || data.drivers.length > 0,
      {
        message: 'Kamida bitta haydovchi qo\'shilishi kerak',
        path: ['drivers'],
      },
    );
}
export const driverRestrictionSchema = getDriverRestrictionSchema(false);
export type DriverRestrictionFormData = z.infer<ReturnType<typeof getDriverRestrictionSchema>>;

// Passport+tug'ilgan sana — sug'urta kompaniyasi tomonidan "sug'urta oluvchi"
// sifatida talab qilinadi. Hozircha ixtiyoriy: OSAGO'ni rasman ro'yxatga
// olish integratsiyasi hali ulanmagan, lekin ma'lumot oldindan yig'ib
// qo'yilsa, ulanganda foydalanuvchi qayta so'ralmaydi.
export const updateProfileSchema = z.object({
  fullName: z.string().min(3, 'To\'liq ism-sharif kiritilishi shart'),
  phone: z.string().regex(phoneRegex, 'Telefon raqami +998XXXXXXXXX formatida bo\'lishi kerak'),
  passportSeries: z.string().max(10, 'Ko\'pi bilan 10 ta belgi').optional().or(z.literal('')),
  passportNumber: z.string().max(20, 'Ko\'pi bilan 20 ta belgi').optional().or(z.literal('')),
  birthDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || new Date(val) <= new Date(), 'Sana kelajakda bo\'lishi mumkin emas'),
});
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

// Joriy parol faqat foydalanuvchida allaqachon parol o'rnatilgan bo'lsagina
// majburiy (masalan, Google orqali ro'yxatdan o'tgan va hali parol
// o'rnatmagan foydalanuvchi uchun bu maydon ko'rsatilmaydi ham).
export function getChangePasswordSchema(requireCurrentPassword: boolean) {
  return z
    .object({
      currentPassword: requireCurrentPassword
        ? z.string().min(1, 'Joriy parolni kiriting')
        : z.string().optional(),
      newPassword: z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
      confirmNewPassword: z.string().min(1, 'Parolni tasdiqlang'),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: 'Parollar mos kelmadi',
      path: ['confirmNewPassword'],
    });
}
export type ChangePasswordFormData = z.infer<ReturnType<typeof getChangePasswordSchema>>;

// Uzcard/Humo cards have no CVV printed on them — only Visa/Mastercard do.
function cardTypeRequiresCvv(cardNumberDigits: string): boolean {
  const type = detectCardType(cardNumberDigits);
  return type === 'visa' || type === 'mastercard';
}

export const cardSchema = z
  .object({
    cardHolderName: z.string().min(3, 'Karta egasining ismini kiriting'),
    cardNumber: z
      .string()
      .transform((val) => val.replace(/\D/g, ''))
      .refine((val) => val.length === 16, 'Karta raqami 16 ta raqamdan iborat bo\'lishi kerak')
      .refine((val) => detectCardType(val) !== null, 'Karta raqami noto\'g\'ri — Visa, Mastercard, Uzcard yoki Humo kartasini kiriting'),
    expDate: z
      .string()
      .regex(/^(0[1-9]|1[0-2])\/[0-9]{2}$/, 'Amal qilish muddati OY/YIL formatida bo\'lishi kerak')
      .refine((val) => {
        const [month, year] = val.split('/').map(Number);
        const expiry = new Date(2000 + year, month, 0);
        return expiry >= new Date();
      }, 'Karta muddati tugagan'),
    cvv: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (cardTypeRequiresCvv(data.cardNumber) && !/^[0-9]{3}$/.test(data.cvv ?? '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CVV 3 ta raqamdan iborat bo\'lishi kerak',
        path: ['cvv'],
      });
    }
  });
export type CardFormData = z.infer<typeof cardSchema>;
