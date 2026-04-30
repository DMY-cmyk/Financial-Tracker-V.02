import { getDb } from '@/server/db/client';

export interface OAuthAccountRow {
  id: string;
  user_id: string;
  provider: string;
  provider_subject: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface InsertOAuthAccountInput {
  userId: string;
  provider: string;
  providerSubject: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export async function insertOAuthAccount(input: InsertOAuthAccountInput): Promise<OAuthAccountRow> {
  const id = crypto.randomUUID();
  const db = await getDb();
  await db.query(
    `INSERT INTO oauth_accounts (id, user_id, provider, provider_subject, email, display_name, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.provider,
      input.providerSubject,
      input.email,
      input.displayName ?? null,
      input.avatarUrl ?? null,
    ]
  );
  const result = await db.query<OAuthAccountRow>('SELECT * FROM oauth_accounts WHERE id = ?', [id]);
  return result.rows[0];
}

export async function findOAuthAccount(
  provider: string,
  subject: string
): Promise<OAuthAccountRow | null> {
  const db = await getDb();
  const result = await db.query<OAuthAccountRow>(
    'SELECT * FROM oauth_accounts WHERE provider = ? AND provider_subject = ?',
    [provider, subject]
  );
  return result.rows[0] ?? null;
}
