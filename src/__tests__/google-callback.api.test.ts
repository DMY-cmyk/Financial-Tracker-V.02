import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/auth/google/callback/route';
import { resetDb } from '@/server/db/client';

vi.mock('@/server/auth/google', () => ({
  exchangeCodeForTokens: vi
    .fn()
    .mockResolvedValue({ access_token: 'at', id_token: 'it', expires_in: 3600 }),
  fetchUserInfo: vi.fn().mockResolvedValue({
    sub: 'g-1',
    email: 'new@example.com',
    email_verified: true,
    name: 'N',
  }),
}));

function reqWithCookies(query: string, cookies: Record<string, string>) {
  const r = new Request(`http://localhost:3000/api/auth/google/callback${query}`, {
    headers: {
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
    },
  });
  return r as unknown as Parameters<typeof GET>[0];
}

beforeEach(async () => {
  await resetDb();
});

describe('GET /api/auth/google/callback', () => {
  it('redirects to /home on success and sets auth-token cookie', async () => {
    const res = await GET(reqWithCookies('?code=c&state=s', { oauth_state: 's', oauth_verifier: 'v' }));
    expect([302, 307]).toContain(res.status);
    expect(res.headers.get('location')).toMatch(/\/home$/);
    const cookies = res.headers.get('set-cookie') || '';
    expect(cookies).toContain('auth-token=');
  });

  it('redirects to /login?error=oauth_state_mismatch on state mismatch', async () => {
    const res = await GET(
      reqWithCookies('?code=c&state=DIFFERENT', { oauth_state: 's', oauth_verifier: 'v' })
    );
    expect([302, 307]).toContain(res.status);
    expect(res.headers.get('location')).toContain('error=oauth_state_mismatch');
  });
});
