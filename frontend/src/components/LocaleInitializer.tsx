'use client';

import { useEffect } from 'react';
import { useLocaleStore } from '@/store/localeStore';

// Mirrors ThemeInitializer's role for theme: triggers the persisted-locale
// rehydration that localeStore.ts's skipHydration option deliberately
// skipped at store-creation time, from inside a useEffect so it always
// lands as a normal post-mount update instead of during React's hydration
// pass — see localeStore.ts's skipHydration comment for why that matters.
export function LocaleInitializer() {
  useEffect(() => {
    useLocaleStore.persist.rehydrate();
  }, []);

  return null;
}
