'use client';

import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { useStore } from '@/store';
import { LocaleContext } from '@/lib/i18n';
import { useSettingsSync } from '@/hooks/useSettings';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initialized = useStore((s) => s.initialized);
  const initialize = useStore((s) => s.initialize);
  const theme = useStore((s) => s.ui.theme);
  const locale = useStore((s) => s.ui.locale);

  useSettingsSync();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches);
      };
      root.classList.toggle('dark', mq.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  return (
    <MotionConfig reducedMotion="user">
      <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
    </MotionConfig>
  );
}
