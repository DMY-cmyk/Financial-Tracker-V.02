import { NextRequest, NextResponse } from 'next/server';

type Bucket = { hits: number[] };

const STORE = new Map<string, Bucket>();
const MAX_KEYS = 5000;

/**
 * Best-effort per-IP rate limiter. Sliding window held in process memory.
 *
 * Trade-off: on Vercel Fluid Compute, instances are reused across requests so
 * this is effective; on a fan-out across many instances an attacker gets `limit`
 * attempts per instance. Sufficient for the single-tenant deployment this app
 * targets, but a shared store (KV / Redis / DB table) is the upgrade path.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Cheap eviction so a memory-pressure attacker can't grow the map forever.
  if (STORE.size > MAX_KEYS) {
    for (const [k, b] of STORE) {
      if (b.hits[b.hits.length - 1] < cutoff) STORE.delete(k);
    }
  }

  const bucket = STORE.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= limit) {
    const retryAfter = Math.ceil((bucket.hits[0] + windowMs - now) / 1000);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }

  bucket.hits.push(now);
  STORE.set(key, bucket);
  return { ok: true };
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: { message: 'Too many requests. Please try again later.', code: 'rate_limited' } },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

// Used by tests to reset the in-memory store between runs.
export function _resetRateLimitStore(): void {
  STORE.clear();
}
