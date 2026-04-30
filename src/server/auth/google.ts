const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

export interface BuildAuthUrlInput {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}

export function buildGoogleAuthUrl(input: BuildAuthUrlInput): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not set');
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', input.state);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('access_type', 'online');
  return url.toString();
}

export interface ExchangeInput {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface GoogleTokens {
  access_token: string;
  id_token: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(input: ExchangeInput): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google credentials not set');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: input.redirectUri,
    code_verifier: input.codeVerifier,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  return (await res.json()) as GoogleTokens;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

export async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`userinfo failed: ${res.status}`);
  return (await res.json()) as GoogleUserInfo;
}
