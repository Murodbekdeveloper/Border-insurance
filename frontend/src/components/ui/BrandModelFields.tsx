'use client';

import { useMemo, useState } from 'react';
import { CAR_BRANDS, CAR_MODELS_BY_BRAND, guessBrand } from '@/lib/carModels';
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
  const [{ brand, model }, setParts] = useState(() => splitInitialValue(value));

  const models = useMemo(
    () => (CAR_BRANDS.includes(brand) ? CAR_MODELS_BY_BRAND[brand] ?? [] : []),
    [brand],
  );

  const update = (nextBrand: string, nextModel: string) => {
    setParts({ brand: nextBrand, model: nextModel });
    onChange([nextBrand, nextModel].filter(Boolean).join(' '));
  };

  return (
    <>
      <Combobox
        label="Marka"
        placeholder="Markani tanlang yoki kiriting"
        options={CAR_BRANDS}
        value={brand}
        onChange={(nextBrand) => update(nextBrand, nextBrand === brand ? model : '')}
        onBlur={onBlur}
      />
      <Combobox
        label="Model"
        placeholder={brand ? 'Model tanlang yoki kiriting' : 'Avval markani tanlang'}
        options={models}
        value={model}
        onChange={(nextModel) => update(brand, nextModel)}
        onBlur={onBlur}
        error={error}
      />
    </>
  );
}
