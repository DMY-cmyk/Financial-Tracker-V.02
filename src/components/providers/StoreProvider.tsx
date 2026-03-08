'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';
import { getSampleData } from '@/data/sample-data';
import { api } from '@/lib/api/client';
import { LocaleContext } from '@/lib/i18n';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initialized = useStore((s) => s.initialized);
  const initialize = useStore((s) => s.initialize);
  const setTransactions = useStore((s) => s.setTransactions);
  const theme = useStore((s) => s.ui.theme);
  const locale = useStore((s) => s.ui.locale);

  useEffect(() => {
    if (!initialized) {
      // Seed non-transaction data from sample data immediately
      const sampleData = getSampleData();
      initialize(sampleData);

      // Then sync transactions from API (server is the source of truth)
      api.transactions.list().then((result) => {
        if (result.data) {
          setTransactions(result.data.transactions);
        }
      });
    }
  }, [initialized, initialize, setTransactions]);

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

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
