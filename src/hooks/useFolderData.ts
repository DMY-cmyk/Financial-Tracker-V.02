'use client';

import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import type { YearSummary, MonthSummary } from '@/lib/api/contracts';

export function useFolderData() {
  const dashboardView = useStore((s) => s.ui.dashboardView);
  const selectedYear = useStore((s) => s.ui.selectedYear);
  const initialized = useStore((s) => s.initialized);

  const { data: yearsData, isLoading: isYearsLoading } = useQuery<YearSummary[]>({
    queryKey: ['folder-summary'],
    queryFn: async () => {
      const result = await api.dashboard.folderSummary();
      return result.data?.years ?? [];
    },
    enabled: initialized && dashboardView === 'years',
    staleTime: 60_000,
  });

  const { data: monthsData, isLoading: isMonthsLoading } = useQuery<MonthSummary[]>({
    queryKey: ['folder-summary', selectedYear],
    queryFn: async () => {
      const result = await api.dashboard.folderSummary(selectedYear);
      return result.data?.months ?? [];
    },
    enabled: initialized && dashboardView === 'months',
    staleTime: 60_000,
  });

  return {
    years: yearsData ?? [],
    months: monthsData ?? [],
    isYearsLoading: !initialized || isYearsLoading,
    isMonthsLoading: !initialized || isMonthsLoading,
  };
}
