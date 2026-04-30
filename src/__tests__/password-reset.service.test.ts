import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetDb } from '@/server/db/client';
import { registerUser } from '@/server/services/auth.service';
import {
  requestPasswordReset,
  consumePasswordReset,
} from '@/server/services/password-reset.service';

vi.mock('@/server/email/send', () => ({
  sendMail: vi.fn().mockResolvedValue({ dev: true }),
}));

describe('passwordResetService', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('returns success for unknown email (no enumeration)', async () => {
    const r = await requestPasswordReset({
      email: 'nobody@example.com',
      locale: 'en',
      appUrl: 'http://x',
    });
    expect(r.error).toBeUndefined();
  });

  it('issues a usable token for an existing user', async () => {
    await registerUser('a@b.co', 'A', 'pw1234');
    const issued = await requestPasswordReset({
      email: 'a@b.co',
      locale: 'en',
      appUrl: 'http://x',
    });
    expect(issued.error).toBeUndefined();
    const raw = issued.data!.devToken!;
    const consumed = await consumePasswordReset({ rawToken: raw, newPassword: 'newpw1234' });
    expect(consumed.error).toBeUndefined();
  });

  it('rejects an already-used token', async () => {
    await registerUser('a@b.co', 'A', 'pw1234');
    const issued = await requestPasswordReset({
      email: 'a@b.co',
      locale: 'en',
      appUrl: 'http://x',
    });
    const raw = issued.data!.devToken!;
    await consumePasswordReset({ rawToken: raw, newPassword: 'newpw1234' });
    const second = await consumePasswordReset({ rawToken: raw, newPassword: 'evenmore' });
    expect(second.error?.code).toBe('TOKEN_INVALID');
  });

  it('rejects an expired token', async () => {
    await registerUser('a@b.co', 'A', 'pw1234');
    const issued = await requestPasswordReset({
      email: 'a@b.co',
      locale: 'en',
      appUrl: 'http://x',
      ttlMs: -1000,
    });
    const raw = issued.data!.devToken!;
    const r = await consumePasswordReset({ rawToken: raw, newPassword: 'newpw1234' });
    expect(r.error?.code).toBe('TOKEN_EXPIRED');
  });
});
