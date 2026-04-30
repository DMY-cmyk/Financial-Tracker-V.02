import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/login/route';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { registerUser } from '@/server/services/auth.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
  await registerUser('a@b.co', 'A', 'pw1234');
});

function makeReq(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/auth/login — keepSignedIn flag', () => {
  it('default sets a 7-day cookie when keepSignedIn omitted', async () => {
    const res = await POST(makeReq({ email: 'a@b.co', password: 'pw1234' }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('Max-Age=604800'); // 7 days
  });

  it('sets a 30-day cookie when keepSignedIn=true', async () => {
    const res = await POST(makeReq({ email: 'a@b.co', password: 'pw1234', keepSignedIn: true }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('Max-Age=2592000'); // 30 days
  });
});
