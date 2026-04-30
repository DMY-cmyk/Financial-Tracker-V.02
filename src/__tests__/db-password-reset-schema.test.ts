import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, getDb } from '@/server/db/client';

describe('db schema — password_reset_tokens', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('has the expected columns', async () => {
    const db = await getDb();
    const result = await db.query<{ name: string }>(
      `SELECT name FROM pragma_table_info('password_reset_tokens')`
    );
    const cols = result.rows.map((r) => r.name).sort();
    expect(cols).toEqual(['created_at', 'expires_at', 'id', 'token_hash', 'used_at', 'user_id']);
  });
});
