import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'uz' | 'ru' | 'en' | 'ky' | 'zh';

export const LOCALES: Locale[] = ['uz', 'ru', 'en', 'ky', 'zh'];

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'uz',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'osago-locale',
      // Hydration is triggered manually by LocaleInitializer instead of
      // automatically at store-creation time. Without this, the client's
      // very first render (React's hydration pass) would already read a
      // non-uz persisted locale while the server-rendered HTML it's
      // reconciling against was built with this default 'uz' — a text-
      // content hydration mismatch for any user who'd picked another
      // language, on every t()-using page. Deferring rehydration to a
      // useEffect (which only runs after that first pass commits) makes it
      // an ordinary post-mount update instead — same fix as themeStore.ts,
      // just via skipHydration instead of a null default, since `locale`
      // (unlike `theme`) is read as a non-nullable Locale all over the
      // app (formatCurrency/formatDate/localizedName/...).
      skipHydration: true,
    },
  ),
);
