import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildGoogleAuthUrl, exchangeCodeForTokens, fetchUserInfo } from '@/server/auth/google';

beforeEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('google auth helpers', () => {
  it('buildGoogleAuthUrl includes required query params', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'cid');
    const url = new URL(buildGoogleAuthUrl({ redirectUri: 'http://x/cb', state: 's', codeChallenge: 'c' }));
    expect(url.host).toBe('accounts.google.com');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('redirect_uri')).toBe('http://x/cb');
    expect(url.searchParams.get('state')).toBe('s');
    expect(url.searchParams.get('code_challenge')).toBe('c');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('response_type')).toBe('code');
  });

  it('exchangeCodeForTokens posts to token endpoint with code+verifier', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'cid');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'csec');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'at', id_token: 'it', expires_in: 3600 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const tokens = await exchangeCodeForTokens({ code: 'c', codeVerifier: 'v', redirectUri: 'http://x/cb' });
    expect(tokens.access_token).toBe('at');
    expect(fetchMock.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');
  });

  it('fetchUserInfo reads userinfo with bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sub: 'g-1', email: 'a@b.c', email_verified: true, name: 'A', picture: 'p' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const u = await fetchUserInfo('at');
    expect(u.sub).toBe('g-1');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer at');
  });
});
