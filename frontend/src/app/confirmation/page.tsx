'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InsurancePolicy } from '@/types';
import { getPolicy, getPolicyPdfBlob } from '@/lib/api/policies';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useApplicationStore } from '@/store/applicationStore';
import { toast } from '@/store/toastStore';
import { AuthGuard } from '@/components/AuthGuard';
import { WizardShell } from '@/components/WizardShell';
import { Button } from '@/components/ui/Button';

function ConfirmationContent() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { policyId, reset } = useApplicationStore();
  const [policy, setPolicy] = useState<InsurancePolicy | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!policyId) {
      router.replace('/policies');
      return;
    }

    (async () => {
      try {
        const fetchedPolicy = await getPolicy(policyId);
        setPolicy(fetchedPolicy);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('confirmation.fetchError'));
      }
    })();
  }, [policyId, router, t]);

  const handleDownload = async () => {
    if (!policy) return;
    setDownloading(true);
    try {
      const blob = await getPolicyPdfBlob(policy.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${policy.policyNumber ?? 'osago-polis'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('confirmation.pdfError'));
    } finally {
      setDownloading(false);
    }
  };

  const handleFinish = () => {
    reset();
    router.push('/policies');
  };

  return (
    <WizardShell currentStep={4} title={t('confirmation.title')} subtitle={t('confirmation.subtitle')}>
      <div className="flex flex-col items-center gap-6 py-4 text-center">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-green-600 shadow-lg shadow-green-600/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="h-12 w-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold tracking-wide text-green-700 dark:text-green-400">{t('confirmation.statusConfirmed')}</h2>

        {policy && (
          <div className="grid w-full grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-6 text-left text-sm dark:bg-slate-800">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{t('confirmation.policyNumber')}</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{policy.policyNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{t('confirmation.premium')}</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(policy.price, locale)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{t('confirmation.vehicle')}</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{policy.vehicle.model} · {policy.vehicle.plateNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{t('confirmation.validity')}</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {policy.validFrom && formatDate(policy.validFrom, locale)} —{' '}
                {policy.validTo && formatDate(policy.validTo, locale)}
              </p>
            </div>
          </div>
        )}

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Button variant="outline" fullWidth isLoading={downloading} onClick={handleDownload} disabled={!policy}>
            {t('confirmation.downloadPdf')}
          </Button>
          <Button variant="primary" fullWidth onClick={handleFinish}>
            {t('confirmation.finish')}
          </Button>
        </div>
      </div>
    </WizardShell>
  );
}

export default function ConfirmationPage() {
  return (
    <AuthGuard>
      <ConfirmationContent />
    </AuthGuard>
  );
}
