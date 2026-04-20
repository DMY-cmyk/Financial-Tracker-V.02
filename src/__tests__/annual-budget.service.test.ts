import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, getDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';

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
