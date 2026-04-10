'use client';

import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import type { DashboardSummaryResponse } from '@/lib/api/contracts';
import type { Bill, Category, SavingsGoal, NetWorthCurrent, NetWorthSnapshot } from '@/lib/types';
import { computeBudgetAlerts, type BudgetAlert } from '@/lib/budget-alerts';

interface DashboardData {
  summary: DashboardSummaryResponse | null;
  categories: Category[];
  bills: Bill[];
  savingsGoals: SavingsGoal[];
  netWorthCurrent: NetWorthCurrent | null;
  netWorthHistory: NetWorthSnapshot[];
}

export function useDashboardData() {
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const initialized = useStore((s) => s.initialized);
  const queryClient = useQueryClient();

  const { data, isLoading: isQueryLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard', month, year],
    queryFn: async () => {
      const [summaryResult, catResult, billsResult, savingsResult, netWorthResult] =
        await Promise.all([
          api.dashboard.summary(month, year),
          api.categories.list(),
          api.bills.list({ month, year }),
          api.savings.list(),
          api.netWorth.get(),
        ]);
      return {
        summary: summaryResult.data ?? null,
        categories: catResult.data?.categories ?? [],
        bills: billsResult.data?.bills ?? [],
        savingsGoals: savingsResult.data?.goals ?? [],
        netWorthCurrent: netWorthResult.data?.current ?? null,
        netWorthHistory: netWorthResult.data?.history ?? [],
      };
    },
    enabled: initialized,
  });

  const summary = data?.summary ?? null;
  const categories = data?.categories ?? [];
  const bills = data?.bills ?? [];
  const savingsGoals = data?.savingsGoals ?? [];
  const netWorthCurrent = data?.netWorthCurrent ?? null;
  const netWorthHistory = data?.netWorthHistory ?? [];

  const onToggleBill = useCallback(
    async (id: string) => {
      const bill = (data?.bills ?? []).find((b) => b.id === id);
      if (!bill) return;
      // Optimistic update
      queryClient.setQueryData<DashboardData>(['dashboard', month, year], (old) => {
        if (!old) return old;
        return {
          ...old,
          bills: old.bills.map((b) => (b.id === id ? { ...b, isPaid: !b.isPaid } : b)),
        };
      });
      const result = await api.bills.update(id, { isPaid: !bill.isPaid });
      if (result.error) {
        queryClient.invalidateQueries({ queryKey: ['dashboard', month, year] });
      }
    },
    [data, queryClient, month, year]
  );

  const budgetStatus = useMemo(() => {
    if (!summary) return [];
    return (data?.categories ?? [])
      .filter((c) => c.type === 'expense' && c.budget > 0)
      .map((c) => {
        const spent = summary.categoryTotals[c.id] || 0;
        const remaining = c.budget - spent;
        const percentage = c.budget > 0 ? Math.min((spent / c.budget) * 100, 100) : 0;
        return {
          id: c.id,
          category: c.name,
          budget: c.budget,
          spent,
          remaining,
          color: c.color,
          percentage,
        };
      });
  }, [summary, data]);

  const budgetAlerts = useMemo((): BudgetAlert[] => {
    if (!summary) return [];
    return computeBudgetAlerts(
      (data?.categories ?? [])
        .filter((c) => c.type === 'expense')
        .map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          budget: c.budget,
          spent: summary.categoryTotals[c.id] || 0,
        }))
    );
  }, [summary, data]);

  const updateBudget = useCallback(
    async (categoryId: string, budget: number) => {
      // Optimistic update
      queryClient.setQueryData<DashboardData>(['dashboard', month, year], (old) => {
        if (!old) return old;
        return {
          ...old,
          categories: old.categories.map((c) => (c.id === categoryId ? { ...c, budget } : c)),
        };
      });
      const result = await api.categories.update(categoryId, { budget });
      if (result.error) {
        queryClient.invalidateQueries({ queryKey: ['dashboard', month, year] });
        return false;
      }
      return true;
    },
    [queryClient, month, year]
  );

  const isLoading = !initialized || isQueryLoading;

  return {
    month,
    year,
    balance: summary?.balance ?? 0,
    income: summary?.income ?? 0,
    expense: summary?.expense ?? 0,
    savingsRate: summary?.savingsRate ?? 0,
    transactions: summary?.recentTransactions ?? [],
    recentTransactions: summary?.recentTransactions ?? [],
    cashFlow: summary?.cashFlow ?? [],
    categoryTotals: summary?.categoryTotals ?? {},
    budgetStatus,
    budgetAlerts,
    paymentMethodTotals: summary?.paymentMethodTotals ?? {},
    bills,
    savingsGoals,
    categories,
    netWorthCurrent,
    netWorthHistory,
    onToggleBill,
    updateBudget,
    isLoading,
    isEmpty: !isLoading && summary?.transactionCount === 0,
  };
}
