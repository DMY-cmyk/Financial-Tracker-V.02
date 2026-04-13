'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { DueItem, GenerateResult } from '@/lib/api/contracts';

function getDismissKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `recurring-banner-dismissed-${today}`;
}

function isDismissedToday(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(getDismissKey()) === 'true';
}

export function useDueRecurring() {
  const queryClient = useQueryClient();
  const [isDismissed, setIsDismissed] = useState(isDismissedToday);

  const { data, isLoading } = useQuery({
    queryKey: ['recurring-transactions', 'due'],
    queryFn: async () => {
      const result = await api.recurringTransactions.due();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (): Promise<GenerateResult> => {
      const result = await api.recurringTransactions.generate();
      if (result.error) throw new Error(result.error.message);
      return result.data as GenerateResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const dismiss = useCallback(() => {
    sessionStorage.setItem(getDismissKey(), 'true');
    setIsDismissed(true);
  }, []);

  const dueItems: DueItem[] = data?.dueItems ?? [];
  const totalTransactions = data?.totalTransactions ?? 0;
  const totalIncome = data?.totalIncome ?? 0;
  const totalExpense = data?.totalExpense ?? 0;

  const hasDueItems = useMemo(
    () => dueItems.length > 0 && !isDismissed,
    [dueItems.length, isDismissed]
  );

  return {
    dueItems,
    totalTransactions,
    totalIncome,
    totalExpense,
    isLoading,
    generate: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    isDismissed,
    dismiss,
    hasDueItems,
  };
}
