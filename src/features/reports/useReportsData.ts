'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const [monthCount, setMonthCount] = useState(12);

  const { data: trends = [], isLoading } = useQuery<MonthlyTrend[]>({
    queryKey: ['reports-trends', monthCount],
    queryFn: async () => {
      const params = new URLSearchParams({ months: String(monthCount) });
      const res = await fetch(`/api/reports/trends?${params}`);
      if (!res.ok) throw new Error(`Trends request failed (${res.status})`);
      const json = await res.json();
      return json.data?.months ?? [];
    },
    enabled: initialized,
  });

  return { trends, isLoading, monthCount, setMonthCount };
}
