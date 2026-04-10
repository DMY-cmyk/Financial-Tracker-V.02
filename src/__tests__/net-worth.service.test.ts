import { describe, it, expect, beforeEach } from 'vitest';
import { nanoid } from 'nanoid';
import { resetDb, getDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { getCurrentNetWorth } from '@/server/services/net-worth.service';
import { createLiability } from '@/server/services/liability.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('getCurrentNetWorth', () => {
  it('returns zeros when no data exists', async () => {
    const result = await getCurrentNetWorth();
    expect(result.error).toBeUndefined();
    expect(result.data?.totalAssets).toBe(0);
    expect(result.data?.totalLiabilities).toBe(0);
    expect(result.data?.netWorth).toBe(0);
    expect(result.data?.breakdown.paymentMethodBalances).toBe(0);
    expect(result.data?.breakdown.savingsGoals).toBe(0);
  });

  it('includes savings goals in totalAssets', async () => {
    const db = await getDb();
    const id = nanoid();
    await db.query(
      'INSERT INTO savings_goals (id, name, target_amount, saved_amount, color) VALUES (?, ?, ?, ?, ?)',
      [id, 'Test', 1_000_000, 600_000, '#2563EB']
    );
    const result = await getCurrentNetWorth();
    expect(result.data?.breakdown.savingsGoals).toBe(600_000);
    expect(result.data?.totalAssets).toBe(600_000);
  });

  it('subtracts liabilities from assets for net worth', async () => {
    const db = await getDb();
    const id = nanoid();
    await db.query(
      'INSERT INTO savings_goals (id, name, target_amount, saved_amount, color) VALUES (?, ?, ?, ?, ?)',
      [id, 'Fund', 5_000_000, 1_000_000, '#10B981']
    );
    await createLiability({ name: 'Loan', amount: 300_000, category: 'loan' });

    const result = await getCurrentNetWorth();
    expect(result.data?.breakdown.savingsGoals).toBe(1_000_000);
    expect(result.data?.totalLiabilities).toBe(300_000);
    expect(result.data?.netWorth).toBe(700_000);
  });
});
