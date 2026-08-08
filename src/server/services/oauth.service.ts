import { getDb } from '@/server/db/client';
import {
  findOAuthAccount,
  insertOAuthAccount,
} from '@/server/repositories/oauth-account.repository';
import { provisionDefaultsForUser } from '@/server/services/user-provisioning.service';
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

  // Rule 2: existing email match → link ONLY if no password is set.
  // Auto-linking accounts that already have a password would let any Google
  // account holder on the same email hijack the password account. Users with
  // a password must explicitly link Google from settings (a future feature)
  // after authenticating with their password.
  const byEmail = await db.query<{
    id: string;
    email: string;
    name: string;
    password_hash: string | null;
  }>('SELECT id, email, name, password_hash FROM users WHERE email = ?', [emailLower]);
  if (byEmail.rows[0]) {
    if (byEmail.rows[0].password_hash) {
      return {
        error: {
          message: 'Account exists with password — sign in with password first to link Google',
          code: 'oauth_account_exists_password',
        },
      };
    }
    await insertOAuthAccount({
      userId: byEmail.rows[0].id,
      provider: 'google',
      providerSubject: profile.sub,
      email: emailLower,
      displayName: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
    });
    const { id, email, name } = byEmail.rows[0];
    return { data: { user: { id, email, name }, isNew: false } };
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
  try {
    await provisionDefaultsForUser(userId);
  } catch (err) {
    console.error('[oauth] default provisioning failed (account still created):', err);
  }
  return { data: { user: { id: userId, email: emailLower, name }, isNew: true } };
}
