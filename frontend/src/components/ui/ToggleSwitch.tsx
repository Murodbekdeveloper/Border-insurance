'use client';

import clsx from 'clsx';

interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface ToggleSwitchProps<T extends string> {
  label?: string;
  options: [ToggleOption<T>, ToggleOption<T>];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
}

export function ToggleSwitch<T extends string>({ label, options, value, onChange, error }: ToggleSwitchProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              'rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
              value === opt.value
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
