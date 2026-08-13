'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { globalSearch, GlobalSearchResult } from '@/lib/api/admin';
import { POLICY_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/adminLabels';

const DEBOUNCE_MS = 300;

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        setResult(await globalSearch(trimmed));
      } catch {
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const goTo = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  const hasResults =
    result && (result.users.length > 0 || result.policies.length > 0 || result.payments.length > 0);

  return (
    <div ref={containerRef} className="relative w-64">
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.4a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Qidirish..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute right-0 top-full z-20 mt-2 w-96 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {loading && <p className="px-3 py-2 text-sm text-slate-400">Qidirilmoqda...</p>}
          {!loading && !hasResults && <p className="px-3 py-2 text-sm text-slate-400">Hech narsa topilmadi</p>}
          {!loading && result && result.users.length > 0 && (
            <div className="mb-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Foydalanuvchilar</p>
              {result.users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => goTo(`/admin/users/${u.id}`)}
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{u.fullName}</span>
                  <span className="text-xs text-slate-400">{u.email}</span>
                </button>
              ))}
            </div>
          )}
          {!loading && result && result.policies.length > 0 && (
            <div className="mb-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">So&apos;rovlar</p>
              {result.policies.map((p) => (
                <button
                  key={p.id}
                  onClick={() => goTo('/admin/policies')}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.policyNumber}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${POLICY_STATUS_LABELS[p.status].className}`}>
                    {POLICY_STATUS_LABELS[p.status].label}
                  </span>
                </button>
              ))}
            </div>
          )}
          {!loading && result && result.payments.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">To&apos;lovlar</p>
              {result.payments.map((pay) => (
                <button
                  key={pay.id}
                  onClick={() => goTo('/admin/payments')}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{pay.transactionId}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PAYMENT_STATUS_LABELS[pay.status].className}`}>
                    {PAYMENT_STATUS_LABELS[pay.status].label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
