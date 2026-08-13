'use client';

import { useEffect, useState } from 'react';
import { useCountUp } from '@/hooks/useCountUp';

interface SuccessRateMeterProps {
  success: number;
  failed: number;
  rate: number | null;
}

const SIZE = 140;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Severity thresholds — the ring's color reports how healthy the rate is,
// not an arbitrary accent (see dataviz "Meter" spec: fill = accent/warning/danger).
function severityColor(rate: number): string {
  if (rate >= 90) return '#0ca30c';
  if (rate >= 70) return '#fab219';
  return '#d03b3b';
}

export function SuccessRateMeter({ success, failed, rate }: SuccessRateMeterProps) {
  const total = success + failed;
  const hasData = rate !== null;
  const color = hasData ? severityColor(rate) : '#c3c2b7';

  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const filled = hasData && grown ? (rate / 100) * CIRCUMFERENCE : 0;
  const animatedRate = useCountUp(hasData ? rate : null, 900);

  return (
    <div className="animate-fade-in-up flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        To&apos;lov muvaffaqiyat darajasi
      </h2>
      <p className="text-xs text-slate-400">Shu oy</p>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center">
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-slate-100 dark:stroke-slate-800"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
            style={{ transition: 'stroke-dasharray 900ms cubic-bezier(0.16, 1, 0.3, 1), stroke 300ms ease' }}
          />
        </svg>
        <div className="-mt-[92px] flex flex-col items-center">
          <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {hasData ? `${animatedRate ?? 0}%` : '—'}
          </span>
          <span className="text-xs text-slate-400">{total} ta to&apos;lov</span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#0ca30c' }} />
          Muvaffaqiyatli ({success})
        </span>
        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#d03b3b' }} />
          Rad etilgan ({failed})
        </span>
      </div>
    </div>
  );
}
