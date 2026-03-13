'use client';

import { useCallback, useEffect } from 'react';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';

export function useSettings() {
  const theme = useStore((s) => s.ui.theme);
  const locale = useStore((s) => s.ui.locale);
  const setTheme = useStore((s) => s.setTheme);
  const setLocale = useStore((s) => s.setLocale);
  const initialized = useStore((s) => s.initialized);

  // Sync settings from API on first load
  useEffect(() => {
    if (!initialized) return;
    api.settings.get().then((result) => {
      if (!result.data) return;
      const { settings } = result.data;
      if (settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'system') {
        setTheme(settings.theme);
      }
      if (settings.locale === 'en' || settings.locale === 'id') {
        setLocale(settings.locale);
      }
    });
  }, [initialized, setTheme, setLocale]);

  const updateTheme = useCallback(
    (newTheme: 'light' | 'dark' | 'system') => {
      setTheme(newTheme);
      api.settings.update({ theme: newTheme });
    },
    [setTheme]
  );

  const updateLocale = useCallback(
    (newLocale: 'en' | 'id') => {
      setLocale(newLocale);
      api.settings.update({ locale: newLocale });
    },
    [setLocale]
  );

  return { theme, locale, updateTheme, updateLocale };
}
