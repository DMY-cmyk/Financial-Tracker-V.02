import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import {
  insertOAuthAccount,
  findOAuthAccount,
} from '@/server/repositories/oauth-account.repository';

describe('oauthAccountRepository', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('insert + find by (provider, subject)', async () => {
    await insertOAuthAccount({
      userId: 'u-1',
      provider: 'google',
      providerSubject: 'g-1',
      email: 'a@b.co',
      displayName: 'A',
      avatarUrl: 'p',
    });
    const found = await findOAuthAccount('google', 'g-1');
    expect(found?.user_id).toBe('u-1');
  });

  it('returns null when not found', async () => {
    const found = await findOAuthAccount('google', 'missing');
    expect(found).toBeNull();
  });
});
