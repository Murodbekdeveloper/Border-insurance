'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/api/adminAuth';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { toast } from '@/store/toastStore';

export default function AdminLoginPage() {
  const router = useRouter();
  const setSession = useAdminAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await adminLogin(email, password);
      setSession(result.admin, result.accessToken, result.refreshToken);
      router.push('/admin');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kirishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05060f] px-6 py-12">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/50 blur-lg" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-950/50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">OSAGO Admin</h1>
            <p className="mt-1.5 text-sm text-slate-400">Boshqaruv paneliga xavfsiz kirish</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-email" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@osago.uz"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-400/70 focus:bg-white/[0.07]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-password" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Parol
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={visible ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-400/70 focus:bg-white/[0.07]"
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition-colors hover:text-slate-300"
                >
                  {visible ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.243L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-all hover:brightness-110 hover:shadow-indigo-900/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              Kirish
            </button>
          </div>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          Ushbu sahifa faqat vakolatli xodimlar uchun
        </div>
      </div>
    </div>
  );
}
