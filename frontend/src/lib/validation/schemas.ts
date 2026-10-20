import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { isNotFutureLocalDate } from '@/lib/utils';
import type { Translator } from '@/lib/i18n/useTranslation';

const phoneRegex = /^\+998[0-9]{9}$/;
const alphanumericRegex = /^[A-Za-z0-9]+$/;
const passportSeriesRegex = /^[A-Z]{2}$/;
const passportNumberRegex = /^[0-9]{7}$/;

export function getLoginSchema(t: Translator) {
  return z.object({
    email: z.string().min(1, t('validation.emailRequired')).email(t('validation.emailInvalid')),
    password: z.string().min(1, t('validation.passwordRequired')),
  });
}
export type LoginFormData = z.infer<ReturnType<typeof getLoginSchema>>;

// Faqat email majburiy — telefon ixtiyoriy, shuning uchun bo'sh yoki hali
// to'ldirilmagan "+998" prefiksi ham qabul qilinadi; kiritilgan bo'lsa,
// to'liq formatga mos kelishi kerak.
export function getRegisterSchema(t: Translator) {
  return z
    .object({
      fullName: z.string().min(3, t('validation.fullNameRequired')),
      email: z.string().min(1, t('validation.emailRequired')).email(t('validation.emailInvalid')),
      phone: z
        .string()
        .refine((val) => !val || val === '+998' || phoneRegex.test(val), {
          message: t('validation.phoneFormat'),
        }),
      password: z.string().min(6, t('validation.passwordMinLength')),
      confirmPassword: z.string().min(1, t('validation.confirmPasswordRequired')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordsMismatch'),
      path: ['confirmPassword'],
    });
}
export type RegisterFormData = z.infer<ReturnType<typeof getRegisterSchema>>;

const currentYear = new Date().getFullYear();

export function getVehicleSchema(t: Translator) {
  return z
    .object({
      weightCategory: z.enum(['yengil', "og'ir"], { message: t('validation.weightCategoryRequired') }),
      registrationCountry: z.enum(['UZ', 'Xorij'], { message: t('validation.registrationCountryRequired') }),
      plateNumber: z
        .string()
        .min(5, t('validation.plateNumberIncomplete'))
        .max(20, t('validation.plateNumberTooLong')),
      techPassportSeries: z
        .string()
        .min(2, t('validation.techPassportSeriesIncomplete'))
        .max(10, t('validation.techPassportSeriesTooLong')),
      techPassportNumber: z
        .string()
        .min(4, t('validation.techPassportNumberIncomplete'))
        .max(20, t('validation.techPassportNumberTooLong')),
      model: z.string().min(1, t('validation.modelRequired')),
      vehicleType: z.string().min(1, t('validation.vehicleTypeRequired')),
      techPassportIssueDate: z
        .string()
        .min(1, t('validation.techPassportIssueDateRequired'))
        .refine((val) => isNotFutureLocalDate(val), t('validation.dateNotFuture')),
      manufactureYear: z
        .string()
        .regex(/^[0-9]{4}$/, t('validation.manufactureYearFormat'))
        .refine((val) => Number(val) >= 1970, t('validation.manufactureYearMin'))
        .refine((val) => Number(val) <= currentYear, t('validation.manufactureYearMax', { year: currentYear })),
      bodyNumber: z
        .string()
        .min(5, t('validation.bodyNumberMinLength'))
        .max(17, t('validation.bodyNumberMaxLength'))
        .regex(alphanumericRegex, t('validation.bodyNumberAlphanumeric')),
      engineNumber: z
        .string()
        .min(5, t('validation.engineNumberMinLength'))
        .max(17, t('validation.engineNumberMaxLength'))
        .regex(alphanumericRegex, t('validation.engineNumberAlphanumeric')),
      // Faqat registrationCountry "Xorij" bo'lganda kerak (Apex_Box'ga
      // applicant.address sifatida yuboriladi) — O'zbekistonda ro'yxatdan
      // o'tgan mashinalar uchun Asia Insurance'ning osago_v3 API'sida bunday
      // maydon umuman yo'q.
      city: z.string().optional(),
      // Unlike the account/login phone (register & profile schemas below,
      // which stay +998-only — tied to this app's own Uzbek SMS/OTP
      // delivery), this is the vehicle/policy contact number, which a
      // non-resident may legitimately give in their own country's format —
      // validated against libphonenumber-js's real per-country rules
      // instead of a hardcoded Uzbek regex.
      phone: z
        .string()
        .refine((val) => isValidPhoneNumber(val), { message: t('validation.phoneFormat') }),
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
      // Oynali juftlashuv — faqat registrationCountry "UZ" bo'lganda kerak
      // (GET /insurance-partner/periods, osago_v3'ning /get-period'i).
      periodId: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.registrationCountry === 'Xorij') {
        if (!data.foreignPolicyDurationId) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('validation.durationRequired'), path: ['foreignPolicyDurationId'] });
        }
        if (!data.city) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('validation.addressRequired'), path: ['city'] });
        }
      } else if (!data.periodId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('validation.durationRequired'), path: ['periodId'] });
      }
      if (data.ownerIsApplicant) return;
      if (!data.ownerPassportSeries) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('validation.ownerPassportSeriesRequired'), path: ['ownerPassportSeries'] });
      }
      if (!data.ownerPassportNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('validation.ownerPassportNumberRequired'), path: ['ownerPassportNumber'] });
      }
      if (!data.ownerBirthDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('validation.ownerBirthDateRequired'), path: ['ownerBirthDate'] });
      } else if (!isNotFutureLocalDate(data.ownerBirthDate)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('validation.dateNotFuture'), path: ['ownerBirthDate'] });
      }
    });
}
export type VehicleFormData = z.infer<ReturnType<typeof getVehicleSchema>>;

function getDriverBaseSchema(t: Translator) {
  return z.object({
    fullName: z.string().min(3, t('validation.driverFullNameRequired')),
    birthDate: z
      .string()
      .min(1, t('validation.driverBirthDateRequired'))
      .refine((val) => isNotFutureLocalDate(val), t('validation.dateNotFuture')),
    // Asia Insurance API hali ulanmagan bo'lsa forma bu maydonni ko'rsatmaydi
    // — shuning uchun ixtiyoriy.
    relativeId: z.number().optional(),
  });
}

// O'zbekiston pasporti "2 lotin harfi + 7 raqam" formatida bo'ladi, lekin chet
// el fuqarolarining pasportlari bu formatga umuman to'g'ri kelmaydi — shuning
// uchun norezident arizalar uchun bu maydonlar erkinroq (istalgan alfanumerik
// qiymat) qabul qilinadi.
//
// requireLicense — mashinaning o'zi xorijda ro'yxatdan o'tganda (Apex_Box)
// haqiqatan ham kerak; O'zbekiston mashinalarida Asia Insurance'ning
// osago_v3 /save-policy'sida guvohnoma maydoni umuman yo'q. Bu isForeign'dan
// mustaqil — isForeign arizachining fuqaroligiga, requireLicense esa
// mashinaning ro'yxatdan o'tgan davlatiga bog'liq.
export function getDriverSchema(isForeign: boolean, requireLicense: boolean, t: Translator) {
  return getDriverBaseSchema(t).extend({
    passportSeries: isForeign
      ? z.string().min(1, t('validation.passportCodeRequired')).max(10, t('validation.maxLength10'))
      : z
          .string()
          .toUpperCase()
          .regex(passportSeriesRegex, t('validation.passportSeriesFormat')),
    passportNumber: isForeign
      ? z.string().min(3, t('validation.passportNumberRequired')).max(20, t('validation.maxLength20'))
      : z.string().regex(passportNumberRegex, t('validation.passportNumberFormat')),
    licenseNumber: requireLicense
      ? z.string().min(1, t('validation.licenseNumberRequired'))
      : z.string().optional(),
    licenseIssueDate: requireLicense
      ? z
          .string()
          .min(1, t('validation.licenseIssueDateRequired'))
          .refine((val) => isNotFutureLocalDate(val), t('validation.dateNotFuture'))
      : z
          .string()
          .optional()
          .refine((val) => !val || isNotFutureLocalDate(val), t('validation.dateNotFuture')),
  });
}
export type DriverFormData = z.infer<ReturnType<typeof getDriverSchema>>;

// Validates each driver row only when driverRestriction === 'cheklangan' —
// when 'cheklanmagan', a leftover/half-filled row from a previous toggle
// (append(emptyDriver) on the way in, never removed on the way back out;
// see driver-restriction/page.tsx) must not block submission, since its
// content is irrelevant once the policy applies to any driver. Using
// z.custom<DriverFormData>() at the array level (rather than
// z.array(getDriverSchema(...))) means each item is never eagerly
// validated against the full driver schema — it only shapes the inferred
// TS type for react-hook-form/zodResolver. superRefine below opts back
// into full per-item validation only in the 'cheklangan' branch.
export function getDriverRestrictionSchema(isForeign: boolean, requireLicense: boolean, t: Translator) {
  const driverSchema = getDriverSchema(isForeign, requireLicense, t);
  return z
    .object({
      driverRestriction: z.enum(['cheklangan', 'cheklanmagan']),
      drivers: z.array(z.custom<DriverFormData>()),
    })
    .superRefine((data, ctx) => {
      if (data.driverRestriction !== 'cheklangan') return;
      if (data.drivers.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('validation.atLeastOneDriverRequired'),
          path: ['drivers'],
        });
        return;
      }
      data.drivers.forEach((driver, index) => {
        const result = driverSchema.safeParse(driver);
        if (!result.success) {
          for (const issue of result.error.issues) {
            ctx.addIssue({ ...issue, path: ['drivers', index, ...issue.path] });
          }
        }
      });
    });
}
export type DriverRestrictionFormData = z.infer<ReturnType<typeof getDriverRestrictionSchema>>;

// Passport+tug'ilgan sana — sug'urta kompaniyasi tomonidan "sug'urta oluvchi"
// sifatida talab qilinadi. Hozircha ixtiyoriy: OSAGO'ni rasman ro'yxatga
// olish integratsiyasi hali ulanmagan, lekin ma'lumot oldindan yig'ib
// qo'yilsa, ulanganda foydalanuvchi qayta so'ralmaydi.
export function getUpdateProfileSchema(t: Translator) {
  return z.object({
    fullName: z.string().min(3, t('validation.fullNameRequired')),
    phone: z
      .string()
      .optional()
      .refine((val) => !val || phoneRegex.test(val), {
        message: t('validation.phoneFormat'),
      }),
    passportSeries: z.string().max(10, t('validation.maxLength10')).optional().or(z.literal('')),
    passportNumber: z.string().max(20, t('validation.maxLength20')).optional().or(z.literal('')),
    birthDate: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((val) => !val || isNotFutureLocalDate(val), t('validation.dateNotFuture')),
  });
}
export type UpdateProfileFormData = z.infer<ReturnType<typeof getUpdateProfileSchema>>;

// Joriy parol faqat foydalanuvchida allaqachon parol o'rnatilgan bo'lsagina
// majburiy (masalan, Google orqali ro'yxatdan o'tgan va hali parol
// o'rnatmagan foydalanuvchi uchun bu maydon ko'rsatilmaydi ham).
export function getChangePasswordSchema(requireCurrentPassword: boolean, t: Translator) {
  return z
    .object({
      currentPassword: requireCurrentPassword
        ? z.string().min(1, t('validation.currentPasswordRequired'))
        : z.string().optional(),
      newPassword: z.string().min(6, t('validation.passwordMinLength')),
      confirmNewPassword: z.string().min(1, t('validation.confirmPasswordRequired')),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: t('validation.passwordsMismatch'),
      path: ['confirmNewPassword'],
    });
}
export type ChangePasswordFormData = z.infer<ReturnType<typeof getChangePasswordSchema>>;
