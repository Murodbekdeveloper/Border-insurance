import { ReactNode } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ExitToMenuButton } from '@/components/ExitToMenuButton';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
  showExitToMenu?: boolean;
}

const FEATURES = [
  { title: 'Onlayn ariza', desc: '5 daqiqada OSAGO polisini rasmiylashtiring' },
  { title: 'Rasmiy PDF polis', desc: 'Polisingizni istalgan vaqt yuklab oling' },
  { title: 'Xavfsiz to\'lov', desc: 'Visa va Mastercard kartalari qo\'llab-quvvatlanadi' },
];

export function AuthShell({ title, subtitle, children, wide, showExitToMenu }: AuthShellProps) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-slate-950 px-16 py-14 text-white lg:flex">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-orange-600/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-orange-500/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <Link href="/" className="relative z-10 flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 font-black text-white">
            O
          </div>
          <span className="text-lg font-bold tracking-tight">OSAGO Online</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Avtomobil sug&apos;urtasini <span className="text-orange-400">bir necha daqiqada</span> rasmiylashtiring
          </h2>
          <p className="mt-4 text-base text-slate-400">
            Fuqarolik javobgarligini majburiy sug&apos;urtalash polisini uydan chiqmasdan, onlayn xarid qiling.
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="text-sm text-slate-400">{feature.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-slate-500">© {new Date().getFullYear()} OSAGO Online. Barcha huquqlar himoyalangan.</p>
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-slate-50 px-4 py-14 sm:px-6 sm:py-16 dark:bg-slate-950 lg:bg-white lg:dark:bg-slate-950">
        <div className="absolute left-6 right-6 top-6 flex items-center justify-between">
          {showExitToMenu ? <ExitToMenuButton /> : <span />}
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <div className={wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}>
          <Link href="/" className="mb-8 flex items-center gap-2.5 transition-opacity hover:opacity-80 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 font-black text-white">
              O
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">OSAGO Online</span>
          </Link>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
