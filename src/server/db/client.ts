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
    clientPromise = initClient();
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
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      due_date INTEGER NOT NULL,
      is_paid INTEGER DEFAULT 0,
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
  ];

  for (const ddl of tables) {
    await client.exec(ddl);
  }
}
