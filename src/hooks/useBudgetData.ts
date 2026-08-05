'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import type { DashboardSummaryResponse } from '@/lib/api/contracts';
import type { Category } from '@/lib/types';
import { computeBudgetAlerts, type BudgetAlert } from '@/lib/budget-alerts';

export interface BudgetCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export function useBudgetData() {
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const initialized = useStore((s) => s.initialized);

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fetchKey, setFetchKey] = useState(0);

  const [loadedKey, setLoadedKey] = useState('');
  const [isError, setIsError] = useState(false);
  const targetKey = `${month}-${year}-${fetchKey}`;
  const isApiLoading = loadedKey !== targetKey;

  useEffect(() => {
    if (!initialized) return;

    let cancelled = false;

    Promise.all([
      api.dashboard.summary(month, year),
      api.categories.list({ type: 'expense', month, year }),
    ]).then(([summaryResult, catResult]) => {
      if (cancelled) return;
      if (summaryResult.data) setSummary(summaryResult.data);
      if (catResult.data) setCategories(catResult.data.categories);
      setIsError(Boolean(summaryResult.error || catResult.error));
      setLoadedKey(`${month}-${year}-${fetchKey}`);
    });

    return () => {
      cancelled = true;
    };
  }, [month, year, initialized, fetchKey]);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  const budgetedCategories = useMemo((): BudgetCategory[] => {
    if (!summary) return [];
    return categories
      .filter((c) => c.type === 'expense' && c.budget > 0)
      .map((c) => {
        const spent = summary.categoryTotals[c.id] || 0;
        const remaining = c.budget - spent;
        const percentage = c.budget > 0 ? (spent / c.budget) * 100 : 0;
        return {
          id: c.id,
          name: c.name,
          color: c.color,
          icon: c.icon,
          budget: c.budget,
          spent,
          remaining,
          percentage,
        };
      });
  }, [summary, categories]);

  const unbudgetedCategories = useMemo(() => {
    return categories.filter((c) => c.type === 'expense' && c.budget === 0);
  }, [categories]);

  const budgetAlerts = useMemo((): BudgetAlert[] => {
    if (!summary) return [];
    return computeBudgetAlerts(
      categories
        .filter((c) => c.type === 'expense')
        .map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          budget: c.budget,
          spent: summary.categoryTotals[c.id] || 0,
        }))
    );
  }, [summary, categories]);

  const totalBudget = useMemo(
    () => budgetedCategories.reduce((sum, c) => sum + c.budget, 0),
    [budgetedCategories]
  );

  const totalSpent = useMemo(
    () => budgetedCategories.reduce((sum, c) => sum + c.spent, 0),
    [budgetedCategories]
  );

  const updateBudget = useCallback(
    async (categoryId: string, budget: number) => {
      // Optimistic update
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, budget } : c)));

      const result = await api.categories.update(categoryId, { budget });
      if (result.error) {
        // Revert on failure
        refetch();
        return false;
      }
      return true;
    },
    [refetch]
  );

  const isLoading = !initialized || isApiLoading;

  return {
    isError,
    month,
    year,
    budgetedCategories,
    unbudgetedCategories,
    totalBudget,
    totalSpent,
    budgetAlerts,
    updateBudget,
    refetch,
    isLoading,
  };
}
