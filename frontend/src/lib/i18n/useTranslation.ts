'use client';

import { useMemo } from 'react';
import { useLocaleStore, Locale } from '@/store/localeStore';
import { DICTIONARIES, Dictionary } from './dictionaries';

// Generates every dot-path to a string leaf in the dictionary
// ("vehicleInfo.title", "common.back", ...) so t() is typo-checked at
// compile time instead of silently rendering a raw key at runtime.
type Paths<T, Prefix extends string = ''> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? `${Prefix}${K}`
        : Paths<T[K], `${Prefix}${K}.`>;
    }[keyof T & string];

export type TranslationKey = Paths<Dictionary>;

function getPath(dict: Dictionary, key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>(
      (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
      dict,
    );
  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [name, val]) => acc.replaceAll(`{${name}}`, String(val)),
    template,
  );
}

export type Translator = (key: TranslationKey, params?: Record<string, string | number>) => string;

// Falls back to the Uzbek source string (never the raw key) if a
// translation is missing for the given locale — a locale file catching up
// with a newly added uz.ts key should never show "vehicleInfo.title" to a
// real user. `params` fills in `{name}` placeholders (e.g.
// "{current}/{total}-qadam") after the locale lookup.
//
// A plain function (not a hook) so it's usable outside React too — e.g.
// zod validation schemas (lib/validation/schemas.ts), which take a
// Translator built from the active locale rather than calling the hook
// themselves, and tests, which can build one for a fixed locale without
// rendering a component.
export function createTranslator(locale: Locale): Translator {
  return (key, params) =>
    interpolate(getPath(DICTIONARIES[locale], key) ?? getPath(DICTIONARIES.uz, key) ?? key, params);
}

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);

  // Memoized on `locale` alone so callers can safely put `t` in a
  // useCallback/useEffect dependency array — it only changes identity when
  // the language actually changes, not on every render.
  const t = useMemo(() => createTranslator(locale), [locale]);

  return { t, locale };
}
