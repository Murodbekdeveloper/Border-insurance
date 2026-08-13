'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthStore } from '@/store/authStore';
import { useApplicationStore } from '@/store/applicationStore';

interface DashboardShellProps {
  children: ReactNode;
}

function MobileTopBar() {
  const logout = useAuthStore((s) => s.logout);
  const resetApplication = useApplicationStore((s) => s.reset);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    resetApplication();
    router.replace('/login');
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
      <Link href="/policies" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-black text-white">O</div>
        <span className="text-base font-bold text-slate-900 dark:text-slate-100">OSAGO</span>
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/policies" className="text-slate-600 dark:text-slate-300">Polislarim</Link>
        <Link href="/profile" className="text-slate-600 dark:text-slate-300">Profil</Link>
        <button onClick={handleLogout} className="font-medium text-red-600 dark:text-red-400">Chiqish</button>
      </nav>
    </header>
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
            <div className="mb-4 hidden justify-end lg:flex">
              <ThemeToggle />
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
