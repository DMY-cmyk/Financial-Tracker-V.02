import { getDb } from './client';
import { getSampleData } from '@/data/sample-data';
import { DEMO_USER_ID } from '@/server/auth/current-user';

let seeded = false;

export function resetSeeded() {
  seeded = false;
}

export function markSeeded() {
  seeded = true;
}

export async function ensureSeeded() {
  if (seeded) return;

  const db = await getDb();

  // Always make sure the demo user exists. Owns all seed data; also serves as
  // the backfill target for pre-multitenant rows that have user_id = ''.
  await db.query(
    'INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING',
    [DEMO_USER_ID, 'demo@local', 'Demo', null]
  );

  const result = await db.query<{ c: number }>('SELECT COUNT(*) as c FROM transactions');

  if (result.rows[0]?.c > 0) {
    // Run migrations for existing data
    await migrateCategoryIds(db);
    await cleanup2025Data(db);
    await backfillUserIds(db);
    // Ensure "Saldo Awal" income category always exists (even on pre-existing databases)
    await db.query(
      'INSERT INTO categories (id, user_id, name, type, color, icon, budget) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
      ['cat-saldo-awal', DEMO_USER_ID, 'Saldo Awal', 'income', '#059669', 'wallet', 0]
    );
    seeded = true;
    return;
  }

  const data = getSampleData();

  // Seed categories first so we can resolve IDs for transactions
  for (const c of data.categories) {
    await db.query(
      'INSERT INTO categories (id, user_id, name, type, color, icon, budget) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [c.id, DEMO_USER_ID, c.name, c.type, c.color, c.icon, c.budget]
    );
  }

  // Ensure "Saldo Awal" income category always exists
  await db.query(
    'INSERT INTO categories (id, user_id, name, type, color, icon, budget) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
    ['cat-saldo-awal', DEMO_USER_ID, 'Saldo Awal', 'income', '#059669', 'wallet', 0]
  );

  // Build name→id map for category resolution
  const catMap = new Map(data.categories.map((c) => [c.name, c.id]));

  for (const t of data.transactions) {
    const categoryId = catMap.get(t.category) || '';
    await db.query(
      'INSERT INTO transactions (id, user_id, date, description, category, category_id, type, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [
        t.id,
        DEMO_USER_ID,
        t.date,
        t.description,
        t.category,
        categoryId,
        t.type,
        t.amount,
        t.paymentMethod,
        t.notes,
      ]
    );
  }

  // Icon overrides for seeded payment methods.
  // Keys are lowercased fragments of the name.
  const SEED_ICON_MAP: Record<string, string> = {
    bca: 'lucide:landmark',
    bri: 'lucide:landmark',
    bni: 'lucide:landmark',
    mandiri: 'lucide:landmark',
    bsi: 'lucide:landmark',
    maybank: 'lucide:landmark',
    cimb: 'lucide:landmark',
    danamon: 'lucide:landmark',
    permata: 'lucide:landmark',
    gopay: 'lucide:smartphone',
    ovo: 'lucide:smartphone',
    dana: 'lucide:smartphone',
    shopeepay: 'lucide:smartphone',
    linkaja: 'lucide:smartphone',
    cash: 'lucide:banknote',
    tunai: 'lucide:banknote',
  };

  for (const p of data.paymentMethods) {
    const lowerName = p.name.toLowerCase();
    const icon =
      Object.entries(SEED_ICON_MAP).find(([key]) => lowerName.includes(key))?.[1] ??
      p.icon ??
      'initials';
    await db.query(
      'INSERT INTO payment_methods (id, user_id, name, icon, type) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [p.id, DEMO_USER_ID, p.name, icon, p.type]
    );
  }
  for (const b of data.bills) {
    await db.query(
      'INSERT INTO bills (id, user_id, name, amount, due_date, is_paid, month, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [b.id, DEMO_USER_ID, b.name, b.amount, b.dueDate, b.isPaid ? 1 : 0, b.month, b.year]
    );
  }
  for (const s of data.savingsGoals) {
    await db.query(
      'INSERT INTO savings_goals (id, user_id, name, target_amount, saved_amount, color) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [s.id, DEMO_USER_ID, s.name, s.targetAmount, s.savedAmount, s.color]
    );
  }

  // Default settings (per-user — composite PK on (key, user_id))
  await db.query(
    'INSERT INTO settings (key, user_id, value) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
    ['theme', DEMO_USER_ID, 'system']
  );
  await db.query(
    'INSERT INTO settings (key, user_id, value) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
    ['locale', DEMO_USER_ID, 'en']
  );

  seeded = true;
}

/**
 * Backfill user_id = DEMO_USER_ID for any row still carrying the empty default.
 * Idempotent — affects only rows from before per-user scoping landed.
 */
async function backfillUserIds(db: {
  query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount: number }>;
}) {
  const tables = [
    'transactions',
    'categories',
    'payment_methods',
    'bills',
    'savings_goals',
    'settings',
    'uploads',
    'export_jobs',
    'recurring_transactions',
    'budget_templates',
    'liabilities',
    'net_worth_snapshots',
    'monthly_budgets',
  ];
  for (const table of tables) {
    await db.query(`UPDATE ${table} SET user_id = ? WHERE user_id = ''`, [DEMO_USER_ID]);
  }
}

/** One-time cleanup: delete all 2025 seed data from production */
async function cleanup2025Data(db: {
  query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount: number }>;
}) {
  const flag = await db.query<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'migration_cleanup_2025'"
  );
  if (flag.rows.length > 0) return;

  await db.query("DELETE FROM transactions WHERE date LIKE '2025-%'", []);
  await db.query('DELETE FROM bills WHERE year = 2025', []);
  await db.query("INSERT INTO settings (key, value) VALUES ('migration_cleanup_2025', 'done')", []);
}

/** Backfill category_id for any transactions that have an empty category_id */
async function migrateCategoryIds(db: {
  query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount: number }>;
}) {
  const orphaned = await db.query<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM transactions WHERE category_id = '' OR category_id IS NULL"
  );
  if ((orphaned.rows[0]?.cnt ?? 0) === 0) return;

  // Resolve from categories table
  await db.query(
    `UPDATE transactions SET category_id = (
      SELECT id FROM categories WHERE categories.name = transactions.category LIMIT 1
    ) WHERE (category_id = '' OR category_id IS NULL)
      AND EXISTS (SELECT 1 FROM categories WHERE categories.name = transactions.category)`,
    []
  );
}
