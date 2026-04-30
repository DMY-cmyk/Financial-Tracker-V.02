import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, fetchUserInfo } from '@/server/auth/google';
import { handleGoogleCallbackUser } from '@/server/services/oauth.service';
import { issueSessionForUser } from '@/server/services/auth.service';

function loginRedirect(origin: string, code: string) {
  return NextResponse.redirect(`${origin}/login?error=${code}`);
}

function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieJar = parseCookieHeader(request.headers.get('cookie'));
  const cookieState = cookieJar['oauth_state'];
  const cookieVerifier = cookieJar['oauth_verifier'];

  if (!code || !state || !cookieState || state !== cookieState || !cookieVerifier) {
    return loginRedirect(origin, 'oauth_state_mismatch');
  }

  try {
    const appUrl = process.env.APP_URL ?? origin;
    const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/google/callback`;
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier: cookieVerifier,
      redirectUri,
    });
    const profile = await fetchUserInfo(tokens.access_token);
    const result = await handleGoogleCallbackUser(profile);
    if (result.error) {
      return loginRedirect(origin, result.error.code);
    }
    const token = await issueSessionForUser(result.data!.user.id);
    const res = NextResponse.redirect(`${origin}/home`);
    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    res.cookies.delete('oauth_state');
    res.cookies.delete('oauth_verifier');
    return res;
  } catch (error) {
    console.error('[oauth/google/callback]', error);
    return loginRedirect(origin, 'oauth_provider_error');
  }
}
