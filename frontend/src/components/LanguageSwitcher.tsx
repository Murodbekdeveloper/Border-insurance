'use client';

import { useRef, useState } from 'react';
import { useLocaleStore, LOCALES, Locale } from '@/store/localeStore';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Each language's name in its own script, not translated — the whole point
// is to be recognizable even to someone who can't read the current UI
// language yet.
const LANGUAGE_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
  ky: 'Кыргызча',
  zh: '中文',
};

const LANGUAGE_SHORT: Record<Locale, string> = {
  uz: 'UZ',
  ru: 'RU',
  en: 'EN',
  ky: 'KY',
  zh: '中文',
};

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`relative ${className ?? ''}`}
      ref={wrapperRef}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={t('nav.selectLanguage')}
        aria-expanded={isOpen}
        className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18" />
        </svg>
        {LANGUAGE_SHORT[locale]}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[9rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLocale(l);
                setIsOpen(false);
              }}
              className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-slate-800 ${
                l === locale
                  ? 'font-semibold text-orange-600 dark:text-orange-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {LANGUAGE_LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
