'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InsurancePolicy } from '@/types';
import { getPolicy, getPolicyPdfBlob } from '@/lib/api/policies';
import { formatCurrency } from '@/lib/utils';
import { useApplicationStore } from '@/store/applicationStore';
import { toast } from '@/store/toastStore';
import { AuthGuard } from '@/components/AuthGuard';
import { WizardShell } from '@/components/WizardShell';
import { Button } from '@/components/ui/Button';

function ConfirmationContent() {
  const router = useRouter();
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
        toast.error(err instanceof Error ? err.message : 'Arizani olishda xatolik yuz berdi');
      }
    })();
  }, [policyId, router]);

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
      toast.error(err instanceof Error ? err.message : 'PDF faylni yuklab olishda xatolik yuz berdi');
    } finally {
      setDownloading(false);
    }
  };

  const handleFinish = () => {
    reset();
    router.push('/policies');
  };

  return (
    <WizardShell currentStep={4} title="Tabriklaymiz!" subtitle="Sug'urta polisingiz muvaffaqiyatli rasmiylashtirildi">
      <div className="flex flex-col items-center gap-6 py-4 text-center">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-green-600 shadow-lg shadow-green-600/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="h-12 w-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold tracking-wide text-green-700 dark:text-green-400">TASDIQLANDI</h2>

        {policy && (
          <div className="grid w-full grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-6 text-left text-sm dark:bg-slate-800">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Polis raqami</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{policy.policyNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Sug&apos;urta summasi</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(policy.price)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Transport vositasi</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{policy.vehicle.model} · {policy.vehicle.plateNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Amal qilish muddati</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {policy.validFrom && new Date(policy.validFrom).toLocaleDateString('uz-UZ')} —{' '}
                {policy.validTo && new Date(policy.validTo).toLocaleDateString('uz-UZ')}
              </p>
            </div>
          </div>
        )}

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Button variant="outline" fullWidth isLoading={downloading} onClick={handleDownload} disabled={!policy}>
            Pdf yuklab olish
          </Button>
          <Button variant="primary" fullWidth onClick={handleFinish}>
            Yakunlash
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
