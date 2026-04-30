# Editorial Theme + Login Redesign

**Date:** 2026-04-30
**Status:** Spec approved, plan pending
**Source design:** `.design-bundle/` (Claude Design handoff bundle, fetched 2026-04-30)
**Bundle key files:** `project/Financial Tracker.html`, `styles/tokens.css`, `styles/animations.css`, `components/login.jsx`, `components/dashboard.jsx`, `chats/chat1.md`

## Goal

Adopt the editorial design language from the handoff bundle as the app's primary visual system, and redesign the authentication surface (Login, Register, Forgot Password) to match. Keep all 10 product screens (Dashboard, Transactions, etc.) functionally unchanged this round — they will repaint in the new palette automatically by virtue of inheriting tokens, with a one-pass pass to convert hardcoded hex values to tokens. Editorial widget-level redesign of the dashboard is explicitly deferred.

## Decisions Locked During Brainstorming

| # | Decision | Choice |
|---|---|---|
| 1 | Scope | Theme tokens + Login (no other screen redesigns) |
| 2 | Token strategy | Replace current tokens sitewide; existing components inherit new palette via existing variable mapping |
| 3 | Light/Dark | `.dark` class toggles between Modernist Light (default) and Midnight Dark |
| 4 | Login auth surface | Visual redesign + real Google OAuth (hand-rolled) + functional secondary routes |
| 5 | Forgot Password | Full backend with real email via Resend |
| 6 | Token integration | Extend `@theme inline` in `globals.css`; existing Tailwind utilities (`bg-background`, etc.) keep working |

## Visual System

### Fonts
- **Geist** — body sans (replaces Plus Jakarta Sans). Loaded via `next/font/google` in `app/layout.tsx`.
- **Geist Mono** — numerals, eyebrows, technical labels (replaces JetBrains Mono).
- **Fraunces** — italic display for editorial accents only (Login hero, page mastheads, AI quotes). `display: swap`.

### Tokens (`src/app/globals.css`)

Replace existing `@theme inline` body and `:root` block:

```css
:root {
  --paper:     #ffffff;
  --paper-2:   #f4f4f2;
  --ink:       #0a0a0a;
  --ink-2:     #1a1a1a;
  --ink-3:     #6b6b6b;
  --rule:      #0a0a0a;
  --rule-soft: #e6e6e3;
  --card:      #ffffff;
  --card-2:    #fafaf8;
  --accent:    #ff5b1f;
  --accent-2:  #0a0a0a;
  --pos:       #1f5b3e;
  --pos-soft:  #e3f0e6;
  --neg:       #a8341f;
  --neg-soft:  #fbe1da;
  --warn:      #a76b1c;
  --warn-soft: #f3deb6;
  --r-sm: 4px; --r-md: 8px; --r-lg: 14px; --r-xl: 20px;
}

.dark {
  --paper:     #14110d;
  --paper-2:   #1c1813;
  --ink:       #f6f1e8;
  --ink-2:     #d9cfb9;
  --ink-3:     #97907f;
  --rule:      #f6f1e8;
  --rule-soft: #2e2820;
  --card:      #1c1813;
  --card-2:    #221d16;
  --accent:    #d3b266;
  --accent-2:  #e87a52;
  --pos:       #7cc295;
  --pos-soft:  #234534;
  --neg:       #e88871;
  --neg-soft:  #4a261d;
  --warn:      #e0b169;
}
```

Existing `@theme inline` mapping continues unchanged: `--color-background: var(--paper)`, `--color-foreground: var(--ink)`, `--color-card: var(--card)`, `--color-border: var(--rule-soft)`, `--color-primary: var(--accent)`, etc. All current `bg-background`/`text-foreground`/`border-border` Tailwind classes keep working.

### Editorial utility classes

Added as plain CSS in `globals.css` (NOT Tailwind utilities — they're hand-rolled and used selectively):

| Class | Spec |
|---|---|
| `.ft-display` | Fraunces italic, weight 400, `letter-spacing: -0.015em`, `line-height: 0.95` |
| `.ft-display-up` | Fraunces upright, weight 600, `letter-spacing: -0.02em`, `line-height: 0.95` |
| `.ft-mono` | Geist Mono with `font-feature-settings: "tnum", "ss01"` |
| `.ft-eyebrow` | 10px Geist Mono uppercase, `letter-spacing: 0.18em`, color `var(--ink-3)` |
| `.ft-rule` | `border-top: 1px solid var(--rule)` |
| `.ft-rule-soft` | `border-top: 1px solid var(--rule-soft)` |
| `.ft-live-dot` | 6px circle, `var(--accent-2)` fill, `ftPulseSoft` infinite |
| `.ft-tile-hover` | Transition + `translateY(-2px)` on hover |
| `.ft-rise`, `.ft-rise-1..6` | Stagger entrance — 600ms ease, 80ms increments |
| `.ft-bar-grow` | `transform-origin: left; scaleX(0)→scaleX(1)` 900ms |
| `.ft-shimmer` | Linear gradient skeleton shimmer |

All animations have `@media (prefers-reduced-motion: reduce)` overrides that disable them.

### Compatibility pass

Grep the codebase for hardcoded blue/emerald/red/amber hex values and Tailwind color classes that semantically should be tokens. Convert:
- `#2563EB`, `bg-blue-600`, `text-blue-*` → `var(--accent)` / `bg-accent` / `text-accent`
- `#10b981`, `bg-emerald-*` (when meaning income/positive) → `var(--pos)` / `bg-success`
- `#ef4444`, `bg-red-*` (when meaning expense/destructive) → `var(--neg)` / `bg-destructive`
- `bg-gradient-to-br from-blue-50 via-white to-emerald-50` (currently on Login) → replaced by new editorial split layout
- Other gradient uses on `home`, `dashboard` mastheads → reviewed case-by-case, replaced with `var(--paper-2)` band + hairline rule where appropriate

### Numeral upgrades

Surgical addition of `font-mono` (or `.ft-mono`) to all currency amounts, dates, percentages, ratios in:
- Dashboard tiles, balance cards
- Transaction table rows + amounts
- Bills, savings progress, budget bars
- Net worth, insights, forecast, calendar amounts

Mechanical changes, ~15–20 components touched.

## Login Page

### Route + layout

`src/app/login/page.tsx` is rewritten to a full-viewport split-panel:

- **Left panel** (`var(--paper-2)` background, hairline `border-right`): editorial hero — masthead "FINANCIAL TRACKER.", italic Fraunces dek, live cashflow ribbon, three counting stats (Net worth / This month / Categories), market ticker.
- **Right panel** (`var(--paper)` background): sign-in form — email + password fields, "Keep me signed in for 30 days" checkbox, primary CTA, "OR" divider, Google button, Forgot/Create links, "● TLS · END-TO-END ENCRYPTED · v 2.0.4" footer.

At viewports `< lg` (1024px), the left panel collapses: only masthead + dek render above the form; ribbon/counters/ticker hide. No separate mobile component file.

### Component tree (`src/components/login/`)

| File | Purpose |
|---|---|
| `EditorialHero.tsx` | Left panel composition. Reused by `/register` and `/forgot-password`. Props: `locale`, optional `eyebrow`, optional `dek` overrides |
| `LiveRibbon.tsx` | SVG cashflow ribbon: 30-point sinusoidal path, gradient area fill, dashed stroke with `ftFlow` 4s linear infinite, pulsing endpoint circle |
| `CountStat.tsx` | requestAnimationFrame counter, eased cubic, 1400ms duration. Props: `label`, `target`, `format`, `color` |
| `MarketTicker.tsx` | Marquee — 6 mock quotes triplicated, `ftMarq` 32s linear infinite, edge fade-mask |
| `LoginForm.tsx` | Form logic + UI. Submits to existing `/api/auth/login` |
| `EditorialField.tsx` | Square-cornered input with focus glow (border + bg shift). Used by Login, Register, Forgot, Reset |
| `hero-data.ts` | Mock data for hero (Rp 184.5M net worth, +Rp 3.21M this month, 36 categories, 6 ticker rows) |

### Behavioral details

- Stagger entrance: masthead, dek, ribbon, counters, fields each get `.ft-rise-N` (80ms apart).
- Submit pending: button text "Opening the books…" + spinner; button `scale(0.99)` on press.
- `?reason=expired` banner: editorial restyle (single hairline border, mono eyebrow "SESSION ENDED").
- `keepSignedIn` boolean added to `/api/auth/login` request body. Backend `setSession()` writes `Max-Age: 30 days` when true; otherwise current default.
- Theme mini-toggle (Light/Dark) in top-right of right panel for pre-auth preview, persists to same Zustand store.

### Register page (`src/app/register/page.tsx`)

Same `EditorialHero` on the left, registration form on the right styled to match `LoginForm` vocabulary. Form logic unchanged.

## Forgot Password Flow

### Routes

- `/forgot-password` — request email
- `/reset-password?token=…` — set new password

Both use `EditorialHero` on the left.

### API

- `POST /api/auth/forgot-password` — body `{ email }`. Always returns 200 (no enumeration). If user exists: generate 32-byte random token, store SHA-256 hash + `expires_at` (1 hour from now), send email.
- `POST /api/auth/reset-password` — body `{ token, password }`. Validates hash + expiry + unused, updates user `password_hash` (bcrypt), marks token `used_at`.

### Schema migration

Added to `src/server/db/sqlite.ts` schema init:

```sql
CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_prt_user ON password_reset_tokens(user_id);
CREATE INDEX idx_prt_hash ON password_reset_tokens(token_hash);
```

### File layout

| File | Role |
|---|---|
| `src/server/repositories/password-reset.repository.ts` | CRUD on tokens |
| `src/server/services/password-reset.service.ts` | Generate/verify/consume tokens. Returns `ServiceResult` |
| `src/server/email/client.ts` | Resend singleton |
| `src/server/email/send.ts` | `sendMail({ to, subject, html, text })` wrapper |
| `src/server/email/templates/password-reset.ts` | EN + ID HTML templates (editorial styling, plaintext fallback) |
| `src/app/api/auth/forgot-password/route.ts` | POST handler |
| `src/app/api/auth/reset-password/route.ts` | POST handler |
| `src/app/forgot-password/page.tsx` | UI |
| `src/app/reset-password/page.tsx` | UI (with password strength meter) |

### Env vars (added to `.env.example`)

```
RESEND_API_KEY=
EMAIL_FROM=
APP_URL=http://localhost:3000
```

### Failure mode

In dev (no `RESEND_API_KEY`): `sendMail` logs reset URL to `console.log`, returns success — dev iteration doesn't require Resend.
In production: missing key → 500 with code `EMAIL_NOT_CONFIGURED`.

### UI states

- Forgot Password page: email field + "Send reset link →". Below: italic Fraunces 14px copy "We'll email a link valid for 1 hour."
- Submitted state: form swaps to confirmation panel — mono eyebrow "CHECK YOUR EMAIL", italic display "Sent." headline, resend link with 30s cooldown.
- Reset Password page: two password fields with strength meter (paper-2 bar fills with `--accent` in 4 segments — score 0/4 (empty), 1/4 (≥8 chars), 2/4 (+ mixed case), 3/4 (+ digit), 4/4 (+ symbol)). Submit disabled until score ≥ 2/4 AND fields match.

## Google OAuth

OAuth 2.0 authorization code with PKCE, no third-party SDK.

### Flow

```
User clicks "Continue with Google"
  → GET /api/auth/google
    → generate state (32-byte) → cookie `oauth_state` (httpOnly, Secure, SameSite=Lax, 10-min Max-Age)
    → generate code_verifier (PKCE) → cookie `oauth_verifier` (same flags)
    → 302 to accounts.google.com (scope: openid email profile, code_challenge: SHA-256)
  → User approves
  → GET /api/auth/google/callback?code=…&state=…
    → verify state cookie matches query
    → POST to token endpoint (code + code_verifier)
    → GET userinfo with access_token → { sub, email, name, picture, email_verified }
    → upsert user (linking rules below)
    → setSession() (30-day cookie)
    → 302 to /home
```

### Schema migration

```sql
-- users.password_hash made nullable (Google-only users)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
-- (in practice: SQLite requires table rebuild; init script creates it nullable from the start)

CREATE TABLE oauth_accounts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(provider, provider_subject)
);
CREATE INDEX idx_oauth_user ON oauth_accounts(user_id);
```

### Linking rules in `/api/auth/google/callback`

1. If `oauth_accounts(provider='google', provider_subject=sub)` exists → sign in that user.
2. Else if `users.email = email` exists AND Google `email_verified = true` → link (insert `oauth_accounts` row), sign in.
3. Else → create new `users` (no password), insert `oauth_accounts`, sign in. Redirect to `/home` (or future `/onboarding` if it exists).
4. If `email_verified = false` → reject with code `oauth_email_unverified`.

### File layout

| File | Role |
|---|---|
| `src/server/auth/google.ts` | Build auth URL, exchange code for tokens, fetch userinfo |
| `src/server/auth/pkce.ts` | `generateVerifier()`, `challengeFromVerifier()` (crypto.randomBytes + SHA-256) |
| `src/server/repositories/oauth-account.repository.ts` | CRUD |
| `src/server/services/oauth.service.ts` | Linking logic. Returns `ServiceResult<{ user, isNew }>` |
| `src/app/api/auth/google/route.ts` | GET — kicks off flow |
| `src/app/api/auth/google/callback/route.ts` | GET — handles return |

### Env vars

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

In production: per-environment Vercel env vars; `GOOGLE_REDIRECT_URI` built from `APP_URL` in code so preview deploys don't need hardcoded callback URLs.

### Security details

- All OAuth cookies httpOnly + Secure + SameSite=Lax, 10-min Max-Age, deleted on callback.
- PKCE keeps client_secret server-only.
- `id_token` JWT signature **not** verified locally — we fetch userinfo with the access_token. Trade-off: extra HTTP roundtrip; avoids JWKS handling. Acceptable at this scale.
- Errors redirect to `/login?error=<code>`. Codes: `oauth_state_mismatch`, `oauth_email_unverified`, `oauth_provider_error`.
- "Keep me signed in for 30 days" does NOT apply to OAuth — OAuth always issues 30-day session.

## Theme Toggle

No mechanism changes. Existing Zustand `ui.theme` ('light' | 'dark' | 'system') keeps working. `.dark` class on `<html>`.

Verified additions:
- Inline first-paint script in `app/layout.tsx` (if missing) reads `localStorage.theme` and adds `.dark` before hydration to prevent flash.
- Settings toggle restyled to editorial 3-segment switch (mono labels, hairline borders, accent fill).
- Login mini-toggle (top-right of right panel) for pre-auth preview.

No transition animation on theme change (instant CSS variable swap).

## i18n

~30 new keys in `src/lib/i18n.ts` for both EN and ID:

- Login hero: "A reading of your money…", "LIVE · LAST 30 DAYS", "Net worth", "This month", "Categories", "Welcome back."
- Forgot password: "Forgot password?", "Send reset link", "We'll email a link valid for 1 hour", "CHECK YOUR EMAIL", "Sent.", "Resend in {n}s"
- Reset password: "Set a new password", "Password strength", "Reset and sign in"
- OAuth errors: "We couldn't sign you in", "Verify your Google email first", "Sign-in failed — try again"
- Login banners: "SESSION ENDED", "TLS · END-TO-END ENCRYPTED"

## Tests (`src/__tests__/`)

| File | Coverage |
|---|---|
| `password-reset.service.test.ts` | Token gen, hash, 1h expiry, single-use enforcement, no email enumeration |
| `oauth.service.test.ts` | Linking rules — existing OAuth row, email match + verified, email match + unverified rejected, new user creation |
| `auth.api.test.ts` | `keepSignedIn` cookie max-age (30d vs default), error code mapping |

Email send is mocked — tests verify `sendMail` is called with correct template + recipient, not actual delivery.

## Manual verification checklist

- `npm run dev` → log in, log out, log in again
- Forgot password → check inbox (or console.log in dev) → click link → reset → sign in with new password
- Click Google button → consent flow → land on `/home` as new user
- Sign in via Google with email matching existing email/password user → verify linking (no duplicate user)
- Toggle theme → all visible pages repaint without flashes
- Lighthouse `/login` → no font-loading layout shift
- `prefers-reduced-motion: reduce` → ribbon, ticker, counters, stagger all freeze

## Out of scope

Named explicitly so the implementation doesn't drift:

- Editorial redesign of dashboard / transactions / calendar / forecast / insights / net worth / upload / export / settings widgets
- Real session table (existing cookie sessions kept)
- Two-factor auth ("TLS · END-TO-END ENCRYPTED" footer is decorative)
- Apple / GitHub / Microsoft OAuth providers
- Email verification on signup
- Server-side password strength enforcement (client-side meter only)
- Mobile-specific Login layout (responsive collapse handles it)

## Open questions

None — all answered during brainstorming.
