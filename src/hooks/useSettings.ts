'use client';

import { useCallback, useEffect } from 'react';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';

/**
 * Hydrates theme/locale from the server once per app load so preferences
 * follow the user across devices. Mounted in StoreProvider — do not mount
 * elsewhere or the GET runs once per consumer.
 * On public pages (login/register) the request 401s and result.data is
 * undefined, which leaves the local values untouched.
 */
export function useSettingsSync() {
  const setTheme = useStore((s) => s.setTheme);
  const setLocale = useStore((s) => s.setLocale);
  const initialized = useStore((s) => s.initialized);

  useEffect(() => {
    if (!initialized) return;
    api.settings
      .get()
      .then((result) => {
        if (!result.data) return;
        const { settings } = result.data;
        if (
          settings.theme === 'light' ||
          settings.theme === 'dark' ||
          settings.theme === 'system'
        ) {
          setTheme(settings.theme);
        }
        if (settings.locale === 'en' || settings.locale === 'id') {
          setLocale(settings.locale);
        }
      })
      .catch(() => {
        // Best-effort sync — offline or unauthenticated keeps local values.
      });
  }, [initialized, setTheme, setLocale]);
}

/** Theme/locale state plus updaters that persist to the server. */
export function useSettings() {
  const theme = useStore((s) => s.ui.theme);
  const locale = useStore((s) => s.ui.locale);
  const setTheme = useStore((s) => s.setTheme);
  const setLocale = useStore((s) => s.setLocale);

  const updateTheme = useCallback(
    (newTheme: 'light' | 'dark' | 'system') => {
      setTheme(newTheme);
      api.settings.update({ theme: newTheme }).catch(() => {});
    },
    [setTheme]
  );

  const updateLocale = useCallback(
    (newLocale: 'en' | 'id') => {
      setLocale(newLocale);
      api.settings.update({ locale: newLocale }).catch(() => {});
    },
    [setLocale]
  );

  return { theme, locale, updateTheme, updateLocale };
}
