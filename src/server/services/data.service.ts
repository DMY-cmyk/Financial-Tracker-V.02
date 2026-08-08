import { getDb } from '@/server/db/client';
import { ensureSeeded } from '@/server/db/seed';

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string };
}

/**
 * Every table holding per-user application data, in FK-safe delete order
 * (children before the categories they reference). Auth tables
 * (users, oauth_accounts, password_reset_tokens) are intentionally excluded —
 * clearing data must not sign the user out or unlink their account.
 */
export const USER_DATA_TABLES = [
  'monthly_budgets',
  'transactions',
  'recurring_transactions',
  'bills',
  'budget_templates',
  'savings_goals',
  'liabilities',
  'net_worth_snapshots',
  'categories',
  'payment_methods',
  'settings',
  'uploads',
  'export_jobs',
] as const;

export async function clearUserData(userId: string): Promise<ServiceResult<{ success: true }>> {
  await ensureSeeded();
  const db = await getDb();
  for (const table of USER_DATA_TABLES) {
    await db.query(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
  }
  return { data: { success: true } };
}
