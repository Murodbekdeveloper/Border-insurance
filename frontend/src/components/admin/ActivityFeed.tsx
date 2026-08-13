interface ActivityItem {
  type: 'user' | 'policy' | 'payment';
  description: string;
  createdAt: string;
}

const ICONS: Record<ActivityItem['type'], { path: string; className: string }> = {
  user: {
    path: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
    className: 'bg-blue-50 text-[#2a78d6] dark:bg-blue-950/30 dark:text-[#3987e5]',
  },
  policy: {
    path: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    className: 'bg-green-50 text-[#008300] dark:bg-green-950/30 dark:text-[#008300]',
  },
  payment: {
    path: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z',
    className: 'bg-orange-50 text-[#eb6834] dark:bg-orange-950/30 dark:text-[#d95926]',
  },
};

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'hozirgina';
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} soat oldin`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay} kun oldin`;
  return date.toLocaleDateString('uz-UZ');
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">So&apos;nggi faoliyat</h2>
      {items.length === 0 && <p className="text-sm text-slate-400">Hozircha faoliyat yo&apos;q</p>}
      <div className="flex flex-col gap-1">
        {items.map((item, index) => {
          const icon = ICONS[item.type];
          return (
            <div
              key={index}
              className="animate-fade-in-up flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${icon.className}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon.path} />
                </svg>
              </span>
              <p className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{item.description}</p>
              <span className="shrink-0 text-xs text-slate-400">{formatRelative(item.createdAt)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
