import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, getDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { createMonthlyBudgetRepository } from '@/server/repositories/monthly-budget.repository';

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
    const updated = await repo.upsert({ categoryId: 'cat-1', month: 3, year: 2026, budgetAmount: 2000000 });
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
