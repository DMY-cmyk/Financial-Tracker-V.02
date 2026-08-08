import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { computeDayOfWeekPattern } from '@/server/services/insights.service';

async function insertExpense(id: string, date: string, amount: number) {
  const db = await getDb();
  await db.query(
    `INSERT INTO transactions (id, user_id, date, description, category, category_id, type, amount, payment_method, notes)
     VALUES (?, 'u1', ?, 'x', 'Food', '', 'expense', ?, 'Cash', '')`,
    [id, date, amount]
  );
}

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
  const db = await getDb();
  await db.query(`INSERT INTO users (id, email, name) VALUES ('u1', 'u1@x.co', 'U1')`);
});

describe('computeDayOfWeekPattern (no SQLite-only SQL)', () => {
  it('aggregates expenses per weekday using plain JS', async () => {
    await insertExpense('t1', '2026-03-01', 10_000); // Minggu
    await insertExpense('t2', '2026-03-01', 20_000); // Minggu
    await insertExpense('t3', '2026-03-02', 30_000); // Senin

    const days = await computeDayOfWeekPattern('u1', 2, 2026); // month 0-index: 2 = Maret

    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ dayIndex: 0, totalAmount: 30_000, count: 2, avgAmount: 15_000 });
    expect(days[1]).toEqual({ dayIndex: 1, totalAmount: 30_000, count: 1, avgAmount: 30_000 });
    expect(days[2]).toEqual({ dayIndex: 2, totalAmount: 0, count: 0, avgAmount: 0 });
  });
});
