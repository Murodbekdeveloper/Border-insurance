'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';

function applySystemDefaultIfUnset() {
  const current = useThemeStore.getState().theme;
  if (current === null) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    useThemeStore.getState().setTheme(prefersDark ? 'dark' : 'light');
  }
}

export function ThemeInitializer() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    if (useThemeStore.persist.hasHydrated()) {
      applySystemDefaultIfUnset();
      return;
    }
    return useThemeStore.persist.onFinishHydration(applySystemDefaultIfUnset);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return null;
}
