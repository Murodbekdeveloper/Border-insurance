'use client';

import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

interface ComboboxProps {
  label?: string;
  error?: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  name?: string;
  id?: string;
}

export function Combobox({ label, error, options, value, onChange, onBlur, placeholder, name, id }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const inputId = id ?? name;
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return options.slice(0, 8);
    return options.filter((opt) => opt.toLowerCase().includes(query)).slice(0, 8);
  }, [options, value]);

  const isExactMatch = options.some((opt) => opt.toLowerCase() === value.trim().toLowerCase());

  return (
    <div className="relative flex flex-col gap-1.5" ref={wrapperRef}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          setIsOpen(false);
          onBlur?.();
        }}
        className={clsx(
          'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-orange-400',
          'dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
          error ? 'border-red-400' : 'border-slate-300 dark:border-slate-700',
        )}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={clsx(
                  'block w-full px-4 py-2 text-left text-sm hover:bg-orange-50 dark:hover:bg-slate-800',
                  opt.toLowerCase() === value.trim().toLowerCase()
                    ? 'bg-orange-50 font-semibold text-orange-700 dark:bg-slate-800 dark:text-orange-400'
                    : 'text-slate-700 dark:text-slate-300',
                )}
              >
                {opt}
              </button>
            ))
          ) : (
            <p className="px-4 py-2 text-sm text-slate-400">Mos model topilmadi</p>
          )}
          {!isExactMatch && value.trim() && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400 dark:border-slate-800">
              Ro&apos;yxatda yo&apos;q bo&apos;lsa, &quot;{value.trim()}&quot; nomini shu holicha qoldirishingiz mumkin
            </p>
          )}
          {!value.trim() && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400 dark:border-slate-800">
              Ro&apos;yxatda topilmasa, modelni qo&apos;lda kiritishingiz mumkin
            </p>
          )}
        </div>
      )}
    </div>
  );
}
