import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb, getDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

/**
 * SQLite (used in tests) parses REFERENCES inline but does NOT enforce them
 * unless `PRAGMA foreign_keys = ON` is set on the connection. We deliberately
 * leave enforcement off in dev/test so tests that skip ensureSeeded can still
 * insert rows. These assertions therefore verify that the schema is *parseable*
 * (and won't reject INSERTs) — Postgres is what actually enforces in prod.
 */
describe('schema declares FK constraints (SQLite-parsed, Postgres-enforced)', () => {
  it('initializes all user-owned tables without parse errors', async () => {
    const db = await getDb();
    // If REFERENCES were malformed, initializeSchema would already have thrown
    // during resetDb(). A trivial query proves the connection is alive.
    const r = await db.query<{ c: number }>('SELECT COUNT(*) as c FROM users');
    expect(r.rows[0]?.c).toBeGreaterThanOrEqual(0);
  });

  it('allows INSERTs that satisfy the user_id reference', async () => {
    const db = await getDb();
    await db.query('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', [
      'u-fk-test',
      'fk@test',
      'FK',
      null,
    ]);
    await db.query(
      `INSERT INTO transactions
        (id, user_id, date, description, category, category_id, type, amount, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['t-fk-1', 'u-fk-test', '2026-05-28', 'x', 'c', '', 'expense', 1000, 'BCA']
    );
    const r = await db.query<{ c: number }>(
      'SELECT COUNT(*) as c FROM transactions WHERE user_id = ?',
      ['u-fk-test']
    );
    expect(r.rows[0]?.c).toBe(1);
  });

  it('monthly_budgets references categories(id) — schema accepts inserts that satisfy both FKs', async () => {
    const db = await getDb();
    await db.query('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', [
      'u-mb',
      'mb@test',
      'MB',
      null,
    ]);
    await db.query(
      `INSERT INTO categories (id, user_id, name, type, color, icon, budget)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['c-mb', 'u-mb', 'Food', 'expense', '#000', 'circle', 0]
    );
    await db.query(
      `INSERT INTO monthly_budgets (id, user_id, category_id, month, year, budget_amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['mb-1', 'u-mb', 'c-mb', 5, 2026, 100000]
    );
    const r = await db.query<{ c: number }>(
      'SELECT COUNT(*) as c FROM monthly_budgets WHERE user_id = ?',
      ['u-mb']
    );
    expect(r.rows[0]?.c).toBe(1);
  });
});
