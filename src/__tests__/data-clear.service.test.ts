import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { clearUserData, USER_DATA_TABLES } from '@/server/services/data.service';

const USER_A = 'user-a-0000-0000-0000-000000000000';
const USER_B = 'user-b-0000-0000-0000-000000000000';

async function seedUser(userId: string, suffix: string) {
  const db = await getDb();
  await db.query(`INSERT INTO users (id, email, name) VALUES (?, ?, ?)`, [
    userId,
    `${suffix}@example.com`,
    suffix,
  ]);
  await db.query(
    `INSERT INTO categories (id, user_id, name, type, color) VALUES (?, ?, ?, 'expense', '#000')`,
    [`cat-${suffix}`, userId, `Food ${suffix}`]
  );
  await db.query(
    `INSERT INTO transactions (id, user_id, date, description, category, category_id, type, amount, payment_method)
     VALUES (?, ?, '2026-01-01', 'Lunch', 'Food', ?, 'expense', 50000, 'Cash')`,
    [`txn-${suffix}`, userId, `cat-${suffix}`]
  );
  await db.query(
    `INSERT INTO payment_methods (id, user_id, name, type) VALUES (?, ?, 'Cash', 'cash')`,
    [`pm-${suffix}`, userId]
  );
  await db.query(
    `INSERT INTO bills (id, user_id, name, amount, due_date, month, year) VALUES (?, ?, 'Rent', 100, 1, 0, 2026)`,
    [`bill-${suffix}`, userId]
  );
  await db.query(
    `INSERT INTO savings_goals (id, user_id, name, target_amount, color) VALUES (?, ?, 'Goal', 100, '#000')`,
    [`sg-${suffix}`, userId]
  );
  await db.query(`INSERT INTO settings (key, user_id, value) VALUES ('theme', ?, 'dark')`, [
    userId,
  ]);
  await db.query(`INSERT INTO uploads (id, user_id, filename) VALUES (?, ?, 'r.png')`, [
    `up-${suffix}`,
    userId,
  ]);
  await db.query(
    `INSERT INTO export_jobs (id, user_id, format, scope) VALUES (?, ?, 'csv', 'month')`,
    [`ej-${suffix}`, userId]
  );
  await db.query(
    `INSERT INTO recurring_transactions (id, user_id, description, category, type, amount, payment_method, frequency, start_date, next_due_date)
     VALUES (?, ?, 'Netflix', 'Fun', 'expense', 1, 'Cash', 'monthly', '2026-01-01', '2026-02-01')`,
    [`rt-${suffix}`, userId]
  );
  await db.query(
    `INSERT INTO budget_templates (id, user_id, name, category_budgets) VALUES (?, ?, 'T', '{}')`,
    [`bt-${suffix}`, userId]
  );
  await db.query(`INSERT INTO liabilities (id, user_id, name, amount) VALUES (?, ?, 'Loan', 1)`, [
    `li-${suffix}`,
    userId,
  ]);
  await db.query(
    `INSERT INTO net_worth_snapshots (id, user_id, month, year, total_assets, total_liabilities, net_worth)
     VALUES (?, ?, 0, 2026, 1, 0, 1)`,
    [`nw-${suffix}`, userId]
  );
  await db.query(
    `INSERT INTO monthly_budgets (id, user_id, category_id, month, year, budget_amount)
     VALUES (?, ?, ?, 0, 2026, 100)`,
    [`mb-${suffix}`, userId, `cat-${suffix}`]
  );
}

async function countRows(table: string, userId: string): Promise<number> {
  const db = await getDb();
  const result = await db.query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`,
    [userId]
  );
  return Number(result.rows[0].n);
}

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
  await seedUser(USER_A, 'a');
  await seedUser(USER_B, 'b');
});

describe('clearUserData', () => {
  it('removes every data row belonging to the requesting user', async () => {
    const result = await clearUserData(USER_A);
    expect(result.error).toBeUndefined();
    for (const table of USER_DATA_TABLES) {
      expect(await countRows(table, USER_A), `${table} should be empty for user A`).toBe(0);
    }
  });

  it('does not touch other users’ data', async () => {
    await clearUserData(USER_A);
    for (const table of USER_DATA_TABLES) {
      expect(await countRows(table, USER_B), `${table} should be intact for user B`).toBe(1);
    }
  });

  it('covers previously-omitted tables (recurring, liabilities, snapshots, templates, budgets)', () => {
    for (const table of [
      'recurring_transactions',
      'liabilities',
      'net_worth_snapshots',
      'budget_templates',
      'monthly_budgets',
    ]) {
      expect(USER_DATA_TABLES).toContain(table);
    }
  });

  it('preserves the user account itself', async () => {
    await clearUserData(USER_A);
    const db = await getDb();
    const users = await db.query(`SELECT id FROM users WHERE id = ?`, [USER_A]);
    expect(users.rowCount).toBe(1);
  });
});
