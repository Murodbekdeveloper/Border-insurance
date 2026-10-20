'use client';

import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import * as Flags from 'country-flag-icons/react/3x2';
import { AsYouType, getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  DROPDOWN_OPTION_CLASS,
  DROPDOWN_OPTION_SELECTED_CLASS,
  DROPDOWN_OPTION_UNSELECTED_CLASS,
  DROPDOWN_PANEL_CLASS,
} from '@/components/ui/dropdownStyles';

interface PhoneInputProps {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
}

const FlagIcons = Flags as unknown as Record<string, React.ComponentType<{ className?: string }>>;

// Every country libphonenumber-js knows a calling code for — sorted by name
// once we have a locale to sort with (see countryOptions below).
const COUNTRY_CODES = getCountries();

// Strips everything except digits and a single leading "+" — the only
// characters AsYouType/getCountries() ever need, and the only ones this
// field should ever hold.
function sanitize(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? `+${digits}` : '';
}

// A fresh AsYouType instance per call (rather than one kept across
// keystrokes) formats correctly for both typing forward and backspacing —
// verified directly against libphonenumber-js: feeding the full current
// digit string into a new instance each time handles shrinking input
// (backspace) exactly as well as growing it.
function formatAsYouType(raw: string): string {
  return new AsYouType().input(raw);
}

function detectCountry(raw: string): CountryCode | undefined {
  const formatter = new AsYouType();
  formatter.input(raw);
  return formatter.getCountry();
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18" />
    </svg>
  );
}

// International phone field — unlike a fixed "+998" mask (maskPhoneUZ), this
// accepts any country's number, auto-detects which one from the digits
// typed (via libphonenumber-js's AsYouType, the same engine used by most
// production phone inputs), formats it with that country's own digit
// grouping as the user types (e.g. Uzbekistan's "94 309 83 38" vs Russia's
// "916 123-45-67"), and shows that country's flag so the input is
// self-explanatory. The flag button also opens a searchable country list
// (name or calling code) for someone who doesn't know their own code by
// heart — picking one fills in "+<code>" and keeps typing from there.
export function PhoneInput({ label, error, value, onChange, onBlur, name, id }: PhoneInputProps) {
  const { t, locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = id ?? name;

  const formatted = useMemo(() => formatAsYouType(value), [value]);
  const detectedCountry = useMemo(() => detectCountry(value), [value]);
  const DetectedFlag = detectedCountry ? FlagIcons[detectedCountry] : undefined;

  // Intl.DisplayNames gives each country's name in whichever of the app's 5
  // UI languages is active, straight from the browser's own locale data —
  // no separate translation table to maintain (unlike the citizenship
  // picker's nameNative, this is a UI-language translation, which is
  // exactly what's wanted here: a dial-code picker, not an endonym list).
  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: 'region' });
    } catch {
      return null;
    }
  }, [locale]);

  const countryOptions = useMemo(
    () =>
      COUNTRY_CODES.map((cc) => ({
        cc,
        name: regionNames?.of(cc) ?? cc,
        callingCode: getCountryCallingCode(cc),
      })).sort((a, b) => a.name.localeCompare(b.name)),
    [regionNames],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countryOptions.slice(0, 30);
    return countryOptions
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.callingCode.includes(q.replace(/^\+/, '')) ||
          c.cc.toLowerCase() === q,
      )
      .slice(0, 30);
  }, [countryOptions, query]);

  const pickCountry = (cc: CountryCode) => {
    onChange(`+${getCountryCallingCode(cc)}`);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="flex">
        <button
          type="button"
          aria-label={t('common.selectCountry')}
          onClick={() => setIsOpen((v) => !v)}
          className={clsx(
            'flex items-center gap-1.5 rounded-l-xl border border-r-0 bg-white px-3 text-sm dark:bg-slate-900',
            error ? 'border-red-400' : 'border-slate-300 dark:border-slate-700',
          )}
        >
          {DetectedFlag ? (
            <DetectedFlag className="h-4 w-6 rounded-[2px] object-cover" />
          ) : (
            <GlobeIcon className="h-4 w-4 text-slate-400" />
          )}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 text-slate-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={formatted}
          placeholder="+998 94 309 83 38"
          onChange={(e) => onChange(sanitize(e.target.value))}
          onBlur={onBlur}
          className={clsx(
            'w-full rounded-r-xl border px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
            error ? 'border-red-400' : 'border-slate-300 dark:border-slate-700',
          )}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {isOpen && (
        <div className={clsx(DROPDOWN_PANEL_CLASS, 'top-full')}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.search')}
            className="mx-2 mb-1 w-[calc(100%-1rem)] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          {filtered.length > 0 ? (
            filtered.map((c) => {
              const OptionFlag = FlagIcons[c.cc];
              return (
                <button
                  key={c.cc}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickCountry(c.cc);
                  }}
                  className={clsx(
                    DROPDOWN_OPTION_CLASS,
                    'flex items-center gap-2',
                    c.cc === detectedCountry ? DROPDOWN_OPTION_SELECTED_CLASS : DROPDOWN_OPTION_UNSELECTED_CLASS,
                  )}
                >
                  {OptionFlag && <OptionFlag className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover" />}
                  <span className="flex-1 truncate text-left">{c.name}</span>
                  <span className="text-slate-400">+{c.callingCode}</span>
                </button>
              );
            })
          ) : (
            <p className="px-4 py-2 text-sm text-slate-400">{t('common.noResults')}</p>
          )}
        </div>
      )}
    </div>
  );
}
