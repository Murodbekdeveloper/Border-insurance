'use client';

import { RememberedAccount } from '@/store/accountsStore';

interface AccountSwitcherListProps {
  accounts: RememberedAccount[];
  currentUserId?: string | null;
  switchingUserId?: string | null;
  onSelect: (account: RememberedAccount) => void;
  onRemove?: (userId: string) => void;
}

export function AccountSwitcherList({
  accounts,
  currentUserId,
  switchingUserId,
  onSelect,
  onRemove,
}: AccountSwitcherListProps) {
  return (
    <ul className="flex flex-col gap-1">
      {accounts.map((account) => {
        const isCurrent = account.user.id === currentUserId;
        const isSwitching = switchingUserId === account.user.id;

        return (
          <li key={account.user.id} className="group relative">
            <button
              type="button"
              onClick={() => !isCurrent && !isSwitching && onSelect(account)}
              disabled={isCurrent || isSwitching}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:cursor-default ${
                isCurrent
                  ? 'bg-orange-50 dark:bg-orange-500/10'
                  : 'hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {account.user.fullName.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {account.user.fullName}
                </span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {account.user.email}
                </span>
              </span>
              {isCurrent && (
                <span className="shrink-0 text-xs font-semibold text-orange-600 dark:text-orange-400">
                  Joriy
                </span>
              )}
              {isSwitching && (
                <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-orange-500 dark:border-slate-600" />
              )}
            </button>

            {onRemove && !isCurrent && !isSwitching && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(account.user.id);
                }}
                aria-label="Hisobni ro'yxatdan olib tashlash"
                className="absolute right-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 group-hover:flex dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
