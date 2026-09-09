'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { VehicleFormData, vehicleSchema } from '@/lib/validation/schemas';
import { CITIES, VEHICLE_TYPES } from '@/lib/constants';
import { getVehicleDefaultsForModel, getWeightCategoryForVehicleType } from '@/lib/carModels';
import { maskAlnumUpper, maskDigits, maskPhoneUZ, maskPlateNumber, maskYear } from '@/lib/masks';
import { createVehicle, lookupVehicle } from '@/lib/api/vehicles';
import { extractVehicleDocument, OcrNotConfiguredError } from '@/lib/api/ocr';
import { useAuthStore } from '@/store/authStore';
import { useApplicationStore } from '@/store/applicationStore';
import { toast } from '@/store/toastStore';
import { AuthGuard } from '@/components/AuthGuard';
import { WizardShell } from '@/components/WizardShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { BrandModelFields } from '@/components/ui/BrandModelFields';
import { Button } from '@/components/ui/Button';
import { ImageUploadCard } from '@/components/ui/ImageUploadCard';

const cityOptions = CITIES.map((c) => ({ value: c, label: c }));

function VehicleInfoContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { vehicle, residentType, setVehicle } = useApplicationStore();

  useEffect(() => {
    if (!residentType) {
      router.replace('/resident-type');
    }
  }, [residentType, router]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    mode: 'onChange',
    defaultValues: vehicle ?? {
      weightCategory: 'yengil',
      registrationCountry: residentType === 'non_resident' ? 'Xorij' : 'UZ',
      phone: user?.phone && user.phone.startsWith('+998') ? user.phone : '+998',
      ownerIsApplicant: true,
    },
  });

  const ownerIsApplicant = watch('ownerIsApplicant');

  // Mashinaning o'zi xorijda ro'yxatdan o'tganmi — shu forma ichidagi
  // registrationCountry maydonidan olinadi, arizachining shaxsiy rezidentlik
  // holatidan emas: rezident ham xorijiy mashinada yurishi, norezident ham
  // O'zbekistonda ro'yxatdan o'tgan mashinada yurishi mumkin — bu ikkisi
  // mustaqil holatlar. CITIES ro'yxati faqat O'zbekiston shaharlari/
  // viloyatlarini o'z ichiga oladi, shuning uchun xorijiy mashinalar uchun
  // "Shahar" maydoni erkin matn sifatida ko'rsatiladi.
  const registrationCountryValue = watch('registrationCountry');
  const isForeign = registrationCountryValue === 'Xorij';

  // Davlat raqami + texpasport seriyasi/raqami to'liq kiritilgach, qolgan
  // transport ma'lumotlarini (model, yili, kuzov/dvigatel raqami) Asia
  // Insurance'dan avtomatik tortib olamiz — xorijda ro'yxatdan o'tgan
  // transport vositalari ularning bazasida bo'lmaydi, shuning uchun faqat
  // UZ'da ro'yxatdan o'tgan mashinalar uchun ishlaydi.
  const plateNumberValue = watch('plateNumber');
  const techPassportSeriesValue = watch('techPassportSeries');
  const techPassportNumberValue = watch('techPassportNumber');
  const [isLookingUpVehicle, setIsLookingUpVehicle] = useState(false);
  const lookedUpKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (isForeign) return;
    if (!plateNumberValue || plateNumberValue.length < 5) return;
    if (!techPassportSeriesValue || techPassportSeriesValue.length < 2) return;
    if (!techPassportNumberValue || techPassportNumberValue.length < 4) return;

    const key = `${plateNumberValue}|${techPassportSeriesValue}|${techPassportNumberValue}`;
    if (lookedUpKeyRef.current === key) return;

    const timer = setTimeout(() => {
      void (async () => {
        setIsLookingUpVehicle(true);
        try {
          const result = await lookupVehicle(plateNumberValue, techPassportSeriesValue, techPassportNumberValue);
          lookedUpKeyRef.current = key;
          if (result) {
            setValue('model', result.model, { shouldValidate: true, shouldDirty: true });
            setValue('manufactureYear', String(result.manufactureYear), { shouldValidate: true, shouldDirty: true });
            setValue('bodyNumber', result.bodyNumber, { shouldValidate: true, shouldDirty: true });
            setValue('engineNumber', result.engineNumber, { shouldValidate: true, shouldDirty: true });
            const defaults = getVehicleDefaultsForModel(result.model);
            setValue('vehicleType', defaults.vehicleType, { shouldValidate: true, shouldDirty: true });
            setValue('weightCategory', defaults.weightCategory, { shouldValidate: true, shouldDirty: true });
            toast.success('Transport ma\'lumotlari avtomatik topildi va to\'ldirildi. Iltimos, tekshirib chiqing.');
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Transport ma\'lumotlarini olishda xatolik yuz berdi');
        } finally {
          setIsLookingUpVehicle(false);
        }
      })();
    }, 600);

    return () => clearTimeout(timer);
  }, [isForeign, plateNumberValue, techPassportSeriesValue, techPassportNumberValue, setValue]);

  const onSubmit = async (data: VehicleFormData) => {
    if (!user) return;
    try {
      const created = await createVehicle(data);
      setVehicle(data, created.id);
      router.push('/driver-restriction');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transport ma\'lumotlarini saqlashda xatolik yuz berdi');
    }
  };

  const handleExtractDocument = async (files: File[]) => {
    try {
      const fields = await extractVehicleDocument(files);
      const known: (keyof VehicleFormData)[] = [
        'plateNumber',
        'techPassportSeries',
        'techPassportNumber',
        'techPassportIssueDate',
      ];
      let applied = 0;
      for (const key of known) {
        const value = fields[key as keyof typeof fields];
        if (value) {
          setValue(key, value, { shouldValidate: true, shouldDirty: true });
          applied += 1;
        }
      }
      if (applied === 0) {
        return { status: 'error' as const, message: 'Rasmdan ma\'lumot aniqlanmadi. Iltimos, maydonlarni qo\'lda to\'ldiring.' };
      }
      return { status: 'success' as const, message: 'Ma\'lumotlar aniqlandi va tegishli maydonlarga to\'ldirildi. Iltimos, tekshirib chiqing.' };
    } catch (err) {
      if (err instanceof OcrNotConfiguredError) {
        return {
          status: 'not_configured' as const,
          message: 'Hujjatni avtomatik o\'qish xizmati hali ulanmagan. Hozircha ma\'lumotlarni pastdagi maydonlarga qo\'lda kiriting.',
        };
      }
      return { status: 'error' as const, message: 'Rasmni tahlil qilishda xatolik yuz berdi' };
    }
  };

  return (
    <WizardShell currentStep={1} title="Transport vositasi ma'lumotlari" subtitle="Avtomobilingiz haqida ma'lumotlarni to'ldiring" wide>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <ImageUploadCard
          label="Texpasport rasmi (ixtiyoriy)"
          description="Davlat raqami, texpasport seriya/raqami va berilgan sanani avtomatik to'ldirish uchun"
          onExtract={handleExtractDocument}
        />

        <div className="grid grid-cols-2 gap-5">
          <Controller
            control={control}
            name="weightCategory"
            render={({ field }) => (
              <ToggleSwitch
                label="Og'irlik toifasi"
                value={field.value ?? null}
                onChange={field.onChange}
                error={errors.weightCategory?.message}
                options={[
                  { value: 'og\'ir', label: 'Og\'ir' },
                  { value: 'yengil', label: 'Yengil' },
                ]}
              />
            )}
          />

          <Controller
            control={control}
            name="registrationCountry"
            render={({ field }) => (
              <ToggleSwitch
                label="Ro'yxatga olingan davlat"
                value={field.value ?? null}
                onChange={field.onChange}
                error={errors.registrationCountry?.message}
                options={[
                  { value: 'UZ', label: 'UZ' },
                  { value: 'Xorij', label: 'Xorij' },
                ]}
              />
            )}
          />
        </div>

        <Input
          label="Davlat raqami"
          placeholder="01 A 123 AA"
          error={errors.plateNumber?.message}
          {...register('plateNumber')}
          onChange={(e) => setValue('plateNumber', maskPlateNumber(e.target.value), { shouldValidate: true, shouldDirty: true })}
        />

        <div className="grid grid-cols-2 gap-5">
          <Input
            label="Texpasport seriyasi"
            placeholder="AAB"
            error={errors.techPassportSeries?.message}
            {...register('techPassportSeries')}
            onChange={(e) => setValue('techPassportSeries', maskAlnumUpper(e.target.value, 4), { shouldValidate: true, shouldDirty: true })}
          />
          <Input
            label="Texpasport raqami"
            placeholder="1234567"
            inputMode="numeric"
            error={errors.techPassportNumber?.message}
            {...register('techPassportNumber')}
            onChange={(e) => setValue('techPassportNumber', maskDigits(e.target.value, 7), { shouldValidate: true, shouldDirty: true })}
          />
        </div>
        {isLookingUpVehicle && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Transport ma&apos;lumotlari qidirilmoqda...
          </p>
        )}

        <div className="grid grid-cols-2 gap-5">
          <Controller
            control={control}
            name="model"
            render={({ field }) => (
              <BrandModelFields
                value={field.value ?? ''}
                onChange={(v) => {
                  field.onChange(v);
                  // Model asosida transport turi va og'irlik toifasini avtomatik
                  // to'ldiramiz — foydalanuvchi shu ma'lumotni ikki marta kiritmasin
                  // (mobil ilovadagi xatti-harakat bilan bir xil).
                  const defaults = getVehicleDefaultsForModel(v);
                  setValue('vehicleType', defaults.vehicleType, { shouldValidate: true, shouldDirty: true });
                  setValue('weightCategory', defaults.weightCategory, { shouldValidate: true, shouldDirty: true });
                }}
                onBlur={field.onBlur}
                error={errors.model?.message}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <Select
            label="Transport turi"
            options={VEHICLE_TYPES}
            placeholder="Transport turini tanlang"
            error={errors.vehicleType?.message}
            {...register('vehicleType', {
              onChange: (e) => {
                // Og'irlik toifasi alohida so'ralmaydi — transport turidan
                // to'g'ridan-to'g'ri kelib chiqadi (foydalanuvchi buni qo'lda
                // o'zgartirsa ham, model orqali qo'yilgan taxminiy qiymat yangi
                // tanlovga mos ravishda qayta hisoblanadi).
                setValue('weightCategory', getWeightCategoryForVehicleType(e.target.value), { shouldValidate: true, shouldDirty: true });
              },
            })}
          />
          <Input
            label="Texpasport berilgan sana"
            type="date"
            max={new Date().toISOString().split('T')[0]}
            error={errors.techPassportIssueDate?.message}
            {...register('techPassportIssueDate')}
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <Input
            label="Chiqarilgan yili"
            inputMode="numeric"
            placeholder="2020"
            error={errors.manufactureYear?.message}
            {...register('manufactureYear')}
            onChange={(e) => setValue('manufactureYear', maskYear(e.target.value), { shouldValidate: true, shouldDirty: true })}
          />
          <Input
            label="Kuzov raqami"
            placeholder="VIN / kuzov raqami"
            error={errors.bodyNumber?.message}
            {...register('bodyNumber')}
            onChange={(e) => setValue('bodyNumber', maskAlnumUpper(e.target.value, 17), { shouldValidate: true, shouldDirty: true })}
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <Input
            label="Dvigatel raqami"
            placeholder="Dvigatel raqami"
            error={errors.engineNumber?.message}
            {...register('engineNumber')}
            onChange={(e) => setValue('engineNumber', maskAlnumUpper(e.target.value, 17), { shouldValidate: true, shouldDirty: true })}
          />
          {isForeign ? (
            <Input
              label="Shahar"
              placeholder="Shahar nomini kiriting"
              error={errors.city?.message}
              {...register('city')}
            />
          ) : (
            <Select
              label="Shahar"
              options={cityOptions}
              placeholder="Shaharni tanlang"
              error={errors.city?.message}
              {...register('city')}
            />
          )}
        </div>

        <Input
          label="Telefon raqami"
          placeholder="+998901234567"
          inputMode="numeric"
          error={errors.phone?.message}
          {...register('phone')}
          onChange={(e) => setValue('phone', maskPhoneUZ(e.target.value), { shouldValidate: true, shouldDirty: true })}
        />

        <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
          <Controller
            control={control}
            name="ownerIsApplicant"
            render={({ field }) => (
              <ToggleSwitch
                label="Transport egasi"
                value={field.value ? 'ha' : 'yoq'}
                onChange={(val) => field.onChange(val === 'ha')}
                options={[
                  { value: 'ha', label: 'Men egasiman' },
                  { value: 'yoq', label: 'Boshqa shaxs' },
                ]}
              />
            )}
          />

          {!ownerIsApplicant && (
            <div className="mt-5 flex flex-col gap-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transport egasining pasport ma&apos;lumotlarini kiriting — sug&apos;urta kompaniyasi rasmiy polis uchun talab qiladi.
              </p>
              <div className="grid grid-cols-2 gap-5">
                <Input
                  label="Egasining pasport seriyasi"
                  placeholder="AB"
                  error={errors.ownerPassportSeries?.message}
                  {...register('ownerPassportSeries')}
                />
                <Input
                  label="Egasining pasport raqami"
                  placeholder="1234567"
                  error={errors.ownerPassportNumber?.message}
                  {...register('ownerPassportNumber')}
                />
              </div>
              <Input
                label="Egasining tug'ilgan sanasi"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                error={errors.ownerBirthDate?.message}
                {...register('ownerBirthDate')}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.push('/resident-type')}>
            Orqaga
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!isValid} className="px-10">
            Keyingisi
          </Button>
        </div>
      </form>
    </WizardShell>
  );
}

export default function VehicleInfoPage() {
  return (
    <AuthGuard>
      <VehicleInfoContent />
    </AuthGuard>
  );
}
