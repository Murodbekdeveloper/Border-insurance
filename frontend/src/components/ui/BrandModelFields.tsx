'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CAR_BRANDS, CAR_MODELS_BY_BRAND, guessBrand } from '@/lib/carModels';
import { fetchAllCarMakes, fetchModelsForMake } from '@/lib/vehicleMakesApi';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Combobox } from '@/components/ui/Combobox';

// Qo'lda tuzilgan ro'yxatni (O'zbekiston bozori uchun eng muhim brend/
// modellar) almashtirmaydi, faqat TO'LDIRADI — NHTSA'dan kelgan qo'shimcha
// nomlar oxiriga qo'shiladi, shuning uchun bo'sh qidiruvda birinchi 8 ta
// taklif hamon mahalliy bozor uchun eng dolzarblari bo'lib qoladi (qarang
// Combobox'ning "query bo'sh bo'lsa birinchi 8 tasi" mantig'i).
function mergeUnique(curated: readonly string[], extra: readonly string[]): string[] {
  const seen = new Set(curated.map((v) => v.toLowerCase()));
  const merged = [...curated];
  for (const value of extra) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(value);
    }
  }
  return merged;
}

interface BrandModelFieldsProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
}

function splitInitialValue(value: string): { brand: string; model: string } {
  const brand = guessBrand(value);
  if (!brand) return { brand: '', model: value };
  return { brand, model: value.slice(brand.length).trimStart() };
}

// Ikki bosqichli tanlov (mobil ilovadagi BrandModelPicker bilan bir xil mantiq):
// avval marka, so'ng shu markaning modellari — ro'yxatda yo'q marka/model bo'lsa,
// foydalanuvchi qo'lda ham kirita oladi. Ikkalasi ham bitta "model" maydoniga
// "Brend Model" ko'rinishida birlashtirilib saqlanadi. Marka/model matni komponent
// ichida saqlanadi (faqat boshlang'ich qiymatdan olinadi) — aks holda "Marka" maydoni
// CAR_BRANDS ro'yxatida yo'q qiymat kiritilganda har bosishda qayta aniqlanib, allaqachon
// kiritilgan model matnini o'chirib yuborar edi.
export function BrandModelFields({ value, onChange, onBlur, error }: BrandModelFieldsProps) {
  const { t } = useTranslation();
  const [{ brand, model }, setParts] = useState(() => splitInitialValue(value));
  // Tracks what this component itself last emitted via onChange, so the
  // effect below can tell "value changed because we typed" (skip re-split,
  // the whole reason internal state exists — see the comment above) apart
  // from "value changed some other way" (e.g. the vehicle-info page's OCR
  // auto-fill calling setValue('model', ...) directly) — the latter must
  // resync brand/model, or the combobox keeps showing stale/blank text
  // while the form's real value has already moved on.
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setParts(splitInitialValue(value));
    }
  }, [value]);

  // NHTSA'ning ochiq avtomobil bazasidan (vpic.nhtsa.dot.gov) qo'lda tuzilgan
  // ro'yxatni to'ldiruvchi qo'shimcha marka/model nomlari — tarmoq sekin
  // bo'lsa ham forma darhol mahalliy ro'yxat bilan ishlayveradi, keyin
  // natija kelganda taklif ro'yxati kengayadi.
  const [extraBrands, setExtraBrands] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchAllCarMakes().then((makes) => {
      if (!cancelled) setExtraBrands(makes);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keyed by the brand it was fetched for, so a stale result for a brand
  // the user has since changed away from is simply ignored below rather
  // than needing a synchronous setState to clear it on every brand change.
  const [extraModels, setExtraModels] = useState<{ brand: string; models: string[] }>({ brand: '', models: [] });
  useEffect(() => {
    if (!brand.trim()) return;
    let cancelled = false;
    fetchModelsForMake(brand).then((fetchedModels) => {
      if (!cancelled) setExtraModels({ brand, models: fetchedModels });
    });
    return () => {
      cancelled = true;
    };
  }, [brand]);

  const brandOptions = useMemo(() => mergeUnique(CAR_BRANDS, extraBrands), [extraBrands]);

  const models = useMemo(() => {
    const curated = CAR_BRANDS.includes(brand) ? CAR_MODELS_BY_BRAND[brand] ?? [] : [];
    const extra = extraModels.brand === brand ? extraModels.models : [];
    return mergeUnique(curated, extra);
  }, [brand, extraModels]);

  const update = (nextBrand: string, nextModel: string) => {
    const next = [nextBrand, nextModel].filter(Boolean).join(' ');
    lastEmitted.current = next;
    setParts({ brand: nextBrand, model: nextModel });
    onChange(next);
  };

  return (
    <>
      <Combobox
        label={t('vehicleInfo.brandLabel')}
        placeholder={t('vehicleInfo.brandPlaceholder')}
        options={brandOptions}
        value={brand}
        onChange={(nextBrand) => update(nextBrand, nextBrand === brand ? model : '')}
        onBlur={onBlur}
      />
      <Combobox
        label={t('vehicleInfo.modelLabel')}
        placeholder={brand ? t('vehicleInfo.modelPlaceholder') : t('vehicleInfo.modelPlaceholderNoBrand')}
        options={models}
        value={model}
        onChange={(nextModel) => update(brand, nextModel)}
        onBlur={onBlur}
        error={error}
      />
    </>
  );
}
