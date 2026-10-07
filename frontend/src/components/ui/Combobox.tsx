'use client';

import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  DROPDOWN_INPUT_CLASS,
  DROPDOWN_OPTION_CLASS,
  DROPDOWN_OPTION_SELECTED_CLASS,
  DROPDOWN_OPTION_UNSELECTED_CLASS,
  DROPDOWN_PANEL_CLASS,
} from '@/components/ui/dropdownStyles';

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
          DROPDOWN_INPUT_CLASS,
          error ? 'border-red-400' : 'border-slate-300 dark:border-slate-700',
        )}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}

      {isOpen && (
        <div className={DROPDOWN_PANEL_CLASS}>
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
                  DROPDOWN_OPTION_CLASS,
                  opt.toLowerCase() === value.trim().toLowerCase()
                    ? DROPDOWN_OPTION_SELECTED_CLASS
                    : DROPDOWN_OPTION_UNSELECTED_CLASS,
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
