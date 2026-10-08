'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GlobalSearch } from '@/components/admin/GlobalSearch';

const NAV_ITEMS = [
  { href: '/admin', label: 'Bosh sahifa' },
  { href: '/admin/users', label: 'Foydalanuvchilar' },
  { href: '/admin/policies', label: "So'rovlar" },
  { href: '/admin/payments', label: "To'lovlar" },
  { href: '/admin/audit-log', label: 'Amallar tarixi' },
  { href: '/admin/security', label: 'Xavfsizlik' },
];

const SUPERADMIN_NAV_ITEM = { href: '/admin/admins', label: 'Adminlar' };

export function AdminShell({ children }: { children: ReactNode }) {
  const admin = useAdminAuthStore((s) => s.admin);
  const logout = useAdminAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.replace('/profile/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-black text-white dark:bg-slate-700">
              A
            </div>
            <span className="hidden text-base font-bold text-slate-900 sm:block dark:text-slate-100">OSAGO Admin</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block">
              <GlobalSearch />
            </div>
            <ThemeToggle />
            <Link
              href="/admin/settings"
              aria-label="Sozlamalar"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.041.147.084.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.043.146-.086.22-.127.332-.184.582-.496.644-.87l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            {admin && (
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{admin.fullName}</p>
                <p className="text-xs text-slate-400">{admin.role === 'superadmin' ? 'Superadmin' : 'Admin'}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Chiqish
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 sm:px-6">
          {(admin?.role === 'superadmin' ? [...NAV_ITEMS, SUPERADMIN_NAV_ITEM] : NAV_ITEMS).map((item) => {
            const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-slate-800 text-slate-900 dark:border-slate-200 dark:text-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="px-4 py-8 sm:px-6 sm:py-10 lg:px-14 lg:py-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
