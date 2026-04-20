import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, getDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('transaction_splits schema', () => {
  it('transaction_splits table exists and is queryable', async () => {
    const db = await getDb();
    const result = await db.query('SELECT * FROM transaction_splits LIMIT 0');
    expect(result.rows).toEqual([]);
  });

  it('transactions.is_split column defaults to 0', async () => {
    const db = await getDb();
    const id = 'test-schema-1';
    await db.query(
      'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, '2026-01-01', 'Test', 'Food', 'cat-1', 'expense', 10000, 'Cash', '']
    );
    const result = await db.query<{ is_split: number }>(
      'SELECT is_split FROM transactions WHERE id = ?',
      [id]
    );
    expect(result.rows[0].is_split).toBe(0);
  });

  it('transaction_splits enforces ON DELETE CASCADE', async () => {
    const db = await getDb();
    const txId = 'test-schema-2';
    const splitId = 'split-schema-1';
    await db.query(
      'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, is_split) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [txId, '2026-01-01', 'Test', '', '', 'expense', 10000, 'Cash', '', 1]
    );
    await db.query(
      'INSERT INTO transaction_splits (id, transaction_id, category_id, category, amount, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [splitId, txId, 'cat-1', 'Food', 10000, '2026-01-01T00:00:00Z']
    );
    await db.query('DELETE FROM transactions WHERE id = ?', [txId]);
    const splits = await db.query('SELECT * FROM transaction_splits WHERE transaction_id = ?', [
      txId,
    ]);
    expect(splits.rows).toHaveLength(0);
  });
});
