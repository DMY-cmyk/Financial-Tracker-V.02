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
  // Use SQL that works on both SQLite and Postgres.
  //
  // FK enforcement:
  //   - Postgres enforces REFERENCES by default → user deletion cascades to
  //     all owned rows; monthly_budgets cascade with their category.
  //   - SQLite parses REFERENCES but does NOT enforce them unless
  //     `PRAGMA foreign_keys = ON` is set per connection. We deliberately
  //     leave it off in dev/test so tests that bypass `ensureSeeded` aren't
  //     forced to insert a user row first; the app-layer guards
  //     (`deleteIfUnused`, scoped queries) already cover that case in dev.
  //
  // Order matters for Postgres: a table referenced by FK must be created
  // before the table holding the FK. `users` comes first; `categories`
  // before `monthly_budgets`.
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'circle',
      budget BIGINT DEFAULT 0,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      category_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      amount BIGINT NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT DEFAULT '',
      source_recurring_id TEXT DEFAULT NULL,
      source_due_date TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'wallet',
      type TEXT NOT NULL,
      beginning_balance BIGINT NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount BIGINT NOT NULL,
      due_date INTEGER NOT NULL,
      is_paid INTEGER DEFAULT 0,
      is_recurring INTEGER DEFAULT 0,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      target_amount BIGINT NOT NULL,
      saved_amount BIGINT DEFAULT 0,
      color TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
      value TEXT NOT NULL,
      PRIMARY KEY (key, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
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
      user_id TEXT NOT NULL DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
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
      user_id TEXT NOT NULL DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      category_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      amount BIGINT NOT NULL,
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
    `CREATE TABLE IF NOT EXISTS oauth_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_subject TEXT NOT NULL,
      email TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(provider, provider_subject)
    )`,
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS budget_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category_budgets TEXT NOT NULL,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS liabilities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount BIGINT NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'other',
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS net_worth_snapshots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      total_assets BIGINT NOT NULL,
      total_liabilities BIGINT NOT NULL,
      net_worth BIGINT NOT NULL,
      snapshot_data TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(user_id, month, year)
    )`,
    `CREATE TABLE IF NOT EXISTS monthly_budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '' REFERENCES users(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      budget_amount BIGINT NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(user_id, category_id, month, year)
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
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS budget BIGINT DEFAULT 0`,
    `ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'wallet'`,
    `ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS beginning_balance BIGINT NOT NULL DEFAULT 0`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_recurring_id TEXT DEFAULT NULL`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_due_date TEXT DEFAULT NULL`,
    // OAuth-only accounts have no password. Postgres databases created before
    // Google OAuth declared password_hash NOT NULL — drop it so Rule-3 signups
    // can insert NULL. SQLite rejects ALTER COLUMN (absorbed by the
    // expected-error filter); its CREATE TABLE is already nullable.
    `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`,
    // user_id backfill for pre-existing single-tenant deployments.
    // New schema declares NOT NULL DEFAULT '' so freshly-created tables already
    // have the column. These statements only matter for Postgres databases that
    // existed before per-user scoping landed.
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE uploads ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE recurring_transactions ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE budget_templates ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE liabilities ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE net_worth_snapshots ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE monthly_budgets ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    // Money columns: convert legacy DOUBLE PRECISION → BIGINT (Postgres-only).
    // IDR has no sub-rupiah denominations in practice, so rounding any
    // fractional drift to the nearest integer is the desired semantic.
    // SQLite has no ALTER COLUMN TYPE syntax and will reject these — the
    // expected-error filter below treats that as a no-op (fresh SQLite
    // CREATE TABLE already declares these columns as BIGINT).
    `ALTER TABLE transactions ALTER COLUMN amount TYPE BIGINT USING ROUND(amount)::bigint`,
    `ALTER TABLE categories ALTER COLUMN budget TYPE BIGINT USING ROUND(budget)::bigint`,
    `ALTER TABLE payment_methods ALTER COLUMN beginning_balance TYPE BIGINT USING ROUND(beginning_balance)::bigint`,
    `ALTER TABLE bills ALTER COLUMN amount TYPE BIGINT USING ROUND(amount)::bigint`,
    `ALTER TABLE savings_goals ALTER COLUMN target_amount TYPE BIGINT USING ROUND(target_amount)::bigint`,
    `ALTER TABLE savings_goals ALTER COLUMN saved_amount TYPE BIGINT USING ROUND(saved_amount)::bigint`,
    `ALTER TABLE recurring_transactions ALTER COLUMN amount TYPE BIGINT USING ROUND(amount)::bigint`,
    `ALTER TABLE liabilities ALTER COLUMN amount TYPE BIGINT USING ROUND(amount)::bigint`,
    `ALTER TABLE net_worth_snapshots ALTER COLUMN total_assets TYPE BIGINT USING ROUND(total_assets)::bigint`,
    `ALTER TABLE net_worth_snapshots ALTER COLUMN total_liabilities TYPE BIGINT USING ROUND(total_liabilities)::bigint`,
    `ALTER TABLE net_worth_snapshots ALTER COLUMN net_worth TYPE BIGINT USING ROUND(net_worth)::bigint`,
    `ALTER TABLE monthly_budgets ALTER COLUMN budget_amount TYPE BIGINT USING ROUND(budget_amount)::bigint`,
    // FK constraints (Postgres-only). NOT VALID skips re-checking existing
    // rows; new INSERTs are validated. SQLite parses REFERENCES inline but
    // does not enforce them without PRAGMA foreign_keys = ON; these ADD
    // CONSTRAINT statements throw syntax errors there and are absorbed by
    // the expected-error filter.
    `ALTER TABLE categories ADD CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE transactions ADD CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE payment_methods ADD CONSTRAINT fk_payment_methods_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE bills ADD CONSTRAINT fk_bills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE savings_goals ADD CONSTRAINT fk_savings_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE settings ADD CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE uploads ADD CONSTRAINT fk_uploads_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE export_jobs ADD CONSTRAINT fk_export_jobs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE recurring_transactions ADD CONSTRAINT fk_recurring_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE budget_templates ADD CONSTRAINT fk_budget_templates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE liabilities ADD CONSTRAINT fk_liabilities_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE net_worth_snapshots ADD CONSTRAINT fk_net_worth_snapshots_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE monthly_budgets ADD CONSTRAINT fk_monthly_budgets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE monthly_budgets ADD CONSTRAINT fk_monthly_budgets_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE oauth_accounts ADD CONSTRAINT fk_oauth_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
    `ALTER TABLE password_reset_tokens ADD CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID`,
  ];

  for (const migration of columnMigrations) {
    try {
      await client.exec(migration);
    } catch (err) {
      // Expected on cold start:
      //   - Postgres re-run: "column already exists" / "duplicate column"
      //   - SQLite: doesn't support IF NOT EXISTS on ALTER TABLE ADD COLUMN
      //     and will reject with `near "EXISTS": syntax error`. The columns
      //     are already declared in CREATE TABLE above, so it's safe to skip.
      // Anything else is a real schema-migration failure and must be surfaced.
      const msg = err instanceof Error ? err.message : String(err);
      const expected =
        /duplicate column|already exists|near "EXISTS": syntax error|near "ALTER": syntax error|near "TYPE": syntax error|near "ADD": syntax error|near "NOT": syntax error|near "CONSTRAINT": syntax error|already a constraint/i.test(
          msg
        );
      if (!expected) {
        console.warn('[db migration]', migration, '→', msg);
      }
    }
  }

  // Performance indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id, year, month)',
    'CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_export_jobs_user ON export_jobs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_recurring_tx_user ON recurring_transactions(user_id, next_due_date)',
    'CREATE INDEX IF NOT EXISTS idx_budget_templates_user ON budget_templates(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_liabilities_user ON liabilities(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_net_worth_user ON net_worth_snapshots(user_id, year, month)',
    'CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user ON monthly_budgets(user_id, year, month)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method)',
    'CREATE INDEX IF NOT EXISTS idx_bills_month_year ON bills(month, year)',
    'CREATE INDEX IF NOT EXISTS idx_recurring_tx_next_due ON recurring_transactions(next_due_date)',
    'CREATE INDEX IF NOT EXISTS idx_recurring_tx_active ON recurring_transactions(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source_recurring_id, source_due_date) WHERE source_recurring_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_monthly_budgets_year ON monthly_budgets(year)',
    'CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_prt_hash ON password_reset_tokens(token_hash)',
    'CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id)',
  ];

  for (const idx of indexes) {
    await client.exec(idx);
  }
}
