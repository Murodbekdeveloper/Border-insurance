'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPrice, submitToPartner } from '@/lib/api/policies';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useApplicationStore } from '@/store/applicationStore';
import { toast } from '@/store/toastStore';
import { AuthGuard } from '@/components/AuthGuard';
import { WizardShell } from '@/components/WizardShell';
import { Button } from '@/components/ui/Button';

function PaymentContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { policyId, price, setPrice } = useApplicationStore();
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentLinks, setPaymentLinks] = useState<{ clickLink: string; paymeLink: string } | null>(null);

  useEffect(() => {
    if (!policyId) {
      router.replace('/driver-restriction');
      return;
    }
    if (!user) return;

    (async () => {
      try {
        const computedPrice = await getPrice(policyId);
        setPrice(computedPrice);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Narxni hisoblashda xatolik yuz berdi');
      } finally {
        setLoadingPrice(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId, user]);

  const handleSubmitToPartner = async () => {
    if (!policyId || submitting) return;
    setSubmitting(true);
    try {
      const { payallUrl, clickLink, paymeLink } = await submitToPartner(policyId);
      if (payallUrl) {
        toast.success("Ariza sug'urta kompaniyasiga yuborildi — to'lov sahifasiga o'tilmoqda");
        // payallUrl is Asia Insurance's own domain — a full page navigation,
        // not client-side routing, since the customer pays the real OSAGO
        // premium there directly (see backend InsurancePartnerService).
        window.location.href = payallUrl;
        return;
      }
      if (clickLink && paymeLink) {
        // Apex_Box (foreign vehicle) — two separate payment providers, the
        // customer picks one, so we show both instead of auto-redirecting.
        setPaymentLinks({ clickLink, paymeLink });
        setSubmitting(false);
        return;
      }
      toast.error("Sug'urta kompaniyasidan to'lov havolasi kelmadi");
      setSubmitting(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sug'urta kompaniyasiga yuborishda xatolik yuz berdi");
      setSubmitting(false);
    }
  };

  return (
    <WizardShell currentStep={3} title="To'lov" subtitle="Ariza sug'urta kompaniyasiga yuboriladi va to'lov sahifasiga yo'naltirilasiz">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        {user && (
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-6 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <p><span className="font-semibold">F.I.O.:</span> {user.fullName}</p>
            <p><span className="font-semibold">Email:</span> {user.email}</p>
            <p><span className="font-semibold">Telefon:</span> {user.phone ?? '-'}</p>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">To&apos;lov xulosasi</h2>

          {loadingPrice ? (
            <div className="mt-4 h-8 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ) : (
            <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {price !== null ? formatCurrency(price) : '-'}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Taxminiy summa — yakuniy summa sug&apos;urta kompaniyasi tomonidan tasdiqlanadi
          </p>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            &quot;To&apos;lovga o&apos;tish&quot; tugmasi bosilganda arizangiz Asia Insurance&apos;ga yuboriladi va siz
            ularning xavfsiz to&apos;lov sahifasiga yo&apos;naltirilasiz — OSAGO mukofoti to&apos;g&apos;ridan-to&apos;g&apos;ri
            sug&apos;urta kompaniyasi hisobiga to&apos;lanadi.
          </p>

          {paymentLinks ? (
            <div className="mt-6 flex flex-col gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                To&apos;lov usulini tanlang:
              </p>
              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={() => { window.location.href = paymentLinks.clickLink; }}
              >
                Click orqali to&apos;lash
              </Button>
              <Button
                type="button"
                variant="success"
                fullWidth
                onClick={() => { window.location.href = paymentLinks.paymeLink; }}
              >
                Payme orqali to&apos;lash
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="primary"
              fullWidth
              isLoading={submitting}
              disabled={loadingPrice || price === null || submitting}
              onClick={handleSubmitToPartner}
              className="mt-6"
            >
              To&apos;lovga o&apos;tish
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            fullWidth
            className="mt-2"
            onClick={() => router.push('/driver-restriction')}
          >
            Orqaga
          </Button>
        </div>
      </div>
    </WizardShell>
  );
}

export default function PaymentPage() {
  return (
    <AuthGuard>
      <PaymentContent />
    </AuthGuard>
  );
}
