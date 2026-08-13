import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400',
            'transition-shadow focus:outline-none focus:ring-2 focus:ring-orange-400',
            'dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
            error ? 'border-red-400' : 'border-slate-300 dark:border-slate-700',
            className,
          )}
          {...rest}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
