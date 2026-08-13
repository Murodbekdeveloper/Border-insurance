'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApplicationStore } from '@/store/applicationStore';
import { getPolicy } from '@/lib/api/policies';
import { Button } from '@/components/ui/Button';

export function ResumeApplicationBanner() {
  const router = useRouter();
  const { residentType, vehicleId, policyId, reset } = useApplicationStore();
  const [resumePath, setResumePath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (policyId) {
        const policy = await getPolicy(policyId).catch(() => null);
        if (cancelled) return;
        if (!policy || policy.status === 'paid' || policy.status === 'cancelled') {
          reset();
          return;
        }
        setResumePath('/payment');
        return;
      }
      if (vehicleId) {
        setResumePath('/driver-restriction');
        return;
      }
      if (residentType) {
        setResumePath('/vehicle-info');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId, vehicleId, residentType]);

  if (!resumePath) return null;

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 dark:border-orange-900/50 dark:bg-orange-950/20">
      <div>
        <p className="text-sm font-semibold text-orange-900 dark:text-orange-300">Tugallanmagan arizangiz bor</p>
        <p className="text-xs text-orange-700 dark:text-orange-400">Oldingi to&apos;ldirilgan ma&apos;lumotlaringiz saqlanib qolgan — davom ettirishingiz mumkin.</p>
      </div>
      <Button variant="primary" onClick={() => router.push(resumePath)} className="shrink-0">
        Davom ettirish
      </Button>
    </div>
  );
}
