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

  const { data, isLoading } = useQuery({
    queryKey: ['payment-method-balances'],
    queryFn: async () => {
      const result = await api.balances.list();
      return result.data?.balances ?? [];
    },
    enabled: initialized,
    staleTime: 30_000,
  });

  const balances = data ?? [];
  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);

  return { balances, totalBalance, isLoading: !initialized || isLoading };
}
