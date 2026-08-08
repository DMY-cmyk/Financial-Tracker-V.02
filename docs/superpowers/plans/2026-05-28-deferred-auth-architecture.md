# Deferred Auth Architecture Items

These were identified during the 2026-05-28 systematic-debugging audit but need
architectural decisions before code can land. Captured here so they aren't lost.

## #3 JWT revocation on logout

**Current state.** `POST /api/auth/logout` only deletes the client cookie. The
JWT remains valid until natural expiry (7d default, 30d when "keep me signed
in"). Stolen tokens cannot be invalidated.

**Why not a one-liner.** Middleware runs at the edge and uses `jose` for JWT
verification — no DB available. Any server-side revocation check has to happen
somewhere with a data store.

**Options to discuss.**

1. **Switch middleware to Node runtime + sessions table.** Add `sessions(jti,
   user_id, expires_at, revoked_at)`, store JTI in JWT, query on every request.
   Cost: ~5-20ms added per page view. Simplest to reason about.
2. **Short-lived access JWT + refresh token.** Access JWT 15 min, refresh token
   in DB rotated on use, logout deletes refresh row. Industry-standard but a
   full session-management rewrite.
3. **Server-side check in API routes only.** Middleware still gates pages, but
   each API route calls `requireValidSession(jti)` against the DB. Page shells
   may briefly render after logout but no data leaks. Lowest-risk migration.

**Recommendation:** Option 3 first (covers data exposure), Option 1 later if
the page-shell race becomes an actual concern.

## #12 CSRF

**Current state.** `auth-token` cookie is `SameSite=Lax`. This already blocks
cross-site POST/PUT/PATCH/DELETE — the canonical CSRF vector. Remaining gaps:

- GET-based state changes (we don't have any).
- Top-level navigation CSRF (e.g., a malicious link that triggers a side
  effect on a GET endpoint). Mitigated by keeping mutations on non-GET methods,
  which we already do.
- The narrow window where Lax allows cookies on top-level same-method
  navigations from cross-origin — only matters for endpoints that mutate on
  GET, which we don't have.

**Why not a quick patch.** Adding double-submit tokens means a new
`csrf-token` cookie + matching header on every fetch + server-side comparison
on every mutation. Roughly a dozen route handlers + every client mutation site
need to be touched.

**Recommendation:** Treat as covered by `SameSite=Lax` for the current threat
model. Revisit if we ever add GET-based mutations or third-party embedding.

## Related batch-A item also worth noting

**xlsx vulnerability.** `xlsx@*` has unfixed prototype pollution + ReDoS CVEs
(GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9). Project already depends on
`exceljs` for the report builder. Migrating remaining `xlsx` usage to
`exceljs` would remove both CVEs.
