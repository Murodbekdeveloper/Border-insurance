import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

export function ExitToMenuButton() {
  const { t } = useTranslation();
  return (
    <Link
      href="/policies"
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:-translate-x-0.5 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      {t('nav.exitToMenu')}
    </Link>
  );
}
