'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ResidentType } from '@/types';
import { updateResidentType, updateCitizenship } from '@/lib/api/auth';
import { getCountries, ApexBoxReferenceOption } from '@/lib/api/apexBox';
import { localizedName, localizedSearchText } from '@/lib/i18n/multiLang';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAuthStore } from '@/store/authStore';
import { useApplicationStore } from '@/store/applicationStore';
import { toast } from '@/store/toastStore';
import { AuthGuard } from '@/components/AuthGuard';
import { AuthShell } from '@/components/AuthShell';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/Button';
import type { TranslationKey } from '@/lib/i18n/useTranslation';

const OPTIONS: Array<{
  type: ResidentType;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: React.ReactNode;
}> = [
  {
    type: 'resident',
    titleKey: 'residentType.residentTitle',
    descKey: 'residentType.residentDesc',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
      </svg>
    ),
  },
  {
    type: 'non_resident',
    titleKey: 'residentType.nonResidentTitle',
    descKey: 'residentType.nonResidentDesc',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18" />
      </svg>
    ),
  },
];

function ResidentTypeContent() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const setResidentType = useApplicationStore((s) => s.setResidentType);
  const [loading, setLoading] = useState<ResidentType | null>(null);
  const [selectedType, setSelectedType] = useState<ResidentType | null>(null);
  const [countries, setCountries] = useState<ApexBoxReferenceOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState(false);
  const [citizenshipId, setCitizenshipId] = useState('');
  const [continuing, setContinuing] = useState(false);
  const busy = loading !== null || continuing;

  // Effekt faqat "No-resident" birinchi marta tanlanganda ishga tushishi
  // uchun (keyingi qayta urinishlar tugma orqali, quyida), tarmoq holatini
  // bevosita boshqaramiz — countries.length'ga bog'liq bo'lish muvaffaqiyatsiz
  // urinishdan keyin (ro'yxat hamon bo'sh) qayta urinishni trigger qila
  // olmasdi.
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
        toast.error(t('residentType.countriesFetchError'));
      })
      .finally(() => {
        countriesLoadingRef.current = false;
        setCountriesLoading(false);
      });
  }, [t]);

  // Chet ellik uchun mashinasi xorijda ro'yxatdan o'tgan bo'lsa, ariza
  // Apex_Box orqali yuboriladi — bu esa arizachining fuqaroligini talab
  // qiladi (GET /apex-box/countries). Faqat "No-resident" tanlanganda kerak.
  // Xato bo'lsa, foydalanuvchi pastdagi "Qayta urinish" tugmasi orqali
  // qolib ketmasdan qayta urinishi mumkin (loadCountries).
  useEffect(() => {
    if (selectedType !== 'non_resident' || countries.length > 0) return;
    loadCountries();
  }, [selectedType, countries.length, loadCountries]);

  const proceed = async (type: ResidentType) => {
    if (!user) return;
    setLoading(type);
    try {
      const updatedUser = await updateResidentType(type);
      updateUser(updatedUser);
      setResidentType(type);
      router.push('/vehicle-info');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('residentType.residentTypeSaveError'));
    } finally {
      setLoading(null);
    }
  };

  const handleSelect = (type: ResidentType) => {
    if (busy) return;
    if (type === 'non_resident') {
      setSelectedType(type);
      return;
    }
    // Foydalanuvchi avval "No-resident"ni tanlab, fikridan qaytib
    // "Resident"ni bosishi mumkin — shu holatda fuqarolik paneli va uning
    // eski tanlovi (citizenshipId) ko'rinmasligi va keyingi safar
    // "No-resident" qayta tanlanganda eski holat sizib chiqmasligi kerak.
    setSelectedType(type);
    setCitizenshipId('');
    void proceed(type);
  };

  const handleContinueAsForeigner = async () => {
    if (!citizenshipId) {
      toast.error(t('residentType.citizenshipRequired'));
      return;
    }
    setContinuing(true);
    try {
      await updateCitizenship(citizenshipId);
      await proceed('non_resident');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('residentType.citizenshipSaveError'));
    } finally {
      setContinuing(false);
    }
  };

  return (
    <AuthShell title={t('residentType.title')} subtitle={t('residentType.subtitle')} wide showExitToMenu>
      <div className="grid grid-cols-2 gap-5">
        {OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            disabled={busy}
            onClick={() => handleSelect(option.type)}
            className={`group relative flex flex-col items-start gap-4 rounded-2xl border bg-white p-6 text-left transition-all hover:-translate-y-0.5 hover:border-green-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 ${
              selectedType === option.type ? 'border-green-500' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-700 transition-colors group-hover:bg-green-600 group-hover:text-white dark:bg-green-950/40 dark:text-green-400">
              {option.icon}
            </span>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{t(option.titleKey)}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(option.descKey)}</p>
            </div>
            {loading === option.type && (
              <span className="absolute right-5 top-5 h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-green-600 dark:border-slate-700" />
            )}
          </button>
        ))}
      </div>

      {selectedType === 'non_resident' && (
        <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
          {countriesError && countries.length === 0 ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-red-600">
                {t('residentType.countriesError')}
              </p>
              <Button type="button" variant="outline" isLoading={countriesLoading} onClick={loadCountries}>
                {t('common.retry')}
              </Button>
            </div>
          ) : (
            <SearchableSelect
              label={t('residentType.citizenshipLabel')}
              options={countries.map((c) => ({
                value: String(c.id),
                label: localizedName(c, locale),
                searchText: localizedSearchText(c),
              }))}
              placeholder={countriesLoading ? t('common.loading') : t('residentType.citizenshipPlaceholder')}
              disabled={countriesLoading}
              value={citizenshipId}
              onChange={setCitizenshipId}
            />
          )}
          <Button
            type="button"
            variant="primary"
            isLoading={continuing}
            disabled={!citizenshipId || countriesLoading}
            onClick={handleContinueAsForeigner}
          >
            {t('common.continue')}
          </Button>
        </div>
      )}
    </AuthShell>
  );
}

export default function ResidentTypePage() {
  return (
    <AuthGuard>
      <ResidentTypeContent />
    </AuthGuard>
  );
}
