'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { VehicleFormData, getVehicleSchema } from '@/lib/validation/schemas';
import { CITIES, VEHICLE_TYPES } from '@/lib/constants';
import { getVehicleDefaultsForModel, getWeightCategoryForVehicleType } from '@/lib/carModels';
import { maskAlnumUpper, maskDigits, maskPhoneUZ, maskPlateNumber, maskYear } from '@/lib/masks';
import { todayLocalDateString } from '@/lib/utils';
import { createVehicle, lookupVehicle } from '@/lib/api/vehicles';
import { extractVehicleDocument, OcrNotConfiguredError } from '@/lib/api/ocr';
import { getCountries, getForeignVehicleDurations, ApexBoxReferenceOption } from '@/lib/api/apexBox';
import { getPeriods, PeriodOption } from '@/lib/api/insurancePartner';
import { localizedName, localizedSearchText } from '@/lib/i18n/multiLang';
import { updateCitizenship } from '@/lib/api/auth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAuthStore } from '@/store/authStore';
import { useApplicationStore } from '@/store/applicationStore';
import { toast } from '@/store/toastStore';
import { AuthGuard } from '@/components/AuthGuard';
import { WizardShell } from '@/components/WizardShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { BrandModelFields } from '@/components/ui/BrandModelFields';
import { Button } from '@/components/ui/Button';
import { ImageUploadCard } from '@/components/ui/ImageUploadCard';

const cityOptions = CITIES.map((c) => ({ value: c, label: c }));

function VehicleInfoContent() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { vehicle, residentType, setVehicle } = useApplicationStore();

  useEffect(() => {
    if (!residentType) {
      router.replace('/resident-type');
    }
  }, [residentType, router]);

  const [showValidationSummary, setShowValidationSummary] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(getVehicleSchema(t)),
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

  const [foreignDurations, setForeignDurations] = useState<ApexBoxReferenceOption[]>([]);
  const [foreignDurationsLoading, setForeignDurationsLoading] = useState(false);
  const [foreignDurationsError, setForeignDurationsError] = useState(false);
  const foreignDurationsLoadingRef = useRef(false);
  const loadForeignDurations = useCallback(() => {
    if (foreignDurationsLoadingRef.current) return;
    foreignDurationsLoadingRef.current = true;
    setForeignDurationsLoading(true);
    setForeignDurationsError(false);
    getForeignVehicleDurations()
      .then(setForeignDurations)
      .catch(() => {
        setForeignDurationsError(true);
        toast.error(t('vehicleInfo.durationsError'));
      })
      .finally(() => {
        foreignDurationsLoadingRef.current = false;
        setForeignDurationsLoading(false);
      });
  }, [t]);
  useEffect(() => {
    if (!isForeign || foreignDurations.length > 0) return;
    loadForeignDurations();
  }, [isForeign, foreignDurations.length, loadForeignDurations]);

  // registrationCountry "Xorij"dan qaytarilganda tanlangan muddat endi
  // ma'noga ega emas — tozalamasak, keyinroq (driver-restriction orqali)
  // O'zbekistonda ro'yxatdan o'tgan mashina uchun eski foreignPolicyDurationId
  // qiymati polisga biriktirilib qolishi mumkin edi.
  useEffect(() => {
    if (isForeign) return;
    setValue('foreignPolicyDurationId', undefined, { shouldValidate: true });
  }, [isForeign, setValue]);

  // O'zbekistonda ro'yxatdan o'tgan mashinalar uchun sug'urta muddati —
  // yuqoridagi foreignPolicyDurationId'ning oynali juftlashuvi, faqat UZ
  // uchun (GET /insurance-partner/periods, osago_v3'ning /get-period'i).
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [periodsError, setPeriodsError] = useState(false);
  const periodsLoadingRef = useRef(false);
  const loadPeriods = useCallback(() => {
    if (periodsLoadingRef.current) return;
    periodsLoadingRef.current = true;
    setPeriodsLoading(true);
    setPeriodsError(false);
    getPeriods()
      .then(setPeriods)
      .catch(() => {
        setPeriodsError(true);
        toast.error(t('vehicleInfo.durationsError'));
      })
      .finally(() => {
        periodsLoadingRef.current = false;
        setPeriodsLoading(false);
      });
  }, [t]);
  useEffect(() => {
    if (isForeign || periods.length > 0) return;
    loadPeriods();
  }, [isForeign, periods.length, loadPeriods]);

  useEffect(() => {
    if (!isForeign) return;
    setValue('periodId', undefined, { shouldValidate: true });
  }, [isForeign, setValue]);

  // Apex_Box orqali yuboriladigan har qanday xorijiy transport (rezident
  // bo'lsa ham — bu maydon residentType'dan mustaqil, yuqoridagi izohga
  // qarang) arizachining fuqaroligini talab qiladi. Norezidentlar buni
  // odatda /resident-type sahifasida allaqachon tanlagan bo'ladi, lekin
  // xorijiy mashinaga ega rezidentlar uchun bu yagona joy — shuning uchun
  // profilida hali yo'q bo'lsa, shu yerda so'raymiz.
  const needsCitizenship = isForeign && !user?.citizenshipId;
  const [citizenshipId, setCitizenshipId] = useState('');
  const [countries, setCountries] = useState<ApexBoxReferenceOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState(false);
  const countriesLoadingRef = useRef(false);
  const loadCountries = useCallback(() => {
    if (countriesLoadingRef.current) return;
    countriesLoadingRef.current = true;
    setCountriesLoading(true);
    setCountriesError(false);
    getCountries()
      .then(setCountries)
      .catch(() => {
        setCountriesError(true);
        toast.error(t('vehicleInfo.countriesError'));
      })
      .finally(() => {
        countriesLoadingRef.current = false;
        setCountriesLoading(false);
      });
  }, [t]);
  useEffect(() => {
    if (!needsCitizenship || countries.length > 0) return;
    loadCountries();
  }, [needsCitizenship, countries.length, loadCountries]);

  // Davlat raqami + texpasport seriyasi/raqami to'liq kiritilgach, qolgan
  // transport ma'lumotlarini (model, yili, kuzov/dvigatel raqami) Asia
  // Insurance'dan avtomatik tortib olamiz — xorijda ro'yxatdan o'tgan
  // transport vositalari ularning bazasida bo'lmaydi, shuning uchun faqat
  // UZ'da ro'yxatdan o'tgan mashinalar uchun ishlaydi.
  const plateNumberValue = watch('plateNumber');
  const techPassportSeriesValue = watch('techPassportSeries');
  const techPassportNumberValue = watch('techPassportNumber');
  const [isLookingUpVehicle, setIsLookingUpVehicle] = useState(false);
  // Last successfully-looked-up combo — only set on success, so a failed
  // lookup can still be retried by re-triggering the same values.
  const lookedUpKeyRef = useRef<string | null>(null);
  // Separately tracks a combo currently in flight, so a re-render before
  // that request resolves (e.g. switching the UI language, which no
  // longer re-runs this effect itself but can still happen for other
  // reasons) can't fire a second concurrent lookup for the same combo.
  const lookupInFlightRef = useRef<string | null>(null);
  // Always-current translator, read inside the debounced callback without
  // making the effect depend on `t` — switching the UI language shouldn't
  // restart the 600ms debounce or affect an in-flight lookup.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    if (isForeign) return;
    if (!plateNumberValue || plateNumberValue.length < 5) return;
    if (!techPassportSeriesValue || techPassportSeriesValue.length < 2) return;
    if (!techPassportNumberValue || techPassportNumberValue.length < 4) return;

    const key = `${plateNumberValue}|${techPassportSeriesValue}|${techPassportNumberValue}`;
    if (lookedUpKeyRef.current === key) return;

    const timer = setTimeout(() => {
      if (lookupInFlightRef.current === key) return;
      lookupInFlightRef.current = key;
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
            toast.success(tRef.current('vehicleInfo.vehicleInfoFoundToast'));
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : tRef.current('vehicleInfo.vehicleInfoFetchError'));
        } finally {
          if (lookupInFlightRef.current === key) lookupInFlightRef.current = null;
          setIsLookingUpVehicle(false);
        }
      })();
    }, 600);

    return () => clearTimeout(timer);
  }, [isForeign, plateNumberValue, techPassportSeriesValue, techPassportNumberValue, setValue]);

  const onSubmit = async (data: VehicleFormData) => {
    if (!user) return;
    if (needsCitizenship && !citizenshipId) {
      setShowValidationSummary(true);
      toast.error(t('vehicleInfo.citizenshipRequired'));
      return;
    }
    try {
      if (needsCitizenship) {
        const updatedUser = await updateCitizenship(citizenshipId);
        updateUser(updatedUser);
      }
      const created = await createVehicle(data);
      setVehicle(data, created.id);
      router.push('/driver-restriction');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('vehicleInfo.saveError'));
    }
  };

  const onInvalid = () => {
    setShowValidationSummary(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validationMessages = [
    ...Object.values(errors).map((e) => e?.message).filter((m): m is string => Boolean(m)),
    ...(needsCitizenship && !citizenshipId ? [t('vehicleInfo.citizenshipRequired')] : []),
  ];

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
        return { status: 'error' as const, message: t('vehicleInfo.ocrNoDataError') };
      }
      return { status: 'success' as const, message: t('vehicleInfo.ocrSuccess') };
    } catch (err) {
      if (err instanceof OcrNotConfiguredError) {
        return {
          status: 'not_configured' as const,
          message: t('vehicleInfo.ocrNotConfigured'),
        };
      }
      return { status: 'error' as const, message: t('vehicleInfo.ocrError') };
    }
  };

  return (
    <WizardShell currentStep={1} title={t('vehicleInfo.title')} subtitle={t('vehicleInfo.subtitle')} wide>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-5">
        {showValidationSummary && validationMessages.length > 0 && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {t('vehicleInfo.formErrorsTitle')}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-600 dark:text-red-400">
              {validationMessages.map((message, i) => (
                <li key={i}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <ImageUploadCard
          label={t('vehicleInfo.ocrLabel')}
          description={t('vehicleInfo.ocrDescription')}
          onExtract={handleExtractDocument}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Controller
            control={control}
            name="weightCategory"
            render={({ field }) => (
              <ToggleSwitch
                label={t('vehicleInfo.weightCategory')}
                value={field.value ?? null}
                onChange={field.onChange}
                error={errors.weightCategory?.message}
                options={[
                  { value: 'og\'ir', label: t('vehicleInfo.weightHeavy') },
                  { value: 'yengil', label: t('vehicleInfo.weightLight') },
                ]}
              />
            )}
          />

          <Controller
            control={control}
            name="registrationCountry"
            render={({ field }) => (
              <ToggleSwitch
                label={t('vehicleInfo.registrationCountry')}
                value={field.value ?? null}
                onChange={field.onChange}
                error={errors.registrationCountry?.message}
                options={[
                  { value: 'UZ', label: 'UZ' },
                  { value: 'Xorij', label: t('vehicleInfo.foreignLabel') },
                ]}
              />
            )}
          />
        </div>

        <Input
          label={t('vehicleInfo.plateNumber')}
          placeholder="01 A 123 AA"
          error={errors.plateNumber?.message}
          {...register('plateNumber')}
          onChange={(e) => setValue('plateNumber', maskPlateNumber(e.target.value), { shouldValidate: true, shouldDirty: true })}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label={t('vehicleInfo.techPassportSeries')}
            placeholder="AAB"
            error={errors.techPassportSeries?.message}
            {...register('techPassportSeries')}
            onChange={(e) => setValue('techPassportSeries', maskAlnumUpper(e.target.value, 4), { shouldValidate: true, shouldDirty: true })}
          />
          <Input
            label={t('vehicleInfo.techPassportNumber')}
            placeholder="1234567"
            inputMode="numeric"
            error={errors.techPassportNumber?.message}
            {...register('techPassportNumber')}
            onChange={(e) => setValue('techPassportNumber', maskDigits(e.target.value, 7), { shouldValidate: true, shouldDirty: true })}
          />
        </div>
        {isLookingUpVehicle && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('vehicleInfo.lookingUpVehicle')}
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Select
            label={t('vehicleInfo.vehicleTypeLabel')}
            options={VEHICLE_TYPES.map((v) => ({ value: v.value, label: t(v.labelKey) }))}
            placeholder={t('vehicleInfo.vehicleTypePlaceholder')}
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
            label={t('vehicleInfo.techPassportIssueDate')}
            type="date"
            max={todayLocalDateString()}
            error={errors.techPassportIssueDate?.message}
            {...register('techPassportIssueDate')}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label={t('vehicleInfo.manufactureYear')}
            inputMode="numeric"
            placeholder="2020"
            error={errors.manufactureYear?.message}
            {...register('manufactureYear')}
            onChange={(e) => setValue('manufactureYear', maskYear(e.target.value), { shouldValidate: true, shouldDirty: true })}
          />
          <Input
            label={t('vehicleInfo.bodyNumber')}
            placeholder={t('vehicleInfo.bodyNumberPlaceholder')}
            error={errors.bodyNumber?.message}
            {...register('bodyNumber')}
            onChange={(e) => setValue('bodyNumber', maskAlnumUpper(e.target.value, 17), { shouldValidate: true, shouldDirty: true })}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label={t('vehicleInfo.engineNumber')}
            placeholder={t('vehicleInfo.engineNumber')}
            error={errors.engineNumber?.message}
            {...register('engineNumber')}
            onChange={(e) => setValue('engineNumber', maskAlnumUpper(e.target.value, 17), { shouldValidate: true, shouldDirty: true })}
          />
          {isForeign ? (
            <Input
              label={t('vehicleInfo.cityForeignLabel')}
              placeholder={t('vehicleInfo.cityForeignPlaceholder')}
              error={errors.city?.message}
              {...register('city')}
            />
          ) : (
            <Select
              label={t('vehicleInfo.cityLabel')}
              options={cityOptions}
              placeholder={t('vehicleInfo.cityPlaceholder')}
              error={errors.city?.message}
              {...register('city')}
            />
          )}
        </div>

        {isForeign && (
          foreignDurationsError && foreignDurations.length === 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-red-200 p-4 dark:border-red-900/40">
              <p className="text-sm text-red-600">
                {t('vehicleInfo.durationsError')}
              </p>
              <Button type="button" variant="outline" isLoading={foreignDurationsLoading} onClick={loadForeignDurations}>
                {t('common.retry')}
              </Button>
            </div>
          ) : (
            <Select
              label={t('vehicleInfo.durationLabel')}
              options={foreignDurations.map((d) => ({ value: String(d.id), label: localizedName(d, locale) }))}
              placeholder={foreignDurationsLoading ? t('common.loading') : t('vehicleInfo.durationPlaceholder')}
              disabled={foreignDurationsLoading}
              error={errors.foreignPolicyDurationId?.message}
              {...register('foreignPolicyDurationId')}
            />
          )
        )}

        {!isForeign && (
          periodsError && periods.length === 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-red-200 p-4 dark:border-red-900/40">
              <p className="text-sm text-red-600">
                {t('vehicleInfo.durationsError')}
              </p>
              <Button type="button" variant="outline" isLoading={periodsLoading} onClick={loadPeriods}>
                {t('common.retry')}
              </Button>
            </div>
          ) : (
            <Select
              label={t('vehicleInfo.durationLabel')}
              options={periods.map((p) => ({ value: String(p.period), label: localizedName(p, locale) }))}
              placeholder={periodsLoading ? t('common.loading') : t('vehicleInfo.durationPlaceholder')}
              disabled={periodsLoading}
              error={errors.periodId?.message}
              {...register('periodId')}
            />
          )
        )}

        {needsCitizenship && (
          countriesError && countries.length === 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-red-200 p-4 dark:border-red-900/40">
              <p className="text-sm text-red-600">
                {t('vehicleInfo.countriesError')}
              </p>
              <Button type="button" variant="outline" isLoading={countriesLoading} onClick={loadCountries}>
                {t('common.retry')}
              </Button>
            </div>
          ) : (
            <SearchableSelect
              label={t('vehicleInfo.citizenshipLabel')}
              options={countries.map((c) => ({
                value: String(c.id),
                // Each country shown in its own national language (e.g.
                // "O‘zbekiston") rather than translated into the active UI
                // language — see ApexBoxReferenceOption's nameNative comment.
                label: c.nameNative ?? localizedName(c, locale),
                searchText: `${localizedSearchText(c)} ${c.nameNative ?? ''}`.trim(),
              }))}
              placeholder={countriesLoading ? t('common.loading') : t('vehicleInfo.citizenshipPlaceholder')}
              disabled={countriesLoading}
              value={citizenshipId}
              onChange={setCitizenshipId}
            />
          )
        )}

        <Input
          label={t('vehicleInfo.phone')}
          placeholder="+998901234567"
          inputMode="numeric"
          error={errors.phone?.message}
          {...register('phone')}
          onChange={(e) => setValue('phone', maskPhoneUZ(e.target.value), { shouldValidate: true, shouldDirty: true })}
        />

        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-6">
          <Controller
            control={control}
            name="ownerIsApplicant"
            render={({ field }) => (
              <ToggleSwitch
                label={t('vehicleInfo.ownerSectionLabel')}
                value={field.value ? 'ha' : 'yoq'}
                onChange={(val) => field.onChange(val === 'ha')}
                options={[
                  { value: 'ha', label: t('vehicleInfo.ownerIsApplicant') },
                  { value: 'yoq', label: t('vehicleInfo.ownerIsOther') },
                ]}
              />
            )}
          />

          {!ownerIsApplicant && (
            <div className="mt-5 flex flex-col gap-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('vehicleInfo.ownerDataNote')}
              </p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label={t('vehicleInfo.ownerPassportSeries')}
                  placeholder="AB"
                  error={errors.ownerPassportSeries?.message}
                  {...register('ownerPassportSeries')}
                />
                <Input
                  label={t('vehicleInfo.ownerPassportNumber')}
                  placeholder="1234567"
                  error={errors.ownerPassportNumber?.message}
                  {...register('ownerPassportNumber')}
                />
              </div>
              <Input
                label={t('vehicleInfo.ownerBirthDate')}
                type="date"
                max={todayLocalDateString()}
                error={errors.ownerBirthDate?.message}
                {...register('ownerBirthDate')}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={() => router.push('/resident-type')}>
            {t('common.back')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="sm:px-10"
          >
            {t('vehicleInfo.next')}
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
