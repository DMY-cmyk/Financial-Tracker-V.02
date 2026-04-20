'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import type {
  Category,
  MonthlyBudget,
  MonthlySpending,
  AnnualBudgetGridResponse,
} from '@/lib/types';

export interface AnnualBudgetCell {
  month: number;
  effectiveBudget: number;
  hasOverride: boolean;
  spent: number;
  percentage: number;
}

export interface AnnualBudgetRow {
  category: Category;
  cells: AnnualBudgetCell[]; // length 12
  annualTotal: number;
  annualSpent: number;
}

export interface AnnualBudgetSummaryData {
  totalAnnualBudget: number;
  totalAnnualSpent: number;
  remainingBudget: number;
  categoriesOnTrack: number;
  categoriesAtRisk: number;
  categoriesOver: number;
}

export function buildAnnualBudgetRows(
  categories: Category[],
  overrides: MonthlyBudget[],
  spending: MonthlySpending[]
): AnnualBudgetRow[] {
  const overrideMap = new Map<string, number>();
  for (const o of overrides) {
    overrideMap.set(`${o.categoryId}-${o.month}`, o.budgetAmount);
  }

  const spendMap = new Map<string, number>();
  for (const s of spending) {
    spendMap.set(`${s.categoryId}-${s.month}`, s.spent);
  }

  return categories
    .filter((c) => c.type === 'expense')
    .map((cat) => {
      const cells: AnnualBudgetCell[] = Array.from({ length: 12 }, (_, m) => {
        const key = `${cat.id}-${m}`;
        const hasOverride = overrideMap.has(key);
        const effectiveBudget = hasOverride ? overrideMap.get(key)! : cat.budget;
        const spent = spendMap.get(key) ?? 0;
        const percentage = effectiveBudget > 0 ? (spent / effectiveBudget) * 100 : 0;
        return { month: m, effectiveBudget, hasOverride, spent, percentage };
      });
      const annualTotal = cells.reduce((sum, c) => sum + c.effectiveBudget, 0);
      const annualSpent = cells.reduce((sum, c) => sum + c.spent, 0);
      return { category: cat, cells, annualTotal, annualSpent };
    });
}

export function computeAnnualBudgetSummary(rows: AnnualBudgetRow[]): AnnualBudgetSummaryData {
  let totalAnnualBudget = 0;
  let totalAnnualSpent = 0;
  let categoriesOnTrack = 0;
  let categoriesAtRisk = 0;
  let categoriesOver = 0;

  for (const row of rows) {
    totalAnnualBudget += row.annualTotal;
    totalAnnualSpent += row.annualSpent;
    const pct = row.annualTotal > 0 ? (row.annualSpent / row.annualTotal) * 100 : 0;
    if (pct >= 100) categoriesOver++;
    else if (pct >= 80) categoriesAtRisk++;
    else categoriesOnTrack++;
  }

  return {
    totalAnnualBudget,
    totalAnnualSpent,
    remainingBudget: totalAnnualBudget - totalAnnualSpent,
    categoriesOnTrack,
    categoriesAtRisk,
    categoriesOver,
  };
}

export function useAnnualBudget() {
  const year = useStore((s) => s.ui.selectedYear);
  const initialized = useStore((s) => s.initialized);

  const [gridData, setGridData] = useState<AnnualBudgetGridResponse | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [loadedYear, setLoadedYear] = useState<number | null>(null);

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    api.annualBudget.getGrid(year).then((result) => {
      if (cancelled) return;
      if (result.data) {
        setGridData(result.data);
        setLoadedYear(year);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [year, initialized, fetchKey]);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  const rows = useMemo(
    () =>
      gridData
        ? buildAnnualBudgetRows(gridData.categories, gridData.overrides, gridData.spending)
        : [],
    [gridData]
  );

  const summary = useMemo(() => computeAnnualBudgetSummary(rows), [rows]);

  const monthlyTotals = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) =>
        rows.reduce((sum, row) => sum + row.cells[m].effectiveBudget, 0)
      ),
    [rows]
  );

  const upsertCell = useCallback(
    async (categoryId: string, month: number, budgetAmount: number) => {
      const result = await api.annualBudget.upsert({ categoryId, month, year, budgetAmount });
      if (result.error) return false;
      refetch();
      return true;
    },
    [year, refetch]
  );

  const deleteCell = useCallback(
    async (categoryId: string, month: number) => {
      const result = await api.annualBudget.delete({ categoryId, month, year });
      if (result.error) return false;
      refetch();
      return true;
    },
    [year, refetch]
  );

  const isLoading = !initialized || gridData === null;

  // suppress unused variable warning — loadedYear is available for consumers if needed
  void loadedYear;

  return { year, rows, summary, monthlyTotals, upsertCell, deleteCell, refetch, isLoading };
}
