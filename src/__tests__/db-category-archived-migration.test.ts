import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getDb, resetDb } from '@/server/db/client';

const clientSource = readFileSync(resolve('src/server/db/client.ts'), 'utf-8');

describe('categories.archived column', () => {
  it('fresh schema defaults archived to 0 for inserts that omit it', async () => {
    await resetDb();
    const db = await getDb();
    await db.query(`INSERT INTO users (id, email, name) VALUES ('u1', 'u@x.co', 'U')`);
    await db.query(
      `INSERT INTO categories (id, user_id, name, type, color) VALUES ('c1', 'u1', 'Food', 'expense', '#000')`
    );
    const r = await db.query<{ archived: number }>(
      `SELECT archived FROM categories WHERE id = 'c1'`
    );
    expect(Number(r.rows[0].archived)).toBe(0);
  });

  it('ships the legacy-Postgres ALTER TABLE migration (playbook Tahap 2 rule)', () => {
    // Every new column needs BOTH the CREATE TABLE definition and a
    // columnMigrations entry — production Neon tables predate this column.
    expect(clientSource).toMatch(
      /ALTER TABLE categories ADD COLUMN IF NOT EXISTS archived INTEGER NOT NULL DEFAULT 0/
    );
  });
});
