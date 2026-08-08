import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getDb, resetDb } from '@/server/db/client';

const clientSource = readFileSync(resolve('src/server/db/client.ts'), 'utf-8');

describe('users.password_hash must be nullable (OAuth-only accounts)', () => {
  it('fresh schema accepts a user with NULL password_hash', async () => {
    await resetDb();
    const db = await getDb();
    await db.query(
      `INSERT INTO users (id, email, name, password_hash) VALUES ('oauth-u', 'o@x.co', 'O', NULL)`
    );
    const r = await db.query(`SELECT id FROM users WHERE id = 'oauth-u'`);
    expect(r.rowCount).toBe(1);
  });

  it('ships a Postgres migration dropping legacy NOT NULL on password_hash', () => {
    // Production Neon databases created before Google OAuth declared
    // password_hash NOT NULL; without this migration, OAuth signups 500
    // with "null value in column password_hash violates not-null constraint".
    expect(clientSource).toMatch(/ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL/);
  });
});
