import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { getDb } from '@/server/db/client';
import { registerUser } from '@/server/services/auth.service';
import { handleGoogleCallbackUser } from '@/server/services/oauth.service';
import { insertOAuthAccount } from '@/server/repositories/oauth-account.repository';

const profile = (over: Partial<{ sub: string; email: string; verified: boolean }> = {}) => {
  const merged = { sub: 'g-1', email: 'a@b.co', verified: true, ...over };
  return {
    sub: merged.sub,
    email: merged.email,
    email_verified: merged.verified,
    name: 'A',
    picture: 'p',
  };
};

describe('oauth service — linking rules', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('rule 1: returns existing user when oauth row exists', async () => {
    await registerUser('a@b.co', 'A', 'pw1234');
    const db = await getDb();
    const r1 = await db.query<{ id: string }>('SELECT id FROM users WHERE email = ?', ['a@b.co']);
    const userId = r1.rows[0].id;
    await insertOAuthAccount({
      userId,
      provider: 'google',
      providerSubject: 'g-1',
      email: 'a@b.co',
    });

    const r = await handleGoogleCallbackUser(profile());
    expect(r.error).toBeUndefined();
    expect(r.data!.user.id).toBe(userId);
    expect(r.data!.isNew).toBe(false);
  });

  it('rule 2: refuses to auto-link when existing user has a password', async () => {
    // A password-protected account on the same email could be hijacked if any
    // Google account holder on that address auto-linked. Refuse silently and
    // surface a code the UI can explain.
    await registerUser('a@b.co', 'A', 'pw1234');
    const r = await handleGoogleCallbackUser(profile());
    expect(r.error?.code).toBe('oauth_account_exists_password');
    expect(r.data).toBeUndefined();
  });

  it('rule 2: links existing passwordless email user when verified', async () => {
    // A user row with no password_hash can only have been created via OAuth
    // in the first place, so re-linking on email match is safe.
    const db = await getDb();
    const id = 'u-passwordless';
    await db.query('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', [
      id,
      'a@b.co',
      'A',
      null,
    ]);
    const r = await handleGoogleCallbackUser(profile());
    expect(r.error).toBeUndefined();
    expect(r.data!.isNew).toBe(false);
    expect(r.data!.user.id).toBe(id);
  });

  it('rule 3: creates new user when no email match', async () => {
    const r = await handleGoogleCallbackUser(profile({ email: 'new@example.com' }));
    expect(r.error).toBeUndefined();
    expect(r.data!.isNew).toBe(true);
  });

  it('rule 4: rejects unverified Google email', async () => {
    const r = await handleGoogleCallbackUser(profile({ verified: false }));
    expect(r.error?.code).toBe('oauth_email_unverified');
  });
});
