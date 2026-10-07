'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AccountSwitcherList } from '@/components/AccountSwitcherList';
import { useAuthStore } from '@/store/authStore';
import { useAccountsStore } from '@/store/accountsStore';
import { useApplicationStore } from '@/store/applicationStore';
import { useAccountSwitch } from '@/hooks/useAccountSwitch';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { TranslationKey } from '@/lib/i18n/useTranslation';

interface DashboardShellProps {
  children: ReactNode;
}

const MOBILE_NAV_ITEMS: { href: string; labelKey: TranslationKey }[] = [
  { href: '/policies', labelKey: 'nav.myPolicies' },
  { href: '/profile', labelKey: 'nav.profile' },
];

function MobileTopBar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const resetApplication = useApplicationStore((s) => s.reset);
  const accounts = useAccountsStore((s) => s.accounts);
  const removeAccount = useAccountsStore((s) => s.removeAccount);
  const { select: selectAccount, switchingUserId } = useAccountSwitch('/policies');

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    // Prevent the page behind the drawer from scrolling while it's open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const handleNewApplication = () => {
    resetApplication();
    setMenuOpen(false);
    router.push('/resident-type');
  };

  const handleLogout = () => {
    logout();
    resetApplication();
    setMenuOpen(false);
    router.replace('/login');
  };

  const handleAddAccount = () => {
    logout();
    setMenuOpen(false);
    router.push('/login');
  };

  const otherAccountsCount = accounts.filter((a) => a.user.id !== user?.id).length;

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        <Link href="/policies" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-black text-white">O</div>
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">OSAGO</span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={t('nav.openMenu')}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t('nav.closeMenu')}
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/50"
          />
          <div className="absolute inset-y-0 right-0 flex w-[85%] max-w-sm flex-col justify-between bg-white px-6 py-6 shadow-2xl dark:bg-slate-900">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('nav.menu')}</span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label={t('nav.closeMenu')}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <button
                type="button"
                onClick={handleNewApplication}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/30 transition-colors hover:bg-orange-600"
              >
                {t('nav.newApplication')}
              </button>

              <nav className="mt-6 flex flex-col gap-1">
                {MOBILE_NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                      }`}
                    >
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 flex items-center justify-between rounded-xl px-3 py-2.5">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('nav.view')}</span>
                <div className="flex items-center gap-1">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </div>

              {accounts.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <AccountSwitcherList
                    accounts={accounts}
                    currentUserId={user?.id}
                    switchingUserId={switchingUserId}
                    onSelect={(account) => {
                      setMenuOpen(false);
                      selectAccount(account);
                    }}
                    onRemove={removeAccount}
                  />
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-1 border-t border-slate-100 pt-4 dark:border-slate-800">
              {user && (
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-300">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user.fullName}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {otherAccountsCount > 0 ? `+${otherAccountsCount} ${t('nav.otherAccountsSuffix')}` : user.email}
                    </p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleAddAccount}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </span>
                {t('nav.addAnotherAccount')}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                </span>
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 lg:flex">
      <Sidebar />
      <div className="flex-1">
        <MobileTopBar />
        <main className="px-6 py-10 lg:px-14 lg:py-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 hidden items-center justify-end gap-1 lg:flex">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
