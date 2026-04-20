import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, getDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { createMonthlyBudgetRepository } from '@/server/repositories/monthly-budget.repository';
import {
  getAnnualBudgetGrid,
  upsertMonthlyBudget,
  deleteMonthlyBudget,
} from '@/server/services/annual-budget.service';
import { createCategoryRepository } from '@/server/repositories/category.repository';
import { computeAnnualBudgetSummary, buildAnnualBudgetRows } from '@/hooks/useAnnualBudget';
import type { Category, MonthlyBudget, MonthlySpending } from '@/lib/types';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('monthly_budgets table', () => {
  it('creates the monthly_budgets table on schema init', async () => {
    const db = await getDb();
    const result = await db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='monthly_budgets'"
    );
    expect(result.rows).toHaveLength(1);
  });

  it('enforces UNIQUE(category_id, month, year)', async () => {
    const db = await getDb();
    await db.query(
      'INSERT INTO monthly_budgets (id, category_id, month, year, budget_amount) VALUES (?, ?, ?, ?, ?)',
      ['id-1', 'cat-1', 3, 2026, 1000000]
    );
    await expect(
      db.query(
        'INSERT INTO monthly_budgets (id, category_id, month, year, budget_amount) VALUES (?, ?, ?, ?, ?)',
        ['id-2', 'cat-1', 3, 2026, 2000000]
      )
    ).rejects.toThrow();
  });
});

describe('createMonthlyBudgetRepository', () => {
  it('upserts a new monthly budget override', async () => {
    const repo = createMonthlyBudgetRepository();
    const result = await repo.upsert({
      categoryId: 'cat-1',
      month: 3,
      year: 2026,
      budgetAmount: 1500000,
    });
    expect(result.id).toBeDefined();
    expect(result.categoryId).toBe('cat-1');
    expect(result.month).toBe(3);
    expect(result.year).toBe(2026);
    expect(result.budgetAmount).toBe(1500000);
  });

  it('updates an existing override on upsert', async () => {
    const repo = createMonthlyBudgetRepository();
    await repo.upsert({ categoryId: 'cat-1', month: 3, year: 2026, budgetAmount: 1000000 });
    const updated = await repo.upsert({
      categoryId: 'cat-1',
      month: 3,
      year: 2026,
      budgetAmount: 2000000,
    });
    expect(updated.budgetAmount).toBe(2000000);
  });

  it('finds all overrides for a year', async () => {
    const repo = createMonthlyBudgetRepository();
    await repo.upsert({ categoryId: 'cat-1', month: 0, year: 2026, budgetAmount: 1000000 });
    await repo.upsert({ categoryId: 'cat-2', month: 5, year: 2026, budgetAmount: 500000 });
    await repo.upsert({ categoryId: 'cat-1', month: 3, year: 2025, budgetAmount: 999999 });

    const results = await repo.findByYear(2026);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.year === 2026)).toBe(true);
  });

  it('deletes a specific override', async () => {
    const repo = createMonthlyBudgetRepository();
    await repo.upsert({ categoryId: 'cat-1', month: 3, year: 2026, budgetAmount: 1000000 });
    const deleted = await repo.delete('cat-1', 3, 2026);
    expect(deleted).toBe(true);
    const remaining = await repo.findByYear(2026);
    expect(remaining).toHaveLength(0);
  });

  it('returns false when deleting a non-existent override', async () => {
    const repo = createMonthlyBudgetRepository();
    const deleted = await repo.delete('cat-99', 3, 2026);
    expect(deleted).toBe(false);
  });
});

describe('getAnnualBudgetGrid', () => {
  it('returns empty grid when no expense categories exist', async () => {
    const result = await getAnnualBudgetGrid(2026);
    expect(result.error).toBeUndefined();
    expect(result.data!.categories).toHaveLength(0);
    expect(result.data!.overrides).toHaveLength(0);
    expect(result.data!.spending).toHaveLength(0);
    expect(result.data!.year).toBe(2026);
  });

  it('returns categories with overrides', async () => {
    const catRepo = createCategoryRepository();
    const cat = await catRepo.create({
      name: 'Food',
      type: 'expense',
      color: '#F59E0B',
      icon: 'utensils',
      budget: 1800000,
    });
    await upsertMonthlyBudget({ categoryId: cat.id, month: 3, year: 2026, budgetAmount: 2500000 });

    const result = await getAnnualBudgetGrid(2026);
    expect(result.data!.categories).toHaveLength(1);
    expect(result.data!.overrides).toHaveLength(1);
    expect(result.data!.overrides[0].budgetAmount).toBe(2500000);
  });
});

describe('upsertMonthlyBudget', () => {
  it('creates a new monthly budget override', async () => {
    const result = await upsertMonthlyBudget({
      categoryId: 'cat-1',
      month: 3,
      year: 2026,
      budgetAmount: 1500000,
    });
    expect(result.error).toBeUndefined();
    expect(result.data!.budgetAmount).toBe(1500000);
  });

  it('returns validation error for invalid month', async () => {
    const result = await upsertMonthlyBudget({
      categoryId: 'cat-1',
      month: 13,
      year: 2026,
      budgetAmount: 1000000,
    });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('deleteMonthlyBudget', () => {
  it('deletes an existing override', async () => {
    await upsertMonthlyBudget({ categoryId: 'cat-1', month: 3, year: 2026, budgetAmount: 1000000 });
    const result = await deleteMonthlyBudget({ categoryId: 'cat-1', month: 3, year: 2026 });
    expect(result.error).toBeUndefined();
    expect(result.data!.success).toBe(true);
  });

  it('returns false.success when override does not exist', async () => {
    const result = await deleteMonthlyBudget({ categoryId: 'cat-99', month: 3, year: 2026 });
    expect(result.error).toBeUndefined();
    expect(result.data!.success).toBe(false);
  });
});

const mockCat: Category = {
  id: 'cat-1',
  name: 'Food',
  type: 'expense',
  color: '#F59E0B',
  icon: 'utensils',
  budget: 1800000,
};

describe('buildAnnualBudgetRows', () => {
  it('builds 12 cells per category', () => {
    const rows = buildAnnualBudgetRows([mockCat], [], []);
    expect(rows).toHaveLength(1);
    expect(rows[0].cells).toHaveLength(12);
  });

  it('uses override budget when override exists for that month', () => {
    const overrides: MonthlyBudget[] = [
      { id: 'mb-1', categoryId: 'cat-1', month: 3, year: 2026, budgetAmount: 2500000 },
    ];
    const rows = buildAnnualBudgetRows([mockCat], overrides, []);
    expect(rows[0].cells[3].effectiveBudget).toBe(2500000);
    expect(rows[0].cells[3].hasOverride).toBe(true);
    expect(rows[0].cells[0].effectiveBudget).toBe(1800000);
    expect(rows[0].cells[0].hasOverride).toBe(false);
  });

  it('computes spent and percentage per cell', () => {
    const spending: MonthlySpending[] = [{ categoryId: 'cat-1', month: 3, spent: 900000 }];
    const rows = buildAnnualBudgetRows([mockCat], [], spending);
    expect(rows[0].cells[3].spent).toBe(900000);
    expect(rows[0].cells[3].percentage).toBeCloseTo(50);
  });

  it('computes annual totals', () => {
    const overrides: MonthlyBudget[] = [
      { id: 'mb-1', categoryId: 'cat-1', month: 0, year: 2026, budgetAmount: 2000000 },
    ];
    const rows = buildAnnualBudgetRows([mockCat], overrides, []);
    expect(rows[0].annualTotal).toBe(2000000 + 11 * 1800000);
  });
});

describe('computeAnnualBudgetSummary', () => {
  it('counts on-track, at-risk, over-budget categories', () => {
    const rows = buildAnnualBudgetRows([mockCat], [], []);
    const summary = computeAnnualBudgetSummary(rows);
    expect(summary.totalAnnualBudget).toBe(12 * 1800000);
    expect(summary.totalAnnualSpent).toBe(0);
    expect(summary.categoriesOnTrack).toBe(1);
    expect(summary.categoriesAtRisk).toBe(0);
    expect(summary.categoriesOver).toBe(0);
  });

  it('marks category at-risk when spent > 80% of annual budget', () => {
    const spending: MonthlySpending[] = Array.from({ length: 12 }, (_, m) => ({
      categoryId: 'cat-1',
      month: m,
      spent: 1800000 * 0.85,
    }));
    const rows = buildAnnualBudgetRows([mockCat], [], spending);
    const summary = computeAnnualBudgetSummary(rows);
    expect(summary.categoriesAtRisk).toBe(1);
  });
});
