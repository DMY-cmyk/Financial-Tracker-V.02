import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { buildGoogleAuthUrl } from '@/server/auth/google';
import { generateVerifier, challengeFromVerifier } from '@/server/auth/pkce';

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/google/callback`;
  const state = randomBytes(32).toString('hex');
  const verifier = generateVerifier();
  const challenge = challengeFromVerifier(verifier);

  const url = buildGoogleAuthUrl({ redirectUri, state, codeChallenge: challenge });
  const res = NextResponse.redirect(url);
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 600,
    path: '/',
  };
  res.cookies.set('oauth_state', state, opts);
  res.cookies.set('oauth_verifier', verifier, opts);
  return res;
}
