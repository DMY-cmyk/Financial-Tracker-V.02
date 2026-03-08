'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store';
import { useMonthlyBills } from '@/store/selectors';
import { api } from '@/lib/api/client';
import type { DashboardSummaryResponse } from '@/lib/api/contracts';

export function useDashboardData() {
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const initialized = useStore((s) => s.initialized);
  const savingsGoals = useStore((s) => s.savingsGoals);
  const categories = useStore((s) => s.categories);
  const bills = useMonthlyBills();

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);

  // Derive loading from comparing requested vs loaded data key
  const [loadedKey, setLoadedKey] = useState('');
  const targetKey = `${month}-${year}`;
  const isApiLoading = loadedKey !== targetKey;

  useEffect(() => {
    if (!initialized) return;

    let cancelled = false;

    api.dashboard.summary(month, year).then((result) => {
      if (cancelled) return;
      if (result.data) {
        setSummary(result.data);
      }
      setLoadedKey(`${month}-${year}`);
    });

    return () => {
      cancelled = true;
    };
  }, [month, year, initialized]);

  // Compute budget status from API categoryTotals + Zustand categories
  const budgetStatus = useMemo(() => {
    if (!summary) return [];
    return categories
      .filter((c) => c.type === 'expense' && c.budget > 0)
      .map((c) => {
        const spent = summary.categoryTotals[c.name] || 0;
        const remaining = c.budget - spent;
        const percentage = c.budget > 0 ? Math.min((spent / c.budget) * 100, 100) : 0;
        return {
          category: c.name,
          budget: c.budget,
          spent,
          remaining,
          color: c.color,
          percentage,
        };
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
    isLoading,
    isEmpty: !isLoading && summary?.transactionCount === 0,
  };
}
