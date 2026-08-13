import { ReactNode } from 'react';
import Link from 'next/link';
import { STEP_LABELS, TOTAL_STEPS } from '@/lib/constants';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ExitToMenuButton } from '@/components/ExitToMenuButton';

interface WizardShellProps {
  currentStep: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}

export function WizardShell({ currentStep, title, subtitle, children, wide }: WizardShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-80 shrink-0 flex-col justify-between bg-slate-950 px-10 py-12 text-white lg:flex">
        <div>
          <Link href="/policies" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 font-black text-white">
              O
            </div>
            <span className="text-lg font-bold tracking-tight">OSAGO Online</span>
          </Link>

          <ol className="mt-14 flex flex-col gap-8">
            {STEP_LABELS.map((step, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < currentStep;
              const isActive = stepNumber === currentStep;
              const stepNumberBadge = (
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    isCompleted
                      ? 'bg-orange-500 text-white'
                      : isActive
                        ? 'bg-white text-slate-950'
                        : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </span>
              );

              const stepLabelBlock = (
                <div className="pt-1.5">
                  <p className={`text-sm font-semibold ${isActive ? 'text-white' : isCompleted ? 'text-slate-300' : 'text-slate-500'}`}>
                    {step.label}
                  </p>
                  {isActive && <p className="mt-0.5 text-xs text-orange-400">Joriy qadam</p>}
                </div>
              );

              return (
                <li key={step.path} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    {stepNumberBadge}
                    {stepNumber !== TOTAL_STEPS && (
                      <span className={`mt-2 h-8 w-px ${isCompleted ? 'bg-orange-500' : 'bg-slate-800'}`} />
                    )}
                  </div>
                  {isCompleted ? (
                    <Link href={step.path} className="pt-1.5 transition-opacity hover:opacity-80">
                      <p className="text-sm font-semibold text-slate-300">{step.label}</p>
                    </Link>
                  ) : (
                    stepLabelBlock
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <p className="text-xs text-slate-500">© {new Date().getFullYear()} OSAGO Online. Barcha huquqlar himoyalangan.</p>
      </aside>

      <main className="flex-1 px-6 py-10 lg:px-16 lg:py-14">
        <div className={wide ? 'mx-auto max-w-4xl' : 'mx-auto max-w-2xl'}>
          <div className="mb-4 flex items-center justify-between">
            <ExitToMenuButton />
            <ThemeToggle />
          </div>
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{STEP_LABELS[currentStep - 1]?.label}</span>
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
              {currentStep}/{TOTAL_STEPS}-qadam
            </span>
          </div>
          <div className="mb-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 lg:hidden">
            <div
              className="h-1.5 rounded-full bg-orange-500 transition-all"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>

          <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800 lg:p-10">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
