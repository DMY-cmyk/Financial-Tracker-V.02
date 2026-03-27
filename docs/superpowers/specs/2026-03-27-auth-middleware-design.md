---
feature: Auth Middleware Enforcement
type: spec
date: 2026-03-27
status: draft
tier: 1
---

# Auth Middleware Enforcement — Design Spec

## Overview

The app has auth API routes (`/api/auth/login`, `/api/auth/register`, `/api/auth/me`) and a `users` table in the database, but no `middleware.ts` enforces authentication on any route. All pages and API routes are accessible without logging in. For a personal finance app, this is a critical security gap. This feature adds Next.js middleware that validates a JWT cookie on every request and redirects unauthenticated users to `/login`.

## Goals

- All page routes (except `/login`, `/register`) require authentication
- All `/api/*` routes (except `/api/auth/*`, `/api/health`) return 401 for unauthenticated requests
- Login/register flow sets a secure httpOnly JWT cookie
- Logout clears the cookie
- Auth state is accessible to client components via `GET /api/auth/me`

## Non-Goals

- No OAuth / social login
- No multi-user / role-based access control (single-user app)
- No two-factor authentication
- No refresh token rotation (7-day expiry, re-login required after expiry)
- No email verification

## Approaches

### Option A — JWT in httpOnly cookie + Next.js Edge Middleware (Recommended)
`middleware.ts` runs on Vercel Edge, validates a JWT on every request using `jose` (Edge-compatible). No DB hit per request.

**Pros:** Stateless (fast), no Redis needed, works on Vercel serverless Edge, `jose` is well-maintained and Edge-compatible.
**Cons:** JWT revocation is impossible until expiry (acceptable for personal app — just clear the cookie on logout).

### Option B — Signed session token in httpOnly cookie + DB lookup
`middleware.ts` validates a session token and looks up the session in DB on every request.

**Pros:** Token revocation possible.
**Cons:** DB hit on every request, not compatible with Edge middleware (Edge cannot use `better-sqlite3` or Neon driver directly), would require a dedicated session check API call from middleware.

### Option C — NextAuth.js
Third-party auth library with adapters.

**Pros:** Handles sessions, providers, CSRF.
**Cons:** Heavyweight dependency, opinionated, harder to customize for this specific app's DB schema. Overkill for single-user app.

**Recommendation: Option A.** JWT + `jose` + httpOnly cookie is the standard Next.js App Router auth pattern. Stateless, fast, no external dependencies beyond `jose`.

## Design

### Dependencies

```bash
npm install jose bcryptjs
npm install --save-dev @types/bcryptjs
```

### JWT Structure

```typescript
interface JWTPayload {
  userId: string
  email: string
  iat: number   // issued at
  exp: number   // expiry: iat + 7 days
}
```

Cookie: `__session`, `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 60 * 60 * 24 * 7` (7 days).

### Middleware (`middleware.ts` at project root)

```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — no auth needed
  const PUBLIC_PATHS = ['/login', '/register', '/api/auth', '/api/health']
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = request.cookies.get('__session')?.value

  if (!token) {
    // API routes: return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Page routes: redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    // Forward userId to API routes via header
    const response = NextResponse.next()
    response.headers.set('x-user-id', payload.userId as string)
    return response
  } catch {
    // Invalid/expired token
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('__session')
    return response
  }
}
```

### Auth Helper (`src/lib/auth.ts`)

```typescript
export async function getUser(request: Request): Promise<{ userId: string; email: string } | null>
export async function signJWT(payload: JWTPayload): Promise<string>
export async function hashPassword(password: string): Promise<string>
export async function verifyPassword(password: string, hash: string): Promise<boolean>
```

### Updated Auth API Routes

**`POST /api/auth/login`**
- Validate `{ email, password }` with Zod
- Find user by email in DB
- `verifyPassword(password, user.password_hash)` using bcryptjs
- On success: `signJWT({ userId, email })` → set `__session` cookie → return `{ user: { id, name, email } }`
- On failure: 401 `{ error: 'Invalid credentials' }`

**`POST /api/auth/register`**
- Validate `{ name, email, password }` with Zod (password min 8 chars)
- Check email uniqueness → 409 if exists
- `hashPassword(password)` → insert user → set `__session` cookie → return user
- First-time register should succeed even without existing users

**`POST /api/auth/logout`** (new route)
- Clear `__session` cookie → return 200

**`GET /api/auth/me`**
- Read `x-user-id` header (set by middleware) → query DB → return user info
- If header missing → 401

### Environment Variables

```env
JWT_SECRET=<random 32+ char string>   # Add to .env.local and Vercel dashboard
```

### Development Experience

For local development, the middleware still enforces auth. The dev workflow: visit `/register` to create your account, then log in. No "skip auth in dev" bypass — this prevents dev/prod behavior drift.

To simplify first-time setup: if the `users` table is empty and a `SKIP_AUTH=true` env var is set (development only), auto-redirect to `/register` instead of `/login`.

## i18n Keys

| Key | EN | ID |
|-----|----|----|
| `login` | "Sign In" | "Masuk" |
| `register` | "Create Account" | "Buat Akun" |
| `logout` | "Sign Out" | "Keluar" |
| `email` | "Email" | "Email" |
| `password` | "Password" | "Kata Sandi" |
| `name` | "Full Name" | "Nama Lengkap" |
| `invalidCredentials` | "Invalid email or password" | "Email atau kata sandi salah" |
| `sessionExpired` | "Your session has expired. Please sign in again." | "Sesi Anda telah berakhir. Silakan masuk kembali." |
| `loginRequired` | "Please sign in to continue" | "Silakan masuk untuk melanjutkan" |

## Testing

- `POST /api/auth/login` — correct credentials → sets cookie; wrong password → 401
- `POST /api/auth/register` — new email → creates user; duplicate email → 409
- `POST /api/auth/logout` — clears cookie
- Middleware: request without cookie → redirect to `/login`; API request without cookie → 401
- Middleware: expired/invalid JWT → same as no cookie
- `getUser()` helper: returns decoded payload from valid request headers

## Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| `JWT_SECRET` missing in production | Middleware will throw; add env var check at startup |
| Token expiry while user is active (7 days) | Middleware redirects to login; show "session expired" message using query param `?reason=expired` |
| Static files matched by middleware | Matcher excludes `_next/static`, `_next/image`, `.ico`, and files with extensions (`.js`, `.css`, `.png`, etc.) |
| CSRF — cookie with `sameSite: 'lax'` | Lax prevents cross-origin state-changing requests (POST) but allows GET navigation. Sufficient for this app. |
| First deploy with existing users in DB | Works — existing users just need to log in once to get the cookie |
| Single-user app: no user in DB | `/register` page is public — user creates account on first visit |
