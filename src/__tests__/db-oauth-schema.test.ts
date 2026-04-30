import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { getDb } from '@/server/db/client';

describe('db schema — oauth_accounts', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('has the expected columns', async () => {
    const db = await getDb();
    const result = await db.query<{ name: string }>(
      `SELECT name FROM pragma_table_info('oauth_accounts')`
    );
    const cols = result.rows.map((r) => r.name).sort();
    expect(cols).toEqual([
      'avatar_url',
      'created_at',
      'display_name',
      'email',
      'id',
      'provider',
      'provider_subject',
      'user_id',
    ]);
  });

  it('users.password_hash is nullable', async () => {
    const db = await getDb();
    const result = await db.query<{ name: string; notnull: number }>(
      `SELECT name, "notnull" FROM pragma_table_info('users')`
    );
    const ph = result.rows.find((c) => c.name === 'password_hash');
    expect(ph).toBeDefined();
    expect(ph!.notnull).toBe(0);
  });
});
