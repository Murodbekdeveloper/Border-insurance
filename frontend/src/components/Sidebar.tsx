'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useAccountsStore } from '@/store/accountsStore';
import { useApplicationStore } from '@/store/applicationStore';
import { useAccountSwitch } from '@/hooks/useAccountSwitch';
import { AccountSwitcherList } from '@/components/AccountSwitcherList';

const NAV_ITEMS = [
  {
    href: '/policies',
    label: 'Mening polislarim',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profil',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const resetApplication = useApplicationStore((s) => s.reset);
  const accounts = useAccountsStore((s) => s.accounts);
  const removeAccount = useAccountsStore((s) => s.removeAccount);
  const { select: selectAccount, switchingUserId } = useAccountSwitch('/policies');
  const router = useRouter();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!switcherOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [switcherOpen]);

  const handleLogout = () => {
    logout();
    resetApplication();
    setSwitcherOpen(false);
    router.replace('/login');
  };

  const handleAddAccount = () => {
    logout();
    setSwitcherOpen(false);
    router.push('/login');
  };

  const handleNewApplication = () => {
    resetApplication();
    router.push('/resident-type');
  };

  const otherAccountsCount = accounts.filter((a) => a.user.id !== user?.id).length;

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col justify-between bg-slate-950 px-6 py-8 text-white lg:flex">
      <div>
        <Link href="/policies" className="flex items-center gap-2.5 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 font-black text-white">
            O
          </div>
          <span className="text-lg font-bold tracking-tight">OSAGO Online</span>
        </Link>

        <button
          type="button"
          onClick={handleNewApplication}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/30 transition-colors hover:bg-orange-600"
        >
          + Yangi ariza
        </button>

        <nav className="mt-8 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div ref={switcherRef} className="relative border-t border-white/10 pt-5">
        {switcherOpen && (
          <div className="absolute bottom-full left-0 mb-3 w-full rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
            {accounts.length > 0 && (
              <>
                <AccountSwitcherList
                  accounts={accounts}
                  currentUserId={user?.id}
                  switchingUserId={switchingUserId}
                  onSelect={(account) => {
                    setSwitcherOpen(false);
                    selectAccount(account);
                  }}
                  onRemove={removeAccount}
                />
                <div className="my-1.5 h-px bg-slate-100 dark:bg-white/10" />
              </>
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
              Boshqa hisob qo&apos;shish
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
              Bu hisobdan chiqish
            </button>
          </div>
        )}

        {user && (
          <button
            type="button"
            onClick={() => setSwitcherOpen((open) => !open)}
            className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left transition-colors hover:bg-white/5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-300">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
              <p className="truncate text-xs text-slate-500">
                {otherAccountsCount > 0 ? `+${otherAccountsCount} boshqa hisob` : user.email}
              </p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${switcherOpen ? 'rotate-180' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15.75l3.75-3.75 3.75 3.75" />
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
}
