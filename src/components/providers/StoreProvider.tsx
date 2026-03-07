'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';
import { getSampleData } from '@/data/sample-data';
import { LocaleContext } from '@/lib/i18n';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initialized = useStore(s => s.initialized);
  const initialize = useStore(s => s.initialize);
  const theme = useStore(s => s.ui.theme);
  const locale = useStore(s => s.ui.locale);

  useEffect(() => {
    if (!initialized) {
      const data = getSampleData();
      initialize(data);
    }
  }, [initialized, initialize]);

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
    <LocaleContext.Provider value={locale}>
      {children}
    </LocaleContext.Provider>
  );
}
