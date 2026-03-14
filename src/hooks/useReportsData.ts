'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';

export interface MonthlyTrend {
  monthKey: string;
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
}

interface UseReportsDataReturn {
  trends: MonthlyTrend[];
  isLoading: boolean;
  monthCount: number;
  setMonthCount: (v: number) => void;
}

export function useReportsData(): UseReportsDataReturn {
  const initialized = useStore((s) => s.initialized);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthCount, setMonthCount] = useState(12);

  useEffect(() => {
    if (!initialized) return;
    setIsLoading(true);

    const params = new URLSearchParams({ months: String(monthCount) });
    fetch(`/api/reports/trends?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.months) {
          setTrends(json.data.months);
        }
      })
      .finally(() => setIsLoading(false));
  }, [initialized, monthCount]);

  return { trends, isLoading, monthCount, setMonthCount };
}
