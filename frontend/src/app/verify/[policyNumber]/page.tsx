'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { PolicyVerification } from '@/types';
import { verifyPolicy } from '@/lib/api/verify';
import { formatDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { AuthShell } from '@/components/AuthShell';

export default function VerifyPolicyPage({
  params,
}: {
  params: Promise<{ policyNumber: string }>;
}) {
  const { policyNumber } = use(params);
  const { t, locale } = useTranslation();
  const [result, setResult] = useState<PolicyVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setResult(await verifyPolicy(policyNumber));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('verifyPolicy.checkError'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyNumber]);

  const formatPolicyDate = (date: string | null) => (date ? formatDate(date, locale) : '-');

  return (
    <AuthShell title={t('verifyPolicy.title')} subtitle={t('verifyPolicy.subtitle')}>
      {loading && <p className="text-sm text-slate-500">{t('verifyPolicy.checking')}</p>}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {!loading && result && (
        <div
          className={`rounded-2xl border p-6 ${
            result.valid
              ? 'border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/30'
              : 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30'
          }`}
        >
          <div className="flex items-center gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                result.valid
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
              }`}
            >
              {result.valid ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </span>
            <div>
              <p className={`text-base font-bold ${result.valid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {result.valid ? t('verifyPolicy.valid') : t('verifyPolicy.invalid')}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{result.policyNumber}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-5 border-t border-slate-200/60 pt-5 text-sm dark:border-white/10">
            <div>
              <dt className="text-slate-400">{t('verifyPolicy.plateNumber')}</dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">{result.plateNumber ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">{t('verifyPolicy.validity')}</dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {formatPolicyDate(result.validFrom)} — {formatPolicyDate(result.validTo)}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="font-semibold text-orange-600 hover:underline">
          OSAGO Online
        </Link>{' '}
        {t('verifyPolicy.backToSystem')}
      </p>
    </AuthShell>
  );
}
