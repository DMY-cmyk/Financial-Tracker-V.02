/**
 * Resolves the public base URL for this deployment. Used to build OAuth
 * redirect URIs that the provider will return to.
 *
 * In production we refuse to fall back to the request `origin` because an
 * attacker who can spoof the `Host` header could otherwise steer the OAuth
 * callback to a phishing domain. In dev/test we allow `origin` for ergonomics.
 *
 * Resolved lazily at request time (matches jwt-secret.ts) so `next build` in
 * CI does not crash when APP_URL is absent at build time.
 */
export function getAppUrl(requestOrigin: string): string {
  const fromEnv = process.env.APP_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'APP_URL environment variable is required in production. ' +
        'Refusing to derive OAuth redirect from untrusted request origin.'
    );
  }
  return requestOrigin.replace(/\/$/, '');
}
