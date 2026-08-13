'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DriverRestrictionFormData, getDriverRestrictionSchema } from '@/lib/validation/schemas';
import { maskAlnumUpper, maskDigits, maskLetters, maskLettersStrict, maskYear } from '@/lib/masks';
import { createPolicy } from '@/lib/api/policies';
import { extractDriverLicense, OcrNotConfiguredError } from '@/lib/api/ocr';
import { getRelatives, InsurancePartnerNotConfiguredError, RelativeOption } from '@/lib/api/insurancePartner';
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
  drivingExperienceSince: '',
  relativeId: undefined,
};

function DriverRestrictionContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { vehicleId, residentType, driverRestriction, drivers, setDriverRestriction, setPolicy } = useApplicationStore();
  // Chet el fuqarosining pasporti O'zbekiston pasporti formatiga (2 harf + 7 raqam)
  // to'g'ri kelmaydi, shuning uchun norezidentlar uchun bu maydonlar erkinroq bo'ladi.
  const isForeign = residentType === 'non_resident';

  useEffect(() => {
    if (!vehicleId) {
      router.replace('/vehicle-info');
    }
  }, [vehicleId, router]);

  // Asia Insurance API kaliti hali sozlanmagan bo'lsa (INSURANCE_PARTNER_
  // NOT_CONFIGURED), bu ro'yxat bo'sh qoladi va tanlov maydoni butunlay
  // ko'rsatilmaydi — OCR ulanmaganda ImageUploadCard tutgan yo'l bilan bir xil.
  const [relativeOptions, setRelativeOptions] = useState<RelativeOption[]>([]);
  useEffect(() => {
    getRelatives()
      .then(setRelativeOptions)
      .catch((err) => {
        if (!(err instanceof InsurancePartnerNotConfiguredError)) {
          toast.error('Qarindoshlik darajalari ro\'yxatini olishda xatolik yuz berdi');
        }
      });
  }, []);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DriverRestrictionFormData>({
    resolver: zodResolver(getDriverRestrictionSchema(isForeign)),
    defaultValues: {
      driverRestriction: driverRestriction ?? 'cheklanmagan',
      drivers: drivers.length > 0 ? drivers : [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'drivers' });
  const restriction = watch('driverRestriction');

  const handleExtractLicense = async (file: File, index: number) => {
    try {
      const fields = await extractDriverLicense(file);
      const known: (keyof DriverRestrictionFormData['drivers'][number])[] = [
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
        return { status: 'error' as const, message: 'Rasmdan ma\'lumot aniqlanmadi. Iltimos, maydonlarni qo\'lda to\'ldiring.' };
      }
      return { status: 'success' as const, message: 'Ma\'lumotlar aniqlandi va tegishli maydonlarga to\'ldirildi. Iltimos, tekshirib chiqing.' };
    } catch (err) {
      if (err instanceof OcrNotConfiguredError) {
        return {
          status: 'not_configured' as const,
          message: 'Google Vision API hali ulanmagan. Hozircha ma\'lumotlarni pastdagi maydonlarga qo\'lda kiriting.',
        };
      }
      return { status: 'error' as const, message: 'Rasmni tahlil qilishda xatolik yuz berdi' };
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
      });
      setDriverRestriction(data.driverRestriction, finalDrivers);
      setPolicy(policy.id);
      router.push('/payment');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Arizani saqlashda xatolik yuz berdi');
    }
  };

  return (
    <WizardShell currentStep={2} title="Haydovchilar cheklovi" subtitle="Polis qaysi haydovchilarga tegishli ekanligini belgilang" wide>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="max-w-sm">
          <Controller
            control={control}
            name="driverRestriction"
            render={({ field }) => (
              <ToggleSwitch
                label="Haydovchilar soni cheklovi"
                value={field.value}
                onChange={(val) => {
                  field.onChange(val);
                  if (val === 'cheklangan' && fields.length === 0) {
                    append(emptyDriver);
                  }
                }}
                options={[
                  { value: 'cheklangan', label: 'Cheklangan' },
                  { value: 'cheklanmagan', label: 'Cheklanmagan' },
                ]}
              />
            )}
          />
        </div>

        {restriction === 'cheklanmagan' && (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
            Istalgan haydovchi ushbu polis bilan transport vositasini boshqarishi mumkin.
          </p>
        )}

        {restriction === 'cheklangan' && (
          <div className="flex flex-col gap-5">
            {errors.drivers?.message && <p className="text-sm text-red-600">{errors.drivers.message}</p>}
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                      {index + 1}
                    </span>
                    Haydovchi
                  </span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      O&apos;chirish
                    </button>
                  )}
                </div>

                <ImageUploadCard
                  label="Haydovchilik guvohnomasi rasmi (ixtiyoriy)"
                  description="Rasmni yuklang — Google Vision API ulanganda ma'lumotlar avtomatik to'ldiriladi"
                  onExtract={(file) => handleExtractLicense(file, index)}
                />

                <div className="mt-5 grid grid-cols-2 gap-5">
                  <Input
                    label="F.I.O."
                    placeholder="To'liq ism-sharifi"
                    error={errors.drivers?.[index]?.fullName?.message}
                    {...register(`drivers.${index}.fullName`)}
                    onChange={(e) => setValue(`drivers.${index}.fullName`, maskLetters(e.target.value, 60), { shouldValidate: true, shouldDirty: true })}
                  />
                  <Input
                    label="Tug'ilgan sana"
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    error={errors.drivers?.[index]?.birthDate?.message}
                    {...register(`drivers.${index}.birthDate`)}
                  />
                  <Input
                    label="Pasport seriyasi"
                    placeholder={isForeign ? 'Pasport seriyasi/kodi' : 'AA'}
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
                    label="Pasport raqami"
                    placeholder={isForeign ? 'Pasport raqami' : '1234567'}
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
                    label="Haydovchilik guvohnomasi raqami"
                    error={errors.drivers?.[index]?.licenseNumber?.message}
                    {...register(`drivers.${index}.licenseNumber`)}
                    onChange={(e) => setValue(`drivers.${index}.licenseNumber`, maskAlnumUpper(e.target.value, 12), { shouldValidate: true, shouldDirty: true })}
                  />
                  <Input
                    label="Guvohnoma berilgan sana"
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    error={errors.drivers?.[index]?.licenseIssueDate?.message}
                    {...register(`drivers.${index}.licenseIssueDate`)}
                  />
                  <Input
                    label="Staj boshlangan yil"
                    inputMode="numeric"
                    placeholder="2015"
                    error={errors.drivers?.[index]?.drivingExperienceSince?.message}
                    {...register(`drivers.${index}.drivingExperienceSince`)}
                    onChange={(e) => setValue(`drivers.${index}.drivingExperienceSince`, maskYear(e.target.value), { shouldValidate: true, shouldDirty: true })}
                  />
                  {relativeOptions.length > 0 && (
                    <Select
                      label="Transport egasi bilan qarindoshligi"
                      options={relativeOptions.map((r) => ({ value: String(r.relative), label: r.name }))}
                      placeholder="Tanlang"
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
                + Haydovchi qo&apos;shish
              </Button>
            )}
          </div>
        )}

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.push('/vehicle-info')}>
            Orqaga
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} className="px-10">
            Keyingisi
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
