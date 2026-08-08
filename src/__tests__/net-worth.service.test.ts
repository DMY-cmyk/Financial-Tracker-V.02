import { describe, it, expect, beforeEach } from 'vitest';
import { nanoid } from 'nanoid';
import { resetDb, getDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  getCurrentNetWorth,
  recordSnapshot,
  getNetWorthHistory,
} from '@/server/services/net-worth.service';
import { createLiability } from '@/server/services/liability.service';
import { DEMO_USER_ID } from '@/server/auth/current-user';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('getCurrentNetWorth', () => {
  it('returns zeros when no data exists', async () => {
    const result = await getCurrentNetWorth(DEMO_USER_ID);
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
      'INSERT INTO savings_goals (id, user_id, name, target_amount, saved_amount, color) VALUES (?, ?, ?, ?, ?, ?)',
      [id, DEMO_USER_ID, 'Test', 1_000_000, 600_000, '#1D4ED8']
    );
    const result = await getCurrentNetWorth(DEMO_USER_ID);
    expect(result.data?.breakdown.savingsGoals).toBe(600_000);
    expect(result.data?.totalAssets).toBe(600_000);
  });

  it('subtracts liabilities from assets for net worth', async () => {
    const db = await getDb();
    const id = nanoid();
    await db.query(
      'INSERT INTO savings_goals (id, user_id, name, target_amount, saved_amount, color) VALUES (?, ?, ?, ?, ?, ?)',
      [id, DEMO_USER_ID, 'Fund', 5_000_000, 1_000_000, '#059669']
    );
    await createLiability(DEMO_USER_ID, { name: 'Loan', amount: 300_000, category: 'loan' });

    const result = await getCurrentNetWorth(DEMO_USER_ID);
    expect(result.data?.breakdown.savingsGoals).toBe(1_000_000);
    expect(result.data?.totalLiabilities).toBe(300_000);
    expect(result.data?.netWorth).toBe(700_000);
  });
});

describe('recordSnapshot', () => {
  it('creates a snapshot for the current month with snapshotData', async () => {
    const now = new Date();
    const result = await recordSnapshot(DEMO_USER_ID);
    expect(result.error).toBeUndefined();
    expect(result.data?.month).toBe(now.getMonth());
    expect(result.data?.year).toBe(now.getFullYear());
    expect(result.data?.netWorth).toBe(0);
    expect(result.data?.snapshotData).toMatchObject({
      paymentMethodBalances: 0,
      savingsGoals: 0,
      liabilities: 0,
    });
  });

  it('upserts: second call same month keeps only one row and reflects latest data', async () => {
    await recordSnapshot(DEMO_USER_ID);
    await createLiability(DEMO_USER_ID, { name: 'New Debt', amount: 100_000, category: 'other' });
    await recordSnapshot(DEMO_USER_ID);

    const history = await getNetWorthHistory(DEMO_USER_ID);
    expect(history.data).toHaveLength(1);
    expect(history.data![0].totalLiabilities).toBe(100_000);
    expect(history.data![0].netWorth).toBe(-100_000);
  });
});

describe('getNetWorthHistory', () => {
  it('returns empty array when no snapshots exist', async () => {
    const result = await getNetWorthHistory(DEMO_USER_ID);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([]);
  });

  it('returns snapshots sorted ASC by year then month', async () => {
    const db = await getDb();
    await db.query(
      'INSERT INTO net_worth_snapshots (id, user_id, month, year, total_assets, total_liabilities, net_worth) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nanoid(), DEMO_USER_ID, 11, 2025, 100, 50, 50]
    );
    await db.query(
      'INSERT INTO net_worth_snapshots (id, user_id, month, year, total_assets, total_liabilities, net_worth) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nanoid(), DEMO_USER_ID, 0, 2026, 200, 100, 100]
    );
    await db.query(
      'INSERT INTO net_worth_snapshots (id, user_id, month, year, total_assets, total_liabilities, net_worth) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nanoid(), DEMO_USER_ID, 5, 2025, 50, 10, 40]
    );

    const result = await getNetWorthHistory(DEMO_USER_ID);
    expect(result.data).toHaveLength(3);
    expect(result.data![0]).toMatchObject({ month: 5, year: 2025 });
    expect(result.data![1]).toMatchObject({ month: 11, year: 2025 });
    expect(result.data![2]).toMatchObject({ month: 0, year: 2026 });
  });
});
