'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'google' | 'success' | 'outline' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/30 focus-visible:outline-orange-500 disabled:bg-orange-300 disabled:shadow-none',
  google: 'bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-slate-400 disabled:bg-slate-100 disabled:text-slate-400 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
  success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-600/30 focus-visible:outline-green-600 disabled:bg-green-300 disabled:shadow-none',
  outline: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:outline-slate-400 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
  danger: 'bg-red-600 hover:bg-red-700 text-white focus-visible:outline-red-600 disabled:bg-red-300',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400 dark:text-slate-300 dark:hover:bg-slate-800',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', isLoading, fullWidth, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed',
          variantClasses[variant],
          fullWidth && 'w-full',
          className,
        )}
        {...rest}
      >
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
