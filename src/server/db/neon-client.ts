/**
 * Neon serverless Postgres adapter.
 * Uses the HTTP-based neon() function (recommended for serverless).
 * Parameterised queries use $1, $2, ... syntax via .query() method.
 */

import { neon } from '@neondatabase/serverless';
import type { DbClient, QueryResult } from './client';

function convertPlaceholders(sql: string): string {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

export function createNeonClient(connectionString: string): DbClient {
  const sql = neon(connectionString, { fullResults: true });

  return {
    async query<T = Record<string, unknown>>(
      rawSql: string,
      params: unknown[] = []
    ): Promise<QueryResult<T>> {
      const pgSql = convertPlaceholders(rawSql);
      const result = await sql.query(pgSql, params);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },

    async exec(rawSql: string): Promise<void> {
      await sql.query(rawSql);
    },
  };
}
