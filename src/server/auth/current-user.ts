import type { NextRequest } from 'next/server';

/**
 * Stable user id used for:
 * 1. Demo / seed data on a fresh database (one row owns all sample content).
 * 2. Backfill default for legacy rows from single-tenant deployments.
 *
 * A real user signing in gets their own UUID. This row exists only so that
 * a brand-new install has *some* data to look at and existing single-tenant
 * data has an owner after migration. Do not reuse this id for real accounts.
 */
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Reads the authenticated user id forwarded by middleware via the
 * `x-user-id` request header.
 *
 * Returns the id string on success, or `null` when the caller is not
 * authenticated (e.g., a public endpoint that opted out of middleware).
 * The middleware already rejects unauthenticated requests for protected
 * paths, so a `null` return here means the route is explicitly public.
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  const id = request.headers.get('x-user-id');
  return id && id.length > 0 ? id : null;
}

/**
 * Same as `getUserIdFromRequest`, but throws when the caller is unauthenticated.
 * Use in API route handlers that mutate or expose per-user data.
 */
export function requireUserId(request: NextRequest): string {
  const id = getUserIdFromRequest(request);
  if (!id) {
    throw new Error('UNAUTHENTICATED: missing x-user-id header on protected route');
  }
  return id;
}
