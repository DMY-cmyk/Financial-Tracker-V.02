import { beforeEach, describe, expect, it } from 'vitest';
import { checkRateLimit, _resetRateLimitStore } from '@/lib/rate-limit';

describe('rate-limit', () => {
  beforeEach(() => {
    _resetRateLimitStore();
  });

  it('allows attempts up to the limit', () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit('k', 3, 60_000).ok).toBe(true);
    }
  });

  it('rejects the next attempt past the limit and reports retryAfter', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('k', 3, 60_000);
    const res = checkRateLimit('k', 3, 60_000);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.retryAfter).toBeGreaterThan(0);
  });

  it('isolates buckets by key', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a', 3, 60_000);
    expect(checkRateLimit('a', 3, 60_000).ok).toBe(false);
    expect(checkRateLimit('b', 3, 60_000).ok).toBe(true);
  });
});
