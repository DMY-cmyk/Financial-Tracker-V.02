'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import type { DashboardSummaryResponse } from '@/lib/api/contracts';
import type { Bill, Category, SavingsGoal } from '@/lib/types';

export function useDashboardData() {
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const initialized = useStore((s) => s.initialized);

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

  const [loadedKey, setLoadedKey] = useState('');
  const targetKey = `${month}-${year}`;
  const isApiLoading = loadedKey !== targetKey;

  useEffect(() => {
    if (!initialized) return;

    let cancelled = false;

    Promise.all([
      api.dashboard.summary(month, year),
      api.categories.list(),
      api.bills.list({ month, year }),
      api.savings.list(),
    ]).then(([summaryResult, catResult, billsResult, savingsResult]) => {
      if (cancelled) return;
      if (summaryResult.data) setSummary(summaryResult.data);
      if (catResult.data) setCategories(catResult.data.categories);
      if (billsResult.data) setBills(billsResult.data.bills);
      if (savingsResult.data) setSavingsGoals(savingsResult.data.goals);
      setLoadedKey(`${month}-${year}`);
    });

    return () => {
      cancelled = true;
    };
  }, [month, year, initialized]);

  const onToggleBill = useCallback(
    async (id: string) => {
      const bill = bills.find((b) => b.id === id);
      if (!bill) return;
      // Optimistic update
      setBills((prev) => prev.map((b) => (b.id === id ? { ...b, isPaid: !b.isPaid } : b)));
      const result = await api.bills.update(id, { isPaid: !bill.isPaid });
      if (result.error) {
        // Revert on failure
        setBills((prev) => prev.map((b) => (b.id === id ? { ...b, isPaid: bill.isPaid } : b)));
      }
    },
    [bills]
  );

  const budgetStatus = useMemo(() => {
    if (!summary) return [];
    return categories
      .filter((c) => c.type === 'expense' && c.budget > 0)
      .map((c) => {
        const spent = summary.categoryTotals[c.name] || 0;
        const remaining = c.budget - spent;
        const percentage = c.budget > 0 ? Math.min((spent / c.budget) * 100, 100) : 0;
        return { category: c.name, budget: c.budget, spent, remaining, color: c.color, percentage };
      });
  }, [summary, categories]);

  const isLoading = !initialized || isApiLoading;

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
    paymentMethodTotals: summary?.paymentMethodTotals ?? {},
    bills,
    savingsGoals,
    categories,
    onToggleBill,
    isLoading,
    isEmpty: !isLoading && summary?.transactionCount === 0,
  };
}
