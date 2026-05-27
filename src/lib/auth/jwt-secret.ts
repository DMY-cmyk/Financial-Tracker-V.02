/**
 * Single source of truth for the JWT signing/verification secret.
 *
 * Resolved lazily (per call, at request time) — NOT at module load — so that
 * `next build` in CI does not crash when JWT_SECRET is absent at build time.
 *
 * In production we refuse to fall back to a hardcoded default: an attacker who
 * read the source could otherwise forge a valid token for any user. In dev/test
 * we allow an insecure default for convenience.
 */
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length > 0) {
    return new TextEncoder().encode(secret);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production. ' +
        'Refusing to start with an insecure default secret.'
    );
  }
  return new TextEncoder().encode('financial-tracker-dev-only-insecure-secret');
}

export const JWT_ISSUER = 'financial-tracker';
