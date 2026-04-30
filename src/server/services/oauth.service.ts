import { getDb } from '@/server/db/client';
import {
  findOAuthAccount,
  insertOAuthAccount,
} from '@/server/repositories/oauth-account.repository';
import type { GoogleUserInfo } from '@/server/auth/google';

type ServiceResult<T> = { data?: T; error?: { message: string; code: string } };

export interface OAuthCallbackResult {
  user: { id: string; email: string; name: string };
  isNew: boolean;
}

export async function handleGoogleCallbackUser(
  profile: GoogleUserInfo
): Promise<ServiceResult<OAuthCallbackResult>> {
  if (!profile.email_verified) {
    return { error: { message: 'Email not verified', code: 'oauth_email_unverified' } };
  }

  const db = await getDb();
  const emailLower = profile.email.toLowerCase();

  // Rule 1: existing oauth_accounts row → sign in that user
  const existing = await findOAuthAccount('google', profile.sub);
  if (existing) {
    const r = await db.query<{ id: string; email: string; name: string }>(
      'SELECT id, email, name FROM users WHERE id = ?',
      [existing.user_id]
    );
    if (r.rows[0]) return { data: { user: r.rows[0], isNew: false } };
  }

  // Rule 2: existing email match → link
  const byEmail = await db.query<{ id: string; email: string; name: string }>(
    'SELECT id, email, name FROM users WHERE email = ?',
    [emailLower]
  );
  if (byEmail.rows[0]) {
    await insertOAuthAccount({
      userId: byEmail.rows[0].id,
      provider: 'google',
      providerSubject: profile.sub,
      email: emailLower,
      displayName: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
    });
    return { data: { user: byEmail.rows[0], isNew: false } };
  }

  // Rule 3: create new user with no password
  const userId = crypto.randomUUID();
  const name = profile.name ?? emailLower.split('@')[0];
  await db.query('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', [
    userId,
    emailLower,
    name,
    null,
  ]);
  await insertOAuthAccount({
    userId,
    provider: 'google',
    providerSubject: profile.sub,
    email: emailLower,
    displayName: profile.name ?? null,
    avatarUrl: profile.picture ?? null,
  });
  return { data: { user: { id: userId, email: emailLower, name }, isNew: true } };
}
