/**
 * SQLite adapter (better-sqlite3) for local dev and tests.
 * Provides the same async DbClient interface, wrapping the sync API.
 */

import Database from 'better-sqlite3';
import type { DbClient, QueryResult } from './client';

export function createSqliteClient(dbPath?: string): DbClient {
  const resolvedPath = dbPath ?? ':memory:';
  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  // FK enforcement intentionally OFF for dev/test. The schema declares
  // REFERENCES ... ON DELETE CASCADE on every user-owned table; Postgres
  // enforces those in production. We leave SQLite permissive so unit tests
  // can insert rows with synthetic user_ids/category_ids without first
  // seeding the parent — app-layer guards (`deleteIfUnused`, scoped
  // queries) keep dev safe.
  db.pragma('foreign_keys = OFF');

  return {
    async query<T = Record<string, unknown>>(
      sql: string,
      params: unknown[] = []
    ): Promise<QueryResult<T>> {
      const stmt = db.prepare(sql);

      // Detect whether this is a SELECT/RETURNING or a mutation
      const trimmed = sql.trimStart().toUpperCase();
      if (trimmed.startsWith('SELECT') || trimmed.includes('RETURNING')) {
        const rows = stmt.all(...params) as T[];
        return { rows, rowCount: rows.length };
      }

      const info = stmt.run(...params);
      return { rows: [] as T[], rowCount: info.changes };
    },

    async exec(sql: string): Promise<void> {
      db.exec(sql);
    },
  };
}
