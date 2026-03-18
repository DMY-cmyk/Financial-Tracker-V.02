'use client';

import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import type { PaymentMethodBalance } from './types';

interface UseBalancesReturn {
  balances: PaymentMethodBalance[];
  totalBalance: number;
  isLoading: boolean;
}

export function useBalances(): UseBalancesReturn {
  const initialized = useStore((s) => s.initialized);
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);

  const { data, isLoading } = useQuery({
    queryKey: ['payment-method-balances', month, year],
    queryFn: async () => {
      const result = await api.balances.list({ month, year });
      return result.data?.balances ?? [];
    },
    enabled: initialized,
    staleTime: 0,
  });

  const balances = data ?? [];
  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);

  return { balances, totalBalance, isLoading: !initialized || isLoading };
}
