'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getPrice, submitToPartner } from '@/lib/api/policies';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAuthStore } from '@/store/authStore';
import { useApplicationStore } from '@/store/applicationStore';
import { toast } from '@/store/toastStore';
import { AuthGuard } from '@/components/AuthGuard';
import { WizardShell } from '@/components/WizardShell';
import { Button } from '@/components/ui/Button';

function PaymentContent() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { policyId, price, setPrice } = useApplicationStore();
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentLinks, setPaymentLinks] = useState<{ clickLink: string; paymeLink: string } | null>(null);

  // Always-current translator for use inside loadPrice without making its
  // identity depend on `t` — otherwise switching the UI language on this
  // screen would recreate loadPrice, re-run the mount effect, and silently
  // re-fire a live (billable) price quote against the insurer for no
  // pricing-related reason.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Keyed by policyId (not a plain boolean) so a request for an id that's
  // no longer current — e.g. policyId changes before a slow request
  // resolves — is both deduplicated and, on resolution, recognized as
  // stale and discarded instead of overwriting the new policy's price.
  const loadingPriceRef = useRef<string | null>(null);
  const loadPrice = useCallback(
    (id: string) => {
      if (loadingPriceRef.current === id) return;
      loadingPriceRef.current = id;
      setLoadingPrice(true);
      setPriceError(null);
      // Real-time quote from the insurer (Asia Insurance/Apex_Box), not a
      // local estimate — the amount shown here is exactly what the customer
      // will be charged.
      getPrice(id)
        .then((result) => {
          if (loadingPriceRef.current !== id) return;
          setPrice(result);
        })
        .catch((err: unknown) => {
          if (loadingPriceRef.current !== id) return;
          const message = err instanceof Error ? err.message : tRef.current('payment.priceError');
          setPriceError(message);
          toast.error(message);
        })
        .finally(() => {
          if (loadingPriceRef.current === id) {
            loadingPriceRef.current = null;
            setLoadingPrice(false);
          }
        });
    },
    [setPrice],
  );

  useEffect(() => {
    if (!policyId) {
      router.replace('/driver-restriction');
      return;
    }
    if (!user) return;

    loadPrice(policyId);
  }, [policyId, user, loadPrice, router]);

  const handleSubmitToPartner = async () => {
    if (!policyId || submitting) return;
    setSubmitting(true);
    try {
      const { payallUrl, clickLink, paymeLink } = await submitToPartner(policyId);
      if (payallUrl) {
        toast.success(t('payment.submittedToast'));
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
      toast.error(t('payment.noPaymentLinkError'));
      setSubmitting(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('payment.submitError'));
      setSubmitting(false);
    }
  };

  return (
    <WizardShell currentStep={3} title={t('payment.title')} subtitle={t('payment.subtitle')}>
      <div className="mx-auto flex max-w-md flex-col gap-6">
        {user && (
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-6 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <p><span className="font-semibold">{t('payment.fullNameLabel')}</span> {user.fullName}</p>
            <p><span className="font-semibold">{t('payment.emailLabel')}</span> {user.email}</p>
            <p><span className="font-semibold">{t('payment.phoneLabel')}</span> {user.phone ?? '-'}</p>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('payment.summaryTitle')}</h2>

          {loadingPrice ? (
            <div className="mt-4 h-8 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ) : priceError ? (
            <div className="mt-4 flex flex-col items-start gap-2">
              <p className="text-sm text-red-600">{priceError}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => policyId && loadPrice(policyId)}
              >
                {t('common.retry')}
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {price !== null ? formatCurrency(price, locale) : '-'}
            </p>
          )}
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            {t('payment.submitNote')}
          </p>

          {paymentLinks ? (
            <div className="mt-6 flex flex-col gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('payment.choosePaymentMethod')}
              </p>
              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={() => { window.location.href = paymentLinks.clickLink; }}
              >
                {t('payment.payWithClick')}
              </Button>
              <Button
                type="button"
                variant="success"
                fullWidth
                onClick={() => { window.location.href = paymentLinks.paymeLink; }}
              >
                {t('payment.payWithPayme')}
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
              {t('payment.submit')}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            fullWidth
            className="mt-2"
            onClick={() => router.push('/driver-restriction')}
          >
            {t('common.back')}
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
