/**
 * Database abstraction layer.
 *
 * Uses Neon Postgres when DATABASE_URL is set (production / Vercel),
 * falls back to better-sqlite3 in-memory for local dev and tests.
 */

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  /** Run a parameterised query. Use `?` placeholders. */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  /** Execute raw DDL / multi-statement SQL (no params). */
  exec(sql: string): Promise<void>;
}

let clientPromise: Promise<DbClient> | null = null;

export async function getDb(): Promise<DbClient> {
  if (!clientPromise) {
    clientPromise = initClient().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

export async function resetDb(): Promise<void> {
  // Force re-creation — used by tests
  clientPromise = null;
  const { createSqliteClient } = await import('./sqlite-client');
  const client = createSqliteClient(':memory:');
  await initializeSchema(client);
  clientPromise = Promise.resolve(client);
}

async function initClient(): Promise<DbClient> {
  let client: DbClient;

  if (process.env.DATABASE_URL) {
    const { createNeonClient } = await import('./neon-client');
    client = createNeonClient(process.env.DATABASE_URL);
  } else {
    const { createSqliteClient } = await import('./sqlite-client');
    client = createSqliteClient();
  }

  await initializeSchema(client);
  return client;
}

async function initializeSchema(client: DbClient): Promise<void> {
  // Use SQL that works on both SQLite and Postgres
  const tables = [
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      category_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT DEFAULT '',
      source_recurring_id TEXT DEFAULT NULL,
      source_due_date TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'circle',
      budget DOUBLE PRECISION DEFAULT 0,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'wallet',
      type TEXT NOT NULL,
      beginning_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      due_date INTEGER NOT NULL,
      is_paid INTEGER DEFAULT 0,
      is_recurring INTEGER DEFAULT 0,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_amount DOUBLE PRECISION NOT NULL,
      saved_amount DOUBLE PRECISION DEFAULT 0,
      color TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      mime_type TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      extracted_data TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS export_jobs (
      id TEXT PRIMARY KEY,
      format TEXT NOT NULL,
      scope TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      filters TEXT DEFAULT NULL,
      options TEXT DEFAULT NULL,
      filename TEXT DEFAULT NULL,
      record_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      completed_at TEXT DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      category_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT DEFAULT '',
      frequency TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT DEFAULT NULL,
      next_due_date TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS budget_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category_budgets TEXT NOT NULL,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS liabilities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'other',
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS net_worth_snapshots (
      id TEXT PRIMARY KEY,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      total_assets DOUBLE PRECISION NOT NULL,
      total_liabilities DOUBLE PRECISION NOT NULL,
      net_worth DOUBLE PRECISION NOT NULL,
      snapshot_data TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(month, year)
    )`,
    `CREATE TABLE IF NOT EXISTS monthly_budgets (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      budget_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(category_id, month, year)
    )`,
  ];

  for (const ddl of tables) {
    await client.exec(ddl);
  }

  // Column migrations for existing tables that may lack newer columns.
  // Uses IF NOT EXISTS (Postgres 9.6+); try/catch for SQLite compatibility.
  const columnMigrations = [
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE recurring_transactions ADD COLUMN IF NOT EXISTS category_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'circle'`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS budget DOUBLE PRECISION DEFAULT 0`,
    `ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'wallet'`,
    `ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS beginning_balance DOUBLE PRECISION NOT NULL DEFAULT 0`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_recurring_id TEXT DEFAULT NULL`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_due_date TEXT DEFAULT NULL`,
  ];

  for (const migration of columnMigrations) {
    try {
      await client.exec(migration);
    } catch {
      // Column already exists or SQLite (doesn't support IF NOT EXISTS in ALTER TABLE)
    }
  }

  // Performance indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method)',
    'CREATE INDEX IF NOT EXISTS idx_bills_month_year ON bills(month, year)',
    'CREATE INDEX IF NOT EXISTS idx_recurring_tx_next_due ON recurring_transactions(next_due_date)',
    'CREATE INDEX IF NOT EXISTS idx_recurring_tx_active ON recurring_transactions(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source_recurring_id, source_due_date) WHERE source_recurring_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_monthly_budgets_year ON monthly_budgets(year)',
  ];

  for (const idx of indexes) {
    await client.exec(idx);
  }
}
