import { SelectHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: readonly Option[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...rest }, ref) => {
    const selectId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900',
            'focus:outline-none focus:ring-2 focus:ring-orange-400',
            'dark:bg-slate-900 dark:text-slate-100',
            error ? 'border-red-400' : 'border-slate-300 dark:border-slate-700',
            className,
          )}
          {...rest}
        >
          <option value="" disabled hidden>
            {placeholder ?? 'Tanlang'}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
