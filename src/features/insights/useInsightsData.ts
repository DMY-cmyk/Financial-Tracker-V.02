'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export function useInsightsData(month: number, year: number) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['insights', 'spending', month, year],
    queryFn: async () => {
      const result = await api.insights.spending(month, year);
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
  });

  return { data: data ?? null, isLoading, error };
}
