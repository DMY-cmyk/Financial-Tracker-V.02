'use client';

import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/store';
import type { ForecastResponse } from '@/lib/api/contracts';

interface UseForecastDataReturn {
  data: ForecastResponse | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function useForecastData(months = 6): UseForecastDataReturn {
  const initialized = useStore((s) => s.initialized);

  const { data, isLoading, error } = useQuery<ForecastResponse>({
    queryKey: ['forecast', months],
    queryFn: async () => {
      const params = new URLSearchParams({ months: String(months) });
      const res = await fetch(`/api/forecast?${params}`);
      if (!res.ok) throw new Error('Failed to fetch forecast');
      const json = await res.json();
      return json.data as ForecastResponse;
    },
    enabled: initialized,
  });

  return { data, isLoading, error: error as Error | null };
}
