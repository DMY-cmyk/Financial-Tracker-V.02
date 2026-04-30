import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/reset-password/route';
import { resetDb } from '@/server/db/client';
import { registerUser } from '@/server/services/auth.service';
import { requestPasswordReset } from '@/server/services/password-reset.service';

vi.mock('@/server/email/send', () => ({ sendMail: vi.fn().mockResolvedValue({ dev: true }) }));

describe('POST /api/auth/reset-password', () => {
  beforeEach(async () => {
    await resetDb();
  });

  function req(body: Record<string, unknown>) {
    return new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as Parameters<typeof POST>[0];
  }

  it('200 on valid token + password', async () => {
    await registerUser('a@b.co', 'A', 'pw1234');
    const issued = await requestPasswordReset({
      email: 'a@b.co',
      locale: 'en',
      appUrl: 'http://x',
    });
    const r = await POST(req({ token: issued.data!.devToken!, password: 'newpw1234' }));
    expect(r.status).toBe(200);
  });

  it('400 on invalid token', async () => {
    const r = await POST(req({ token: 'nope', password: 'newpw1234' }));
    expect(r.status).toBe(400);
  });
});
