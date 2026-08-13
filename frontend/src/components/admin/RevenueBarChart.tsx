'use client';

import { useEffect, useState } from 'react';

interface RevenueBarChartProps {
  data: { month: string; revenue: number }[];
  months?: number;
  onMonthsChange?: (months: number) => void;
}

const RANGE_OPTIONS = [3, 6, 12];

const MONTH_LABELS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

function formatMonth(month: string): string {
  const [, m] = month.split('-');
  return MONTH_LABELS[Number(m) - 1] ?? month;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

const CHART_HEIGHT = 180;
const BAR_MAX_WIDTH = 28;
const GRADIENT_ID = 'revenue-bar-current-month';

export function RevenueBarChart({ data, months, onMonthsChange }: RevenueBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const maxRevenue = Math.max(1, ...data.map((d) => d.revenue));
  // Clean round gridline steps: 0, half, full (rounded up).
  const niceMax = Math.ceil(maxRevenue / 100_000) * 100_000 || 100_000;
  const gridSteps = [0, niceMax / 2, niceMax];

  const plotWidth = Math.max(320, data.length * 56);
  const bandWidth = plotWidth / data.length;
  const barWidth = Math.min(BAR_MAX_WIDTH, bandWidth * 0.5);

  return (
    <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Oylik tushum</h2>
        {onMonthsChange ? (
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onMonthsChange(option)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  months === option
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {option} oy
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-400">so&apos;m</span>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          role="img"
          aria-label="Oylik tushum grafigi"
          width={plotWidth}
          height={CHART_HEIGHT + 28}
          className="overflow-visible"
        >
          {/* Gridlines */}
          {gridSteps.map((step) => {
            const y = CHART_HEIGHT - (step / niceMax) * CHART_HEIGHT;
            return (
              <g key={step}>
                <line
                  x1={0}
                  x2={plotWidth}
                  y1={y}
                  y2={y}
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth={1}
                />
                <text x={0} y={y - 4} className="fill-slate-400 text-[10px]">
                  {formatCompact(step)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const bandX = i * bandWidth;
            const fullBarHeight = (d.revenue / niceMax) * CHART_HEIGHT;
            const barHeight = grown ? fullBarHeight : 0;
            const barX = bandX + (bandWidth - barWidth) / 2;
            const barY = CHART_HEIGHT - barHeight;
            const isLast = i === data.length - 1;
            const isActive = activeIndex === i;

            return (
              <g key={d.month}>
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  rx={4}
                  className={isLast ? undefined : 'fill-[#2a78d6] dark:fill-[#3987e5]'}
                  style={{
                    fill: isLast ? `url(#${GRADIENT_ID})` : undefined,
                    cursor: 'pointer',
                    transition: `opacity 120ms, height 600ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 45}ms, y 600ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 45}ms`,
                  }}
                  opacity={isActive || activeIndex === null ? 1 : 0.55}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(i)}
                  onBlur={() => setActiveIndex(null)}
                  tabIndex={0}
                />
                {isActive && (
                  <text
                    x={barX + barWidth / 2}
                    y={barY - 8}
                    textAnchor="middle"
                    className="fill-slate-800 text-[11px] font-semibold dark:fill-slate-100"
                  >
                    {formatCompact(d.revenue)}
                  </text>
                )}
                <text
                  x={bandX + bandWidth / 2}
                  y={CHART_HEIGHT + 18}
                  textAnchor="middle"
                  className="fill-slate-400 text-[11px]"
                >
                  {formatMonth(d.month)}
                </text>
              </g>
            );
          })}

          <defs>
            <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a78d6" />
              <stop offset="100%" stopColor="#1c5cab" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
