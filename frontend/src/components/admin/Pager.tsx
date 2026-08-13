import { Button } from '@/components/ui/Button';

interface PagerProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pager({ page, total, pageSize, onChange }: PagerProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
      <span>
        {total} tadan {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Oldingi
        </Button>
        <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Keyingi
        </Button>
      </div>
    </div>
  );
}
