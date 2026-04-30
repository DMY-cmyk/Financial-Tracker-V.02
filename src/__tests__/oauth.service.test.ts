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

  it('rule 2: links existing email user when verified', async () => {
    await registerUser('a@b.co', 'A', 'pw1234');
    const r = await handleGoogleCallbackUser(profile());
    expect(r.error).toBeUndefined();
    expect(r.data!.isNew).toBe(false);
    expect(r.data!.user.email).toBe('a@b.co');
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
