import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
} from '@/lib/constants';

/**
 * Gives a freshly created user a usable starting point: default income and
 * expense categories plus common Indonesian payment methods. Without these a
 * new account cannot fill in the transaction form.
 *
 * No-op when the user already has categories, so re-running (e.g., a raced
 * signup callback) never duplicates. Failures are the caller's choice to
 * swallow — provisioning must never block account creation.
 */
export async function provisionDefaultsForUser(userId: string): Promise<void> {
  const db = await getDb();

  const existing = await db.query<{ n: number | string }>(
    'SELECT COUNT(*) AS n FROM categories WHERE user_id = ?',
    [userId]
  );
  if (Number(existing.rows[0]?.n ?? 0) > 0) return;

  for (const cat of [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES]) {
    await db.query(
      'INSERT INTO categories (id, user_id, name, type, color, icon, budget) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nanoid(), userId, cat.name, cat.type, cat.color, cat.icon, cat.budget]
    );
  }

  for (const pm of DEFAULT_PAYMENT_METHODS) {
    await db.query(
      'INSERT INTO payment_methods (id, user_id, name, icon, type, beginning_balance) VALUES (?, ?, ?, ?, ?, ?)',
      [nanoid(), userId, pm.name, pm.icon, pm.type, pm.beginningBalance ?? 0]
    );
  }
}
