'use client';

import { useCountUp } from '@/hooks/useCountUp';

interface StatTileProps {
  label: string;
  value: string;
  numericValue?: number;
  formatter?: (n: number) => string;
  delay?: number;
}

export function StatTile({ label, value, numericValue, formatter, delay = 0 }: StatTileProps) {
  const animated = useCountUp(numericValue ?? null);
  const display = numericValue !== undefined && animated !== null
    ? (formatter ? formatter(animated) : String(animated))
    : value;

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{display}</p>
    </div>
  );
}
