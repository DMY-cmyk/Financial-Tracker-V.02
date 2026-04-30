import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/auth/google/route';

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/auth/google', () => {
  it('redirects to Google with state + code_challenge cookies', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'cid');
    vi.stubEnv('APP_URL', 'http://localhost:3000');
    const req = new Request('http://localhost:3000/api/auth/google');
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(307); // NextResponse.redirect uses 307 by default
    expect(res.headers.get('location')).toContain('accounts.google.com');
    const cookies = res.headers.get('set-cookie') || '';
    expect(cookies).toContain('oauth_state=');
    expect(cookies).toContain('oauth_verifier=');
  });
});
