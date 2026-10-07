'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CAR_BRANDS, CAR_MODELS_BY_BRAND, guessBrand } from '@/lib/carModels';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Combobox } from '@/components/ui/Combobox';

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

  const models = useMemo(
    () => (CAR_BRANDS.includes(brand) ? CAR_MODELS_BY_BRAND[brand] ?? [] : []),
    [brand],
  );

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
        options={CAR_BRANDS}
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
