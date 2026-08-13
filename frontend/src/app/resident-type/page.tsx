'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ResidentType } from '@/types';
import { updateResidentType } from '@/lib/api/auth';
import { useAuthStore } from '@/store/authStore';
import { useApplicationStore } from '@/store/applicationStore';
import { toast } from '@/store/toastStore';
import { AuthGuard } from '@/components/AuthGuard';
import { AuthShell } from '@/components/AuthShell';

const OPTIONS: Array<{
  type: ResidentType;
  title: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    type: 'resident',
    title: 'Resident',
    desc: 'O\'zbekiston Respublikasi fuqarosi yoki doimiy yashovchisiman',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
      </svg>
    ),
  },
  {
    type: 'non_resident',
    title: 'No-resident',
    desc: 'Chet el fuqarosiman yoki transport vositam xorijda ro\'yxatga olingan',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18" />
      </svg>
    ),
  },
];

function ResidentTypeContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const setResidentType = useApplicationStore((s) => s.setResidentType);
  const [loading, setLoading] = useState<ResidentType | null>(null);

  const handleSelect = async (type: ResidentType) => {
    if (!user) return;
    setLoading(type);
    try {
      const updatedUser = await updateResidentType(type);
      updateUser(updatedUser);
      setResidentType(type);
      router.push('/vehicle-info');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rezident turini saqlashda xatolik yuz berdi');
    } finally {
      setLoading(null);
    }
  };

  return (
    <AuthShell title="Kim sifatida murojaat qilyapsiz?" subtitle="Rezident turini tanlang" wide showExitToMenu>
      <div className="grid grid-cols-2 gap-5">
        {OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            disabled={loading !== null}
            onClick={() => handleSelect(option.type)}
            className="group relative flex flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all hover:-translate-y-0.5 hover:border-green-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-700 transition-colors group-hover:bg-green-600 group-hover:text-white dark:bg-green-950/40 dark:text-green-400">
              {option.icon}
            </span>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{option.title}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{option.desc}</p>
            </div>
            {loading === option.type && (
              <span className="absolute right-5 top-5 h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-green-600 dark:border-slate-700" />
            )}
          </button>
        ))}
      </div>
    </AuthShell>
  );
}

export default function ResidentTypePage() {
  return (
    <AuthGuard>
      <ResidentTypeContent />
    </AuthGuard>
  );
}
