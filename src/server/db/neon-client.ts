/**
 * Neon serverless Postgres adapter.
 * Uses Pool-based API for parameterised queries with $1, $2, ... syntax.
 */

import { Pool } from '@neondatabase/serverless';
import type { DbClient, QueryResult } from './client';

function convertPlaceholders(sql: string): string {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

export function createNeonClient(connectionString: string): DbClient {
  const pool = new Pool({ connectionString });

  return {
    async query<T = Record<string, unknown>>(
      rawSql: string,
      params: unknown[] = []
    ): Promise<QueryResult<T>> {
      const pgSql = convertPlaceholders(rawSql);
      const result = await pool.query(pgSql, params);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },

    async exec(rawSql: string): Promise<void> {
      await pool.query(rawSql);
    },
  };
}
