import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { generateVerifier, challengeFromVerifier } from '@/server/auth/pkce';

describe('pkce', () => {
  it('generates a verifier 43–128 chars long', () => {
    const v = generateVerifier();
    expect(v.length).toBeGreaterThanOrEqual(43);
    expect(v.length).toBeLessThanOrEqual(128);
    expect(v).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('challenge equals base64url(SHA256(verifier))', () => {
    const v = 'fixed-verifier-1234567890abcdefghij';
    const expected = createHash('sha256').update(v).digest('base64url');
    expect(challengeFromVerifier(v)).toBe(expected);
  });
});
