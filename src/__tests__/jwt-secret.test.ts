import { describe, it, expect, afterEach, vi } from 'vitest';
import { getJwtSecret } from '@/lib/auth/jwt-secret';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getJwtSecret', () => {
  it('uses the configured JWT_SECRET when present', () => {
    vi.stubEnv('JWT_SECRET', 'my-configured-secret');
    expect(getJwtSecret()).toEqual(new TextEncoder().encode('my-configured-secret'));
  });

  it('throws in production when JWT_SECRET is missing (no insecure fallback)', () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('falls back to a dev secret outside production', () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => getJwtSecret()).not.toThrow();
    expect(getJwtSecret().length).toBeGreaterThan(0);
  });
});
