import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/forgot-password/route';
import { resetDb } from '@/server/db/client';

vi.mock('@/server/email/send', () => ({ sendMail: vi.fn().mockResolvedValue({ dev: true }) }));

describe('POST /api/auth/forgot-password', () => {
  beforeEach(async () => {
    await resetDb();
  });

  function req(body: Record<string, unknown>) {
    return new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as Parameters<typeof POST>[0];
  }

  it('returns 200 even for unknown email', async () => {
    const res = await POST(req({ email: 'nobody@example.com', locale: 'en' }));
    expect(res.status).toBe(200);
  });

  it('rejects invalid email with 400', async () => {
    const res = await POST(req({ email: 'not-an-email', locale: 'en' }));
    expect(res.status).toBe(400);
  });
});
