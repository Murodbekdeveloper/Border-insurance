'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DriverRestrictionFormData, getDriverRestrictionSchema } from '@/lib/validation/schemas';
import { maskAlnumUpper, maskDigits, maskLetters, maskLettersStrict } from '@/lib/masks';
import { todayLocalDateString } from '@/lib/utils';
import { createPolicy } from '@/lib/api/policies';
import { extractDriverLicense, OcrNotConfiguredError } from '@/lib/api/ocr';
import { getRelatives, InsurancePartnerNotConfiguredError, RelativeOption } from '@/lib/api/insurancePartner';
import { getApexBoxRelatives, ApexBoxNotConfiguredError } from '@/lib/api/apexBox';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { localizedName } from '@/lib/i18n/multiLang';
import { useAuthStore } from '@/store/authStore';
import { MAX_DRIVERS, useApplicationStore } from '@/store/applicationStore';
import { toast } from '@/store/toastStore';
import { AuthGuard } from '@/components/AuthGuard';
import { WizardShell } from '@/components/WizardShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { Button } from '@/components/ui/Button';
import { ImageUploadCard } from '@/components/ui/ImageUploadCard';

const emptyDriver = {
  fullName: '',
  birthDate: '',
  passportSeries: '',
  passportNumber: '',
  licenseNumber: '',
  licenseIssueDate: '',
  relativeId: undefined,
};

function DriverRestrictionContent() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { vehicle, vehicleId, residentType, driverRestriction, drivers, setDriverRestriction, setPolicy } = useApplicationStore();
  // Chet el fuqarosining pasporti O'zbekiston pasporti formatiga (2 harf + 7 raqam)
  // to'g'ri kelmaydi, shuning uchun norezidentlar uchun bu maydonlar erkinroq bo'ladi.
  const isForeign = residentType === 'non_resident';
  // Mashinaning o'zi xorijda ro'yxatdan o'tganda (Apex_Box) haydovchilik
  // guvohnomasi haqiqatan ham kerak; O'zbekiston mashinalarida Asia
  // Insurance'ning osago_v3'ida bunday maydon umuman yo'q — bu isForeign'dan
  // mustaqil (arizachi rezidentligi emas, mashinaning davlati).
  const isForeignVehicle = vehicle?.registrationCountry === 'Xorij';
  const requireLicense = isForeignVehicle;

  useEffect(() => {
    if (!vehicleId) {
      router.replace('/vehicle-info');
    }
  }, [vehicleId, router]);

  // Xorijda ro'yxatdan o'tgan mashina Apex_Box orqali yuboriladi, uning
  // qarindoshlik ro'yxati (sp_id) osago_v3'ning /get-relative'idan butunlay
  // boshqa raqamlash tizimi — shuning uchun har biri o'z hamkoriga mos
  // ro'yxatdan tanlanishi kerak (apex-box.service.ts'ning
  // buildCreatePolicyRequest'iga qarang), aks holda noto'g'ri qarindoshlik
  // qiymati yuborilib qoladi. Hamkor API kaliti hali sozlanmagan bo'lsa
  // (INSURANCE_PARTNER_NOT_CONFIGURED/APEX_BOX_NOT_CONFIGURED), bu ro'yxat
  // bo'sh qoladi va tanlov maydoni butunlay ko'rsatilmaydi — OCR
  // ulanmaganda ImageUploadCard tutgan yo'l bilan bir xil.
  const [relativeOptions, setRelativeOptions] = useState<RelativeOption[]>([]);
  useEffect(() => {
    const request = isForeignVehicle ? getApexBoxRelatives() : getRelatives();
    request
      .then(setRelativeOptions)
      .catch((err) => {
        if (
          !(err instanceof InsurancePartnerNotConfiguredError) &&
          !(err instanceof ApexBoxNotConfiguredError)
        ) {
          toast.error(t('driverRestriction.relativesError'));
        }
      });
  }, [t, isForeignVehicle]);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DriverRestrictionFormData>({
    resolver: zodResolver(getDriverRestrictionSchema(isForeign, requireLicense, t)),
    defaultValues: {
      driverRestriction: driverRestriction ?? 'cheklanmagan',
      drivers: drivers.length > 0 ? drivers : [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'drivers' });
  const restriction = watch('driverRestriction');

  // Same handler for both the passport and the license upload cards below —
  // a driver's passport and driving license are two separate physical
  // documents, but Gemini only fills in whichever fields are actually
  // visible on the photo it's given, so one field list covering both is
  // safe to reuse for either upload.
  const handleExtractDriverDocument = async (files: File[], index: number) => {
    try {
      const fields = await extractDriverLicense(files);
      const known: (keyof DriverRestrictionFormData['drivers'][number])[] = [
        'fullName',
        'birthDate',
        'passportSeries',
        'passportNumber',
        'licenseNumber',
        'licenseIssueDate',
      ];
      let applied = 0;
      for (const key of known) {
        const value = fields[key as keyof typeof fields];
        if (value) {
          setValue(`drivers.${index}.${key}`, value, { shouldValidate: true, shouldDirty: true });
          applied += 1;
        }
      }
      if (applied === 0) {
        return { status: 'error' as const, message: t('driverRestriction.ocrNoDataError') };
      }
      return { status: 'success' as const, message: t('driverRestriction.ocrSuccess') };
    } catch (err) {
      if (err instanceof OcrNotConfiguredError) {
        return {
          status: 'not_configured' as const,
          message: t('driverRestriction.ocrNotConfigured'),
        };
      }
      return { status: 'error' as const, message: t('driverRestriction.ocrError') };
    }
  };

  const onSubmit = async (data: DriverRestrictionFormData) => {
    if (!user || !vehicleId) return;
    const finalDrivers = data.driverRestriction === 'cheklangan' ? data.drivers : [];
    try {
      const policy = await createPolicy({
        vehicleId,
        driverRestriction: data.driverRestriction,
        drivers: finalDrivers,
        foreignPolicyDurationId: vehicle?.foreignPolicyDurationId,
        periodId: vehicle?.periodId ? Number(vehicle.periodId) : undefined,
      });
      setDriverRestriction(data.driverRestriction, finalDrivers);
      setPolicy(policy.id);
      router.push('/payment');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('driverRestriction.saveError'));
    }
  };

  return (
    <WizardShell currentStep={2} title={t('driverRestriction.title')} subtitle={t('driverRestriction.subtitle')} wide>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="max-w-sm">
          <Controller
            control={control}
            name="driverRestriction"
            render={({ field }) => (
              <ToggleSwitch
                label={t('driverRestriction.countLabel')}
                value={field.value}
                onChange={(val) => {
                  field.onChange(val);
                  if (val === 'cheklangan' && fields.length === 0) {
                    append(emptyDriver);
                  }
                }}
                options={[
                  { value: 'cheklangan', label: t('driverRestriction.restricted') },
                  { value: 'cheklanmagan', label: t('driverRestriction.unrestricted') },
                ]}
              />
            )}
          />
        </div>

        {restriction === 'cheklanmagan' && (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
            {t('driverRestriction.unrestrictedNote')}
          </p>
        )}

        {restriction === 'cheklangan' && (
          <div className="flex flex-col gap-5">
            {errors.drivers?.message && <p className="text-sm text-red-600">{errors.drivers.message}</p>}
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                      {index + 1}
                    </span>
                    {t('driverRestriction.driverLabel')}
                  </span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      {t('driverRestriction.remove')}
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ImageUploadCard
                    label={t('driverRestriction.passportImageLabel')}
                    description={t('driverRestriction.passportImageDescription')}
                    onExtract={(files) => handleExtractDriverDocument(files, index)}
                  />
                  <ImageUploadCard
                    label={t('driverRestriction.licenseImageLabel')}
                    description={t('driverRestriction.licenseImageDescription')}
                    onExtract={(files) => handleExtractDriverDocument(files, index)}
                  />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Input
                    label={t('driverRestriction.fullName')}
                    placeholder={t('driverRestriction.fullNamePlaceholder')}
                    error={errors.drivers?.[index]?.fullName?.message}
                    {...register(`drivers.${index}.fullName`)}
                    onChange={(e) => setValue(`drivers.${index}.fullName`, maskLetters(e.target.value, 60), { shouldValidate: true, shouldDirty: true })}
                  />
                  <Input
                    label={t('driverRestriction.birthDate')}
                    type="date"
                    max={todayLocalDateString()}
                    error={errors.drivers?.[index]?.birthDate?.message}
                    {...register(`drivers.${index}.birthDate`)}
                  />
                  <Input
                    label={t('driverRestriction.passportSeries')}
                    placeholder={isForeign ? t('driverRestriction.passportSeriesForeignPlaceholder') : 'AA'}
                    error={errors.drivers?.[index]?.passportSeries?.message}
                    {...register(`drivers.${index}.passportSeries`)}
                    onChange={(e) =>
                      setValue(
                        `drivers.${index}.passportSeries`,
                        isForeign ? maskAlnumUpper(e.target.value, 10) : maskLettersStrict(e.target.value, 2),
                        { shouldValidate: true, shouldDirty: true },
                      )
                    }
                  />
                  <Input
                    label={t('driverRestriction.passportNumber')}
                    placeholder={isForeign ? t('driverRestriction.passportNumberForeignPlaceholder') : '1234567'}
                    inputMode={isForeign ? 'text' : 'numeric'}
                    error={errors.drivers?.[index]?.passportNumber?.message}
                    {...register(`drivers.${index}.passportNumber`)}
                    onChange={(e) =>
                      setValue(
                        `drivers.${index}.passportNumber`,
                        isForeign ? maskAlnumUpper(e.target.value, 20) : maskDigits(e.target.value, 7),
                        { shouldValidate: true, shouldDirty: true },
                      )
                    }
                  />
                  <Input
                    label={requireLicense ? t('driverRestriction.licenseNumber') : t('driverRestriction.licenseNumberOptional')}
                    error={errors.drivers?.[index]?.licenseNumber?.message}
                    {...register(`drivers.${index}.licenseNumber`)}
                    onChange={(e) => setValue(`drivers.${index}.licenseNumber`, maskAlnumUpper(e.target.value, 12), { shouldValidate: true, shouldDirty: true })}
                  />
                  <Input
                    label={requireLicense ? t('driverRestriction.licenseIssueDate') : t('driverRestriction.licenseIssueDateOptional')}
                    type="date"
                    max={todayLocalDateString()}
                    error={errors.drivers?.[index]?.licenseIssueDate?.message}
                    {...register(`drivers.${index}.licenseIssueDate`)}
                  />
                  {relativeOptions.length > 0 && (
                    <Select
                      label={t('driverRestriction.relativeLabel')}
                      options={relativeOptions.map((r) => ({ value: String(r.relative), label: localizedName(r, locale) }))}
                      placeholder={t('common.select')}
                      error={errors.drivers?.[index]?.relativeId?.message}
                      {...register(`drivers.${index}.relativeId`, {
                        setValueAs: (v) => (v === '' ? undefined : Number(v)),
                      })}
                    />
                  )}
                </div>
              </div>
            ))}

            {fields.length < MAX_DRIVERS && (
              <Button type="button" variant="outline" onClick={() => append(emptyDriver)}>
                {t('driverRestriction.addDriver')}
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={() => router.push('/vehicle-info')}>
            {t('common.back')}
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} className="sm:px-10">
            {t('driverRestriction.next')}
          </Button>
        </div>
      </form>
    </WizardShell>
  );
}

export default function DriverRestrictionPage() {
  return (
    <AuthGuard>
      <DriverRestrictionContent />
    </AuthGuard>
  );
}
