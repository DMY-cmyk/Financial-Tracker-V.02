import { describe, it, expect, beforeEach } from 'vitest';
import { decodeJwt } from 'jose';
import { POST } from '@/app/api/auth/login/route';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { registerUser, issueSessionForUser } from '@/server/services/auth.service';

const DAY = 60 * 60 * 24;

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

function tokenFromSetCookie(setCookie: string): string {
  const match = setCookie.match(/auth-token=([^;]+)/);
  expect(match).not.toBeNull();
  return match![1];
}

describe('POST /api/auth/login — keepSignedIn flag', () => {
  it('default: 7-day cookie AND 7-day JWT', async () => {
    const res = await POST(makeReq({ email: 'a@b.co', password: 'pw1234' }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('Max-Age=604800'); // 7 days

    const payload = decodeJwt(tokenFromSetCookie(setCookie));
    expect(payload.exp! - payload.iat!).toBe(7 * DAY);
  });

  it('keepSignedIn=true: 30-day cookie AND 30-day JWT', async () => {
    const res = await POST(makeReq({ email: 'a@b.co', password: 'pw1234', keepSignedIn: true }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('Max-Age=2592000'); // 30 days

    const payload = decodeJwt(tokenFromSetCookie(setCookie));
    expect(payload.exp! - payload.iat!).toBe(30 * DAY);
  });
});

describe('issueSessionForUser (OAuth callback)', () => {
  it('issues a 30-day token to match the 30-day cookie the callback sets', async () => {
    const reg = await registerUser('o@b.co', 'O', 'pw1234');
    const userId = (reg as { user: { id: string } }).user.id;
    const token = await issueSessionForUser(userId);
    const payload = decodeJwt(token);
    expect(payload.exp! - payload.iat!).toBe(30 * DAY);
  });
});
