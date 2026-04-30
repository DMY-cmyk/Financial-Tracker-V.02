import { getDb } from '@/server/db/client';

export interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export async function createResetToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: string;
}): Promise<PasswordResetTokenRow> {
  const id = crypto.randomUUID();
  const db = await getDb();
  await db.query(
    'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [id, input.userId, input.tokenHash, input.expiresAt]
  );
  const result = await db.query<PasswordResetTokenRow>(
    'SELECT * FROM password_reset_tokens WHERE id = ?',
    [id]
  );
  return result.rows[0];
}

export async function findResetTokenByHash(hash: string): Promise<PasswordResetTokenRow | null> {
  const db = await getDb();
  const result = await db.query<PasswordResetTokenRow>(
    'SELECT * FROM password_reset_tokens WHERE token_hash = ?',
    [hash]
  );
  return result.rows[0] ?? null;
}

export async function consumeResetToken(id: string): Promise<void> {
  const db = await getDb();
  await db.query('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}
