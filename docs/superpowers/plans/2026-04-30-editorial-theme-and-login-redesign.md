# Editorial Theme + Login Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the editorial design language (paper/ink palette, Geist + Fraunces fonts, hairline rules, mono eyebrows, live animations) sitewide, and rebuild Login / Register / Forgot-Password / Reset-Password pages with real Google OAuth and Resend-backed password reset.

**Architecture:** Replace the existing Tailwind v4 `@theme inline` token values with the editorial palette so every existing component repaints automatically; add hand-rolled editorial utility classes (`.ft-*`) for surgical use on auth surfaces and numerals. Login becomes a split-panel with a reusable `EditorialHero`. Forgot Password adds a tokens table + Resend templates. Google OAuth is hand-rolled with PKCE on top of the existing custom auth, linking via a new `oauth_accounts` table.

**Tech Stack:** Next.js 16 App Router, Tailwind v4 (`@theme inline`), TypeScript strict, vitest, SQLite (dev) + Neon Postgres (prod) via existing `db.query` adapter, `next/font/google`, `resend`, `crypto` (Node built-in for PKCE), bcryptjs (existing).

**Spec:** [docs/superpowers/specs/2026-04-30-editorial-theme-and-login-redesign.md](../specs/2026-04-30-editorial-theme-and-login-redesign.md)

---

## File Structure

### New files

```
src/components/login/
  EditorialHero.tsx            ─ hero composition (left panel)
  LiveRibbon.tsx               ─ animated SVG cashflow ribbon
  CountStat.tsx                ─ rAF-driven counting stat with eyebrow
  MarketTicker.tsx             ─ horizontal scrolling marquee
  LoginForm.tsx                ─ right panel form + submit
  EditorialField.tsx           ─ square-cornered input with focus glow
  hero-data.ts                 ─ mock counters + ticker rows

src/server/email/
  client.ts                    ─ Resend singleton + dev console fallback
  send.ts                      ─ sendMail wrapper
  templates/password-reset.ts  ─ EN + ID HTML + plaintext templates

src/server/auth/
  pkce.ts                      ─ PKCE verifier + challenge helpers
  google.ts                    ─ build URL, exchange code, fetch userinfo

src/server/repositories/
  password-reset.repository.ts ─ CRUD for password_reset_tokens
  oauth-account.repository.ts  ─ CRUD for oauth_accounts

src/server/services/
  password-reset.service.ts    ─ create / verify / consume tokens
  oauth.service.ts             ─ Google linking rules

src/app/api/auth/
  forgot-password/route.ts     ─ POST handler
  reset-password/route.ts      ─ POST handler
  google/route.ts              ─ GET — kick off OAuth
  google/callback/route.ts     ─ GET — handle return

src/app/forgot-password/page.tsx
src/app/reset-password/page.tsx

src/__tests__/
  pkce.test.ts
  password-reset.service.test.ts
  oauth.service.test.ts
  auth-keep-signed-in.test.ts
  EditorialField.test.tsx
  CountStat.test.tsx
  LiveRibbon.test.ts
  MarketTicker.test.ts
  LoginForm.test.tsx
  forgot-password.api.test.ts
  reset-password.api.test.ts
  google-callback.api.test.ts
  globals-css-tokens.test.ts
```

### Modified files

```
src/app/globals.css                       ─ replace tokens, add editorial utilities + animations
src/app/layout.tsx                        ─ swap fonts to Geist + Geist Mono + Fraunces; first-paint script
src/app/login/page.tsx                    ─ rewrite to split-panel
src/app/register/page.tsx                 ─ restyle to match
src/app/api/auth/login/route.ts           ─ accept keepSignedIn boolean
src/server/db/client.ts                   ─ add 2 tables, make password_hash nullable
src/lib/i18n.ts                           ─ ~30 new EN+ID keys
src/components/settings/                  ─ 3-segment theme switch restyle (one file)
.env.example                              ─ RESEND_API_KEY, EMAIL_FROM, APP_URL, GOOGLE_*
package.json                              ─ + resend dependency
```

---

## Tasks

### Task 1: Add editorial fonts via next/font/google

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/layout-fonts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/layout.tsx'), 'utf-8');

describe('layout.tsx — editorial fonts', () => {
  it('imports Geist, Geist_Mono, and Fraunces from next/font/google', () => {
    expect(src).toMatch(/Geist[^a-zA-Z]/);
    expect(src).toContain('Geist_Mono');
    expect(src).toContain('Fraunces');
  });

  it('exposes --font-sans, --font-mono, --font-display CSS variables', () => {
    expect(src).toContain("variable: '--font-sans'");
    expect(src).toContain("variable: '--font-mono'");
    expect(src).toContain("variable: '--font-display'");
  });

  it('does not load Plus_Jakarta_Sans or JetBrains_Mono', () => {
    expect(src).not.toContain('Plus_Jakarta_Sans');
    expect(src).not.toContain('JetBrains_Mono');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/layout-fonts.test.ts
```

Expected: FAIL — assertions about Geist / Fraunces not present.

- [ ] **Step 3: Write minimal implementation**

Replace the font imports + setup in `src/app/layout.tsx`:

```ts
import { Geist, Geist_Mono, Fraunces } from 'next/font/google';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  axes: ['opsz'],
  display: 'swap',
});
```

And replace the body className:

```tsx
<body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} font-sans antialiased`}>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/layout-fonts.test.ts
npm run typecheck
```

Both expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/__tests__/layout-fonts.test.ts
git commit -m "feat(layout): swap fonts to Geist + Geist Mono + Fraunces"
```

---

### Task 2: Replace globals.css tokens with editorial palette (light + dark)

**Files:**
- Modify: `src/app/globals.css` (replace existing `:root` and `.dark` blocks)
- Test: `src/__tests__/globals-css-tokens.test.ts`

**Dependencies:** None (independent of Task 1)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve('src/app/globals.css'), 'utf-8');

describe('globals.css — editorial tokens', () => {
  it('defines paper / ink / rule tokens in :root', () => {
    expect(css).toContain('--paper: #ffffff');
    expect(css).toContain('--ink: #0a0a0a');
    expect(css).toContain('--rule-soft: #e6e6e3');
  });

  it('defines accent #ff5b1f for light theme', () => {
    expect(css).toMatch(/--accent:\s*#ff5b1f/);
  });

  it('defines midnight palette in .dark', () => {
    expect(css).toContain('--paper: #14110d');
    expect(css).toContain('--ink: #f6f1e8');
    expect(css).toMatch(/--accent:\s*#d3b266/);
  });

  it('maps tokens through @theme inline', () => {
    expect(css).toContain('--color-background: var(--paper)');
    expect(css).toContain('--color-foreground: var(--ink)');
    expect(css).toContain('--color-border: var(--rule-soft)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/globals-css-tokens.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Within `src/app/globals.css`, replace the existing `:root { ... }` and `.dark { ... }` blocks with:

```css
:root {
  --paper: #ffffff;
  --paper-2: #f4f4f2;
  --ink: #0a0a0a;
  --ink-2: #1a1a1a;
  --ink-3: #6b6b6b;
  --rule: #0a0a0a;
  --rule-soft: #e6e6e3;
  --card: #ffffff;
  --card-2: #fafaf8;
  --accent: #ff5b1f;
  --accent-2: #0a0a0a;
  --pos: #1f5b3e;
  --pos-soft: #e3f0e6;
  --neg: #a8341f;
  --neg-soft: #fbe1da;
  --warn: #a76b1c;
  --warn-soft: #f3deb6;

  /* Existing semantic tokens kept, remapped to editorial */
  --background: var(--paper);
  --foreground: var(--ink);
  --card-bg: var(--card);
  --border: var(--rule-soft);
  --muted: var(--paper-2);
  --muted-foreground: var(--ink-3);
  --primary: var(--accent);
  --primary-foreground: var(--paper);
  --destructive: var(--neg);
  --destructive-foreground: var(--paper);
}

.dark {
  --paper: #14110d;
  --paper-2: #1c1813;
  --ink: #f6f1e8;
  --ink-2: #d9cfb9;
  --ink-3: #97907f;
  --rule: #f6f1e8;
  --rule-soft: #2e2820;
  --card: #1c1813;
  --card-2: #221d16;
  --accent: #d3b266;
  --accent-2: #e87a52;
  --pos: #7cc295;
  --pos-soft: #234534;
  --neg: #e88871;
  --neg-soft: #4a261d;
  --warn: #e0b169;
}
```

Within the existing `@theme inline { ... }` block, ensure these mappings are present (add if missing, replace existing values to point to the new tokens):

```css
@theme inline {
  --color-background: var(--paper);
  --color-foreground: var(--ink);
  --color-card: var(--card);
  --color-card-foreground: var(--ink);
  --color-border: var(--rule-soft);
  --color-muted: var(--paper-2);
  --color-muted-foreground: var(--ink-3);
  --color-primary: var(--accent);
  --color-primary-foreground: var(--paper);
  --color-destructive: var(--neg);
  --color-destructive-foreground: var(--paper);
  /* Keep existing font-sans / font-mono entries but point to new tokens */
  --font-sans: var(--font-sans), system-ui, sans-serif;
  --font-mono: var(--font-mono), ui-monospace, monospace;
}
```

(Leave the rest of `@theme inline` — keyframes, custom variants, utility classes — unchanged.)

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/globals-css-tokens.test.ts
npm run typecheck
```

Both expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/__tests__/globals-css-tokens.test.ts
git commit -m "feat(theme): replace tokens with editorial palette (light + dark)"
```

---

### Task 3: Add editorial utility classes to globals.css

**Files:**
- Modify: `src/app/globals.css`
- Test: extend `src/__tests__/globals-css-tokens.test.ts`

**Dependencies:** Task 2

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/globals-css-tokens.test.ts`:

```ts
describe('globals.css — editorial utility classes', () => {
  it('defines .ft-display, .ft-display-up, .ft-mono, .ft-eyebrow', () => {
    expect(css).toContain('.ft-display ');
    expect(css).toContain('.ft-display-up ');
    expect(css).toContain('.ft-mono ');
    expect(css).toContain('.ft-eyebrow ');
  });

  it('defines .ft-rule and .ft-rule-soft hairlines', () => {
    expect(css).toContain('.ft-rule ');
    expect(css).toContain('.ft-rule-soft ');
  });

  it('defines .ft-live-dot with pulse animation', () => {
    expect(css).toContain('.ft-live-dot');
    expect(css).toMatch(/animation:\s*ftPulseSoft/);
  });
});
```

(Note: `const css = readFileSync(...)` is already at the top of the file from Task 2.)

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/globals-css-tokens.test.ts
```

Expected: FAIL — new class assertions miss.

- [ ] **Step 3: Write minimal implementation**

Append to `src/app/globals.css` (anywhere after the `@theme inline` block):

```css
.ft-display {
  font-family: var(--font-display), serif;
  font-weight: 400;
  font-style: italic;
  letter-spacing: -0.015em;
  line-height: 0.95;
}
.ft-display-up {
  font-family: var(--font-display), serif;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 0.95;
}
.ft-mono {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-feature-settings: 'tnum', 'ss01';
}
.ft-eyebrow {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.ft-rule { border: 0; border-top: 1px solid var(--rule); margin: 0; }
.ft-rule-soft { border: 0; border-top: 1px solid var(--rule-soft); margin: 0; }
.ft-live-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-2);
  animation: ftPulseSoft 1.4s ease-in-out infinite;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/globals-css-tokens.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/__tests__/globals-css-tokens.test.ts
git commit -m "feat(theme): add editorial utility classes (display, eyebrow, mono, rule, live-dot)"
```

---

### Task 4: Add animation keyframes + utility classes + reduced-motion overrides

**Files:**
- Modify: `src/app/globals.css`
- Test: extend `src/__tests__/globals-css-tokens.test.ts`

**Dependencies:** Task 3

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/globals-css-tokens.test.ts`:

```ts
describe('globals.css — animations', () => {
  it('defines ftRise, ftFlow, ftPulseSoft, ftMarq, ftBarGrow, ftShimmerBg keyframes', () => {
    expect(css).toContain('@keyframes ftRise');
    expect(css).toContain('@keyframes ftFlow');
    expect(css).toContain('@keyframes ftPulseSoft');
    expect(css).toContain('@keyframes ftMarq');
    expect(css).toContain('@keyframes ftBarGrow');
    expect(css).toContain('@keyframes ftShimmerBg');
  });

  it('defines staggered .ft-rise-1..6 utilities', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(css).toContain(`.ft-rise-${n} `);
    }
  });

  it('honors prefers-reduced-motion', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/globals-css-tokens.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Append to `src/app/globals.css`:

```css
@keyframes ftRise {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ftFlow {
  0%   { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -120; }
}
@keyframes ftPulseSoft {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.06); }
}
@keyframes ftMarq {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes ftBarGrow {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
@keyframes ftShimmerBg {
  0%   { background-position: -240px 0; }
  100% { background-position: 240px 0; }
}

.ft-rise   { animation: ftRise 600ms cubic-bezier(0.2, 0.7, 0.3, 1) both; }
.ft-rise-1 { animation: ftRise 600ms cubic-bezier(0.2, 0.7, 0.3, 1) 80ms both; }
.ft-rise-2 { animation: ftRise 600ms cubic-bezier(0.2, 0.7, 0.3, 1) 160ms both; }
.ft-rise-3 { animation: ftRise 600ms cubic-bezier(0.2, 0.7, 0.3, 1) 240ms both; }
.ft-rise-4 { animation: ftRise 600ms cubic-bezier(0.2, 0.7, 0.3, 1) 320ms both; }
.ft-rise-5 { animation: ftRise 600ms cubic-bezier(0.2, 0.7, 0.3, 1) 400ms both; }
.ft-rise-6 { animation: ftRise 600ms cubic-bezier(0.2, 0.7, 0.3, 1) 480ms both; }
.ft-bar-grow { transform-origin: left; animation: ftBarGrow 900ms cubic-bezier(0.2, 0.7, 0.3, 1) both; }
.ft-shimmer {
  background: linear-gradient(90deg, var(--rule-soft) 0%, color-mix(in oklab, var(--paper) 60%, var(--rule-soft)) 50%, var(--rule-soft) 100%);
  background-size: 480px 100%;
  animation: ftShimmerBg 1.6s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .ft-rise, .ft-rise-1, .ft-rise-2, .ft-rise-3, .ft-rise-4, .ft-rise-5, .ft-rise-6,
  .ft-bar-grow, .ft-shimmer, .ft-live-dot {
    animation: none !important;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/globals-css-tokens.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/__tests__/globals-css-tokens.test.ts
git commit -m "feat(theme): add editorial animations + reduced-motion overrides"
```

---

### Task 5: Add i18n keys for auth surface (EN + ID)

**Files:**
- Modify: `src/lib/i18n.ts`
- Test: `src/__tests__/i18n-auth-keys.test.ts`

**Dependencies:** None

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { t } from '@/lib/i18n';

const KEYS = [
  'authHeroDek', 'authHeroLive30', 'authHeroNetWorth', 'authHeroThisMonth', 'authHeroCategories',
  'authWelcomeBack', 'authSignInSubtitle', 'authPasswordLabel', 'authKeepSignedIn',
  'authOr', 'authContinueGoogle', 'authForgotPassword', 'authCreateAccount',
  'authTLSEncrypted', 'authSessionEnded',
  'forgotTitle', 'forgotSubtitle', 'forgotSubmit', 'forgotSent', 'forgotResendIn',
  'resetTitle', 'resetSubtitle', 'resetSubmit', 'resetStrength', 'resetMismatch',
  'oauthErrorGeneric', 'oauthErrorEmailUnverified', 'oauthErrorStateMismatch',
  'authOpeningBooks', 'authIssue', 'authSecureLedger',
] as const;

describe('i18n — auth keys', () => {
  for (const k of KEYS) {
    it(`has EN and ID for "${k}"`, () => {
      const en = t('en', k as Parameters<typeof t>[1]);
      const id = t('id', k as Parameters<typeof t>[1]);
      expect(en).toBeTruthy();
      expect(id).toBeTruthy();
      expect(en).not.toBe(k);
      expect(id).not.toBe(k);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/i18n-auth-keys.test.ts
```

Expected: FAIL — keys missing.

- [ ] **Step 3: Write minimal implementation**

Add to both EN and ID dictionaries in `src/lib/i18n.ts`:

```ts
// EN
authHeroDek: 'A reading of your money — kept like a journal, told like a newspaper.',
authHeroLive30: 'LIVE · LAST 30 DAYS',
authHeroNetWorth: 'Net worth',
authHeroThisMonth: 'This month',
authHeroCategories: 'Categories',
authWelcomeBack: 'Welcome back.',
authSignInSubtitle: 'Sign in to review the ledger.',
authPasswordLabel: 'Password',
authKeepSignedIn: 'Keep me signed in for 30 days',
authOr: 'OR',
authContinueGoogle: 'Continue with Google',
authForgotPassword: 'Forgot password?',
authCreateAccount: 'Create account',
authTLSEncrypted: 'TLS · END-TO-END ENCRYPTED',
authSessionEnded: 'SESSION ENDED',
authOpeningBooks: 'Opening the books…',
authIssue: 'ISSUE',
authSecureLedger: 'SECURE LEDGER',
forgotTitle: 'Forgot password',
forgotSubtitle: "We'll email a link valid for 1 hour.",
forgotSubmit: 'Send reset link →',
forgotSent: 'CHECK YOUR EMAIL',
forgotResendIn: 'Resend in {n}s',
resetTitle: 'Set a new password',
resetSubtitle: 'Choose something memorable.',
resetSubmit: 'Reset and sign in →',
resetStrength: 'Password strength',
resetMismatch: "Passwords don't match",
oauthErrorGeneric: "We couldn't sign you in — try again.",
oauthErrorEmailUnverified: 'Verify your Google email first.',
oauthErrorStateMismatch: 'Your sign-in attempt expired. Please try again.',
```

```ts
// ID
authHeroDek: 'Pembacaan keuangan Anda — disimpan seperti jurnal, diceritakan seperti koran.',
authHeroLive30: 'LANGSUNG · 30 HARI TERAKHIR',
authHeroNetWorth: 'Kekayaan bersih',
authHeroThisMonth: 'Bulan ini',
authHeroCategories: 'Kategori',
authWelcomeBack: 'Selamat datang.',
authSignInSubtitle: 'Masuk untuk meninjau buku besar.',
authPasswordLabel: 'Kata sandi',
authKeepSignedIn: 'Tetap masuk selama 30 hari',
authOr: 'ATAU',
authContinueGoogle: 'Lanjutkan dengan Google',
authForgotPassword: 'Lupa kata sandi?',
authCreateAccount: 'Buat akun',
authTLSEncrypted: 'TLS · TERENKRIPSI UJUNG-KE-UJUNG',
authSessionEnded: 'SESI BERAKHIR',
authOpeningBooks: 'Membuka buku…',
authIssue: 'EDISI',
authSecureLedger: 'BUKU BESAR AMAN',
forgotTitle: 'Lupa kata sandi',
forgotSubtitle: 'Kami akan mengirim tautan yang berlaku 1 jam.',
forgotSubmit: 'Kirim tautan reset →',
forgotSent: 'PERIKSA EMAIL ANDA',
forgotResendIn: 'Kirim ulang dalam {n}d',
resetTitle: 'Atur kata sandi baru',
resetSubtitle: 'Pilih yang mudah diingat.',
resetSubmit: 'Reset dan masuk →',
resetStrength: 'Kekuatan kata sandi',
resetMismatch: 'Kata sandi tidak cocok',
oauthErrorGeneric: 'Kami tidak dapat memasukkan Anda — coba lagi.',
oauthErrorEmailUnverified: 'Verifikasi email Google Anda terlebih dahulu.',
oauthErrorStateMismatch: 'Upaya masuk Anda kedaluwarsa. Silakan coba lagi.',
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/i18n-auth-keys.test.ts
npm run typecheck
```

Both expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts src/__tests__/i18n-auth-keys.test.ts
git commit -m "feat(i18n): add EN+ID keys for editorial auth surface"
```

---

### Task 6: Build EditorialField component

**Files:**
- Create: `src/components/login/EditorialField.tsx`
- Test: `src/__tests__/EditorialField.test.tsx`

**Dependencies:** Task 4 (utility classes)

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorialField } from '@/components/login/EditorialField';

describe('EditorialField', () => {
  it('renders label as eyebrow + input', () => {
    render(<EditorialField label="Email" value="" onChange={() => {}} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('emits onChange when typing', () => {
    let val = '';
    render(<EditorialField label="Email" value={val} onChange={(v) => (val = v)} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@b.c' } });
    expect(val).toBe('a@b.c');
  });

  it('renders type=password and hides text', () => {
    render(<EditorialField label="Password" value="secret" onChange={() => {}} type="password" />);
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/EditorialField.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/login/EditorialField.tsx`:

```tsx
'use client';

import { useId } from 'react';

export interface EditorialFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
  required?: boolean;
  autoFocus?: boolean;
}

export function EditorialField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  required,
  autoFocus,
}: EditorialFieldProps) {
  const id = useId();
  return (
    <label htmlFor={id} className="block">
      <span className="ft-eyebrow mb-2 block">{label}</span>
      <input
        id={id}
        aria-label={label}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        autoFocus={autoFocus}
        className="w-full border border-[var(--rule-soft)] bg-[var(--card-2)] px-3.5 py-3 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)] focus:bg-[var(--card)]"
        style={{ borderRadius: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}
      />
    </label>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/EditorialField.test.tsx
npm run typecheck
```

Both expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/login/EditorialField.tsx src/__tests__/EditorialField.test.tsx
git commit -m "feat(login): EditorialField — square input with focus glow"
```

---

### Task 7: Build CountStat component

**Files:**
- Create: `src/components/login/CountStat.tsx`
- Test: `src/__tests__/CountStat.test.tsx`

**Dependencies:** Task 4

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CountStat } from '@/components/login/CountStat';

describe('CountStat', () => {
  it('renders eyebrow label and final formatted value', async () => {
    render(<CountStat label="Net worth" target={100} format={(v) => `Rp ${Math.round(v)}`} />);
    expect(screen.getByText('Net worth')).toBeInTheDocument();
    // Animation finishes within ~1.5s; advance enough for completion.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1600));
    });
    expect(screen.getByText('Rp 100')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/CountStat.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/login/CountStat.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

export interface CountStatProps {
  label: string;
  target: number;
  format: (value: number) => string;
  color?: string;
  delayMs?: number;
}

export function CountStat({ label, target, format, color, delayMs = 0 }: CountStatProps) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const dur = 1400;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start - delayMs) / dur);
      const eased = p < 0 ? 0 : 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delayMs]);

  return (
    <div>
      <div className="ft-eyebrow mb-1">{label}</div>
      <div className="ft-mono text-lg font-semibold" style={{ color: color ?? 'var(--ink)' }}>
        {format(val)}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/CountStat.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/login/CountStat.tsx src/__tests__/CountStat.test.tsx
git commit -m "feat(login): CountStat — rAF-driven counter with eyebrow"
```

---

### Task 8: Build LiveRibbon component

**Files:**
- Create: `src/components/login/LiveRibbon.tsx`
- Test: `src/__tests__/LiveRibbon.test.ts`

**Dependencies:** Task 4

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/components/login/LiveRibbon.tsx'), 'utf-8');

describe('LiveRibbon', () => {
  it('renders an SVG with a path', () => {
    expect(src).toContain('<svg');
    expect(src).toContain('<path');
  });

  it('uses var(--accent-2) for stroke and gradient', () => {
    expect(src).toContain('var(--accent-2)');
  });

  it('applies the ftFlow animation to the dashed stroke', () => {
    expect(src).toContain('ftFlow');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/LiveRibbon.test.ts
```

Expected: FAIL — file missing.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/login/LiveRibbon.tsx`:

```tsx
'use client';

const POINTS: number[] = Array.from({ length: 30 }, (_, i) =>
  50 + Math.sin(i * 0.4) * 18 + Math.cos(i * 0.2) * 8
);

export function LiveRibbon() {
  const w = 460;
  const h = 70;
  const path = POINTS.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i / (POINTS.length - 1)) * w},${p}`).join(' ');
  const area = `${path} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id="ftRibbon" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ftRibbon)" />
      <path
        d={path}
        fill="none"
        stroke="var(--accent-2)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        style={{ animation: 'ftFlow 4s linear infinite' }}
      />
      <circle
        cx={w}
        cy={POINTS[POINTS.length - 1]}
        r={3.5}
        fill="var(--accent-2)"
        style={{ animation: 'ftPulseSoft 1.6s ease-in-out infinite' }}
      />
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/LiveRibbon.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/login/LiveRibbon.tsx src/__tests__/LiveRibbon.test.ts
git commit -m "feat(login): LiveRibbon — animated SVG cashflow ribbon"
```

---

### Task 9: Build MarketTicker component + hero-data module

**Files:**
- Create: `src/components/login/MarketTicker.tsx`, `src/components/login/hero-data.ts`
- Test: `src/__tests__/MarketTicker.test.ts`

**Dependencies:** Task 4

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { TICKER_ROWS, HERO_STATS } from '@/components/login/hero-data';

const src = readFileSync(resolve('src/components/login/MarketTicker.tsx'), 'utf-8');

describe('MarketTicker', () => {
  it('renders a marquee using ftMarq animation', () => {
    expect(src).toContain('ftMarq');
  });

  it('triplicates rows for seamless loop', () => {
    expect(src).toMatch(/\.\.\.\s*rows[\s,]+\.\.\.\s*rows[\s,]+\.\.\.\s*rows/);
  });
});

describe('hero-data', () => {
  it('exposes 6 ticker rows', () => {
    expect(TICKER_ROWS).toHaveLength(6);
    expect(TICKER_ROWS[0]).toHaveProperty('symbol');
  });

  it('exposes hero stats with target numbers', () => {
    expect(HERO_STATS.netWorth).toBeGreaterThan(0);
    expect(HERO_STATS.thisMonth).toBeGreaterThan(0);
    expect(HERO_STATS.categories).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/MarketTicker.test.ts
```

Expected: FAIL — modules missing.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/login/hero-data.ts`:

```ts
export interface TickerRow {
  symbol: string;
  value: string;
  delta: string;
  positive: boolean;
}

export const TICKER_ROWS: TickerRow[] = [
  { symbol: 'USD/IDR', value: '16,245', delta: '+0.12%', positive: true },
  { symbol: 'JKSE', value: '7,284.32', delta: '+0.84%', positive: true },
  { symbol: 'BTC', value: 'Rp 1.04B', delta: '−1.2%', positive: false },
  { symbol: 'GOLD', value: 'Rp 1.42M/g', delta: '+0.31%', positive: true },
  { symbol: 'BBCA', value: '9,825', delta: '+0.5%', positive: true },
  { symbol: 'BBRI', value: '4,720', delta: '−0.2%', positive: false },
];

export const HERO_STATS = {
  netWorth: 184_500_000,
  thisMonth: 3_210_000,
  categories: 36,
};
```

Create `src/components/login/MarketTicker.tsx`:

```tsx
'use client';

import { TICKER_ROWS, type TickerRow } from './hero-data';

export function MarketTicker() {
  const rows: TickerRow[] = [...TICKER_ROWS, ...TICKER_ROWS, ...TICKER_ROWS];
  return (
    <div
      className="overflow-hidden"
      style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}
    >
      <div
        className="flex gap-7 whitespace-nowrap"
        style={{ animation: 'ftMarq 32s linear infinite' }}
      >
        {rows.map((r, i) => (
          <div key={i} className="ft-mono flex items-baseline gap-2 text-[11px]">
            <span className="text-[var(--ink-3)] tracking-wider">{r.symbol}</span>
            <span className="font-semibold text-[var(--ink)]">{r.value}</span>
            <span style={{ color: r.positive ? 'var(--pos)' : 'var(--neg)' }}>{r.delta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/MarketTicker.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/login/MarketTicker.tsx src/components/login/hero-data.ts src/__tests__/MarketTicker.test.ts
git commit -m "feat(login): MarketTicker + hero-data with mock IDR quotes"
```

---

### Task 10: Build EditorialHero composition

**Files:**
- Create: `src/components/login/EditorialHero.tsx`
- Test: `src/__tests__/EditorialHero.test.tsx`

**Dependencies:** Tasks 7, 8, 9 (consumes CountStat, LiveRibbon, MarketTicker)

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorialHero } from '@/components/login/EditorialHero';

describe('EditorialHero', () => {
  it('renders ISSUE · SECURE LEDGER eyebrow', () => {
    render(<EditorialHero locale="en" />);
    expect(screen.getByText(/SECURE LEDGER/i)).toBeInTheDocument();
  });

  it('renders FINANCIAL TRACKER masthead', () => {
    render(<EditorialHero locale="en" />);
    expect(screen.getByText(/FINANCIAL/)).toBeInTheDocument();
    expect(screen.getByText(/TRACKER/)).toBeInTheDocument();
  });

  it('renders all three counter labels', () => {
    render(<EditorialHero locale="en" />);
    expect(screen.getByText(/Net worth/i)).toBeInTheDocument();
    expect(screen.getByText(/This month/i)).toBeInTheDocument();
    expect(screen.getByText(/Categories/i)).toBeInTheDocument();
  });

  it('uses Indonesian labels when locale=id', () => {
    render(<EditorialHero locale="id" />);
    expect(screen.getByText(/Kekayaan bersih/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/EditorialHero.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/login/EditorialHero.tsx`:

```tsx
'use client';

import { t, type Locale } from '@/lib/i18n';
import { LiveRibbon } from './LiveRibbon';
import { CountStat } from './CountStat';
import { MarketTicker } from './MarketTicker';
import { HERO_STATS } from './hero-data';
import { formatIDR, formatIDRShort } from '@/lib/format';

export interface EditorialHeroProps {
  locale: Locale;
}

export function EditorialHero({ locale }: EditorialHeroProps) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden border-r border-[var(--rule-soft)] bg-[var(--paper-2)] px-14 py-11">
      <div className="ft-eyebrow ft-rise-1">
        {t(locale, 'authIssue')} · {t(locale, 'authSecureLedger')}
      </div>

      <div className="ft-rise-2 mt-3">
        <div
          className="ft-display-up"
          style={{ fontSize: 56, lineHeight: 0.92, letterSpacing: '-0.025em' }}
        >
          FINANCIAL
          <br />
          TRACKER
          <span className="italic" style={{ color: 'var(--accent-2)' }}>.</span>
        </div>
      </div>

      <p className="ft-display ft-rise-3 mt-4 max-w-md text-lg text-[var(--ink-2)]">
        {t(locale, 'authHeroDek')}
      </p>

      <div className="ft-rise-4 mt-7">
        <div className="ft-eyebrow mb-2">{t(locale, 'authHeroLive30')}</div>
        <LiveRibbon />
      </div>

      <div className="ft-rise-5 mt-6 grid grid-cols-3 gap-5">
        <CountStat
          label={t(locale, 'authHeroNetWorth')}
          target={HERO_STATS.netWorth}
          format={(v) => `Rp ${formatIDRShort(v)}`}
        />
        <CountStat
          label={t(locale, 'authHeroThisMonth')}
          target={HERO_STATS.thisMonth}
          format={(v) => `+${formatIDRShort(v)}`}
          color="var(--pos)"
        />
        <CountStat
          label={t(locale, 'authHeroCategories')}
          target={HERO_STATS.categories}
          format={(v) => Math.round(v).toString()}
        />
      </div>

      <div className="ft-rise-6 mt-auto border-t border-[var(--rule-soft)] pt-6">
        <MarketTicker />
      </div>
    </div>
  );
}
```

If `formatIDRShort` does not exist in `@/lib/format`, use `formatIDR` from there or add a lightweight inline formatter (`Intl.NumberFormat('id-ID', { notation: 'compact' })`). Verify the import resolves before committing.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/EditorialHero.test.tsx
npm run typecheck
```

Both expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/login/EditorialHero.tsx src/__tests__/EditorialHero.test.tsx
git commit -m "feat(login): EditorialHero — split-panel hero composition"
```

---

### Task 11: Add `keepSignedIn` flag to /api/auth/login

**Files:**
- Modify: `src/app/api/auth/login/route.ts`
- Test: `src/__tests__/auth-keep-signed-in.test.ts`

**Dependencies:** None

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/login/route';
import { resetDb } from '@/server/db/sqlite-client';
import { registerUser } from '@/server/services/auth.service';

describe('POST /api/auth/login — keepSignedIn flag', () => {
  beforeEach(async () => {
    await resetDb();
    await registerUser({ email: 'a@b.c', name: 'A', password: 'pw1234' });
  });

  function makeReq(body: Record<string, unknown>) {
    return new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as Parameters<typeof POST>[0];
  }

  it('default sets a 7-day cookie when keepSignedIn is omitted', async () => {
    const res = await POST(makeReq({ email: 'a@b.c', password: 'pw1234' }));
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('Max-Age=604800'); // 7 days
  });

  it('sets a 30-day cookie when keepSignedIn=true', async () => {
    const res = await POST(makeReq({ email: 'a@b.c', password: 'pw1234', keepSignedIn: true }));
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('Max-Age=2592000'); // 30 days
  });
});
```

(If `resetDb` / `registerUser` signatures differ, adapt to existing test patterns in `src/__tests__/auth.api.test.ts` if it exists; otherwise adjust to the actual `auth.service` interface — check `src/server/services/auth.service.ts` first and align.)

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/auth-keep-signed-in.test.ts
```

Expected: FAIL — both tests find Max-Age=604800 (the existing default).

- [ ] **Step 3: Write minimal implementation**

Modify `src/app/api/auth/login/route.ts`:

```ts
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  keepSignedIn: z.boolean().optional(),
});
```

And in the handler, replace the `maxAge: 60 * 60 * 24 * 7` line with:

```ts
const { email, password, keepSignedIn } = parsed.data;
// ...
const maxAge = keepSignedIn ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
response.cookies.set('auth-token', result.token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge,
  path: '/',
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/auth-keep-signed-in.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/login/route.ts src/__tests__/auth-keep-signed-in.test.ts
git commit -m "feat(auth): support keepSignedIn flag (30d vs 7d cookie)"
```

---

### Task 12: Build LoginForm component

**Files:**
- Create: `src/components/login/LoginForm.tsx`
- Test: `src/__tests__/LoginForm.test.tsx`

**Dependencies:** Tasks 5, 6, 11

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/login/LoginForm';

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy);
  fetchSpy.mockReset();
});

describe('LoginForm', () => {
  it('renders email + password fields, submit, Google button', () => {
    render(<LoginForm locale="en" onSuccess={() => {}} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('posts keepSignedIn=true when checkbox checked', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ data: { user: {} } }) });
    render(<LoginForm locale="en" onSuccess={() => {}} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.c' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw1234' } });
    fireEvent.click(screen.getByLabelText(/keep me signed in/i));
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.keepSignedIn).toBe(true);
  });

  it('navigates to /api/auth/google when Google button clicked', () => {
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, assign: assignSpy }, writable: true });
    render(<LoginForm locale="en" onSuccess={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(assignSpy).toHaveBeenCalledWith('/api/auth/google');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/LoginForm.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/login/LoginForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n';
import { EditorialField } from './EditorialField';

export interface LoginFormProps {
  locale: Locale;
  onSuccess?: () => void;
  sessionExpired?: boolean;
}

export function LoginForm({ locale, onSuccess, sessionExpired }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, keepSignedIn: keep }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? 'Login failed');
      } else {
        onSuccess?.();
        router.push('/home');
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="relative flex max-w-xl flex-col justify-center gap-3.5 px-14 py-14"
    >
      <div className="ft-eyebrow ft-rise-1">{locale === 'en' ? 'SIGN IN' : 'MASUK'}</div>
      <h2 className="ft-display-up ft-rise-2 text-[44px] leading-none tracking-tight">
        {t(locale, 'authWelcomeBack')}
      </h2>
      <p className="ft-display ft-rise-3 text-[15px] text-[var(--ink-3)]">
        {t(locale, 'authSignInSubtitle')}
      </p>

      {sessionExpired && (
        <div className="ft-rise-3 border border-[var(--warn)] bg-[var(--warn-soft)] px-3 py-2 text-xs text-[var(--warn)]">
          <span className="ft-eyebrow mr-2">{t(locale, 'authSessionEnded')}</span>
        </div>
      )}

      <div className="ft-rise-4 mt-3 flex flex-col gap-3">
        <EditorialField label="Email" value={email} onChange={setEmail} type="email" required autoFocus autoComplete="email" />
        <EditorialField label={t(locale, 'authPasswordLabel')} value={password} onChange={setPassword} type="password" required autoComplete="current-password" />
        <label className="mt-0.5 flex items-center gap-2 text-xs text-[var(--ink-3)]">
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          {t(locale, 'authKeepSignedIn')}
        </label>
      </div>

      {error && (
        <div role="alert" className="ft-rise-4 border border-[var(--neg)] bg-[var(--neg-soft)] px-3 py-2 text-xs text-[var(--neg)]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="ft-rise-4 mt-3 w-full bg-[var(--ink)] px-4 py-3.5 text-xs font-semibold uppercase tracking-widest text-[var(--paper)] transition-transform active:scale-[0.99] disabled:cursor-default"
      >
        {busy ? t(locale, 'authOpeningBooks') : (locale === 'en' ? 'Sign in →' : 'Masuk →')}
      </button>

      <div className="my-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--rule-soft)]" />
        <span className="ft-eyebrow">{t(locale, 'authOr')}</span>
        <div className="h-px flex-1 bg-[var(--rule-soft)]" />
      </div>

      <button
        type="button"
        onClick={() => window.location.assign('/api/auth/google')}
        className="flex items-center justify-center gap-2.5 border border-[var(--rule-soft)] bg-[var(--card)] px-4 py-3 text-sm font-medium text-[var(--ink)]"
      >
        <span className="ft-mono" style={{ color: 'var(--accent)' }}>G</span>
        {t(locale, 'authContinueGoogle')}
      </button>

      <div className="mt-6 flex justify-between border-t border-[var(--rule-soft)] pt-4 text-xs text-[var(--ink-3)]">
        <Link href="/forgot-password" className="underline">{t(locale, 'authForgotPassword')}</Link>
        <Link href="/register" className="underline">{t(locale, 'authCreateAccount')}</Link>
      </div>

      <div className="ft-eyebrow absolute bottom-6 left-14 right-14 flex justify-between">
        <span><span className="ft-live-dot mr-1.5 align-middle" />{t(locale, 'authTLSEncrypted')}</span>
        <span>v 2.0.4</span>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/LoginForm.test.tsx
npm run typecheck
```

Both expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/login/LoginForm.tsx src/__tests__/LoginForm.test.tsx
git commit -m "feat(login): LoginForm — editorial right panel with Google + keep-signed-in"
```

---

### Task 13: Rewrite /login page with split-panel layout

**Files:**
- Modify: `src/app/login/page.tsx`
- Test: `src/__tests__/login-page-composition.test.ts`

**Dependencies:** Tasks 10, 12

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/login/page.tsx'), 'utf-8');

describe('/login page composition', () => {
  it('imports EditorialHero and LoginForm', () => {
    expect(src).toContain('EditorialHero');
    expect(src).toContain('LoginForm');
  });

  it('uses 2-column grid on lg+ viewports', () => {
    expect(src).toMatch(/grid-cols-1\s+lg:grid-cols-2/);
  });

  it('removes blue/emerald gradient background', () => {
    expect(src).not.toContain('from-blue-50');
    expect(src).not.toContain('via-white to-emerald-50');
  });

  it('detects ?reason=expired and forwards to LoginForm', () => {
    expect(src).toContain("'expired'");
    expect(src).toContain('sessionExpired');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/login-page-composition.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Replace contents of `src/app/login/page.tsx`:

```tsx
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { EditorialHero } from '@/components/login/EditorialHero';
import { LoginForm } from '@/components/login/LoginForm';
import { useLocale } from '@/lib/i18n';

function LoginPageInner() {
  const locale = useLocale();
  const params = useSearchParams();
  const sessionExpired = params.get('reason') === 'expired';

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-[var(--paper)]">
      <div className="hidden lg:block">
        <EditorialHero locale={locale} />
      </div>
      <div className="flex items-center justify-center">
        <LoginForm locale={locale} sessionExpired={sessionExpired} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/login-page-composition.test.ts
npm run typecheck
```

Both expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/login/page.tsx src/__tests__/login-page-composition.test.ts
git commit -m "feat(login): rewrite /login as editorial split-panel"
```

---

### Task 14: Restyle /register page with EditorialHero

**Files:**
- Modify: `src/app/register/page.tsx`
- Test: `src/__tests__/register-page-composition.test.ts`

**Dependencies:** Task 10, plus reading existing register page for current submit logic

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/register/page.tsx'), 'utf-8');

describe('/register page composition', () => {
  it('imports EditorialHero and EditorialField', () => {
    expect(src).toContain('EditorialHero');
    expect(src).toContain('EditorialField');
  });

  it('uses lg:grid-cols-2 layout', () => {
    expect(src).toMatch(/lg:grid-cols-2/);
  });

  it('removes blue gradient background', () => {
    expect(src).not.toContain('from-blue-50');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/register-page-composition.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Read `src/app/register/page.tsx` to learn the current submit handler (the path it POSTs to and field shape). Then rewrite the file: keep the existing submit logic; replace surrounding markup with the EditorialHero left + an editorial form right (use `EditorialField` for inputs; mirror the visual rhythm from `LoginForm`). Match the same `grid grid-cols-1 lg:grid-cols-2` shell as Task 13.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/register-page-composition.test.ts
npm run typecheck
```

Both expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/register/page.tsx src/__tests__/register-page-composition.test.ts
git commit -m "feat(register): restyle /register with EditorialHero + EditorialField"
```

---

### Task 15: Add password_reset_tokens schema

**Files:**
- Modify: `src/server/db/client.ts`
- Test: `src/__tests__/db-password-reset-schema.test.ts`

**Dependencies:** None

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, db } from '@/server/db/sqlite-client';

describe('db schema — password_reset_tokens', () => {
  beforeEach(async () => { await resetDb(); });

  it('has the expected columns', async () => {
    const rows = await db.query(`PRAGMA table_info(password_reset_tokens)`);
    const cols = rows.map((r: { name: string }) => r.name).sort();
    expect(cols).toEqual(['created_at', 'expires_at', 'id', 'token_hash', 'used_at', 'user_id']);
  });
});
```

(If the project's `db.query` signature differs from this, mirror an existing test like `src/__tests__/db-*.test.ts` or `transactionRepository.test.ts` for the actual call shape.)

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/db-password-reset-schema.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

In `src/server/db/client.ts`, add to the `tables` array:

```ts
`CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
)`,
```

Plus, after the table loop, add explicit indexes (run inside try/catch to be re-runnable):

```ts
try { await client.exec(`CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id)`); } catch {}
try { await client.exec(`CREATE INDEX IF NOT EXISTS idx_prt_hash ON password_reset_tokens(token_hash)`); } catch {}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/db-password-reset-schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/db/client.ts src/__tests__/db-password-reset-schema.test.ts
git commit -m "feat(db): add password_reset_tokens table + indexes"
```

---

### Task 16: Build password-reset.repository.ts

**Files:**
- Create: `src/server/repositories/password-reset.repository.ts`
- Test: `src/__tests__/password-reset.repository.test.ts`

**Dependencies:** Task 15

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/sqlite-client';
import {
  createResetToken,
  findResetTokenByHash,
  consumeResetToken,
} from '@/server/repositories/password-reset.repository';

describe('passwordResetRepository', () => {
  beforeEach(async () => { await resetDb(); });

  it('creates and finds by hash', async () => {
    const token = await createResetToken({
      userId: 'user-1',
      tokenHash: 'hash-1',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    expect(token.id).toBeTruthy();
    const found = await findResetTokenByHash('hash-1');
    expect(found?.user_id).toBe('user-1');
  });

  it('marks token as used', async () => {
    const token = await createResetToken({
      userId: 'user-1', tokenHash: 'hash-2',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    await consumeResetToken(token.id);
    const found = await findResetTokenByHash('hash-2');
    expect(found?.used_at).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/password-reset.repository.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/server/repositories/password-reset.repository.ts`:

```ts
import { db } from '@/server/db/client';
import { randomUUID } from 'crypto';

export interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export async function createResetToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: string;
}): Promise<PasswordResetTokenRow> {
  const id = randomUUID();
  await db.query(
    'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [id, input.userId, input.tokenHash, input.expiresAt]
  );
  const rows = (await db.query(
    'SELECT * FROM password_reset_tokens WHERE id = ?',
    [id]
  )) as PasswordResetTokenRow[];
  return rows[0];
}

export async function findResetTokenByHash(hash: string): Promise<PasswordResetTokenRow | null> {
  const rows = (await db.query(
    'SELECT * FROM password_reset_tokens WHERE token_hash = ?',
    [hash]
  )) as PasswordResetTokenRow[];
  return rows[0] ?? null;
}

export async function consumeResetToken(id: string): Promise<void> {
  await db.query(
    "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
    [id]
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/password-reset.repository.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/repositories/password-reset.repository.ts src/__tests__/password-reset.repository.test.ts
git commit -m "feat(server): password-reset repository (create / find / consume)"
```

---

### Task 17: Add Resend dependency + email client

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/server/email/client.ts`, `src/server/email/send.ts`
- Test: `src/__tests__/email-send.test.ts`

**Dependencies:** None

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

beforeEach(() => {
  sendMock.mockReset();
  vi.unstubAllEnvs();
});

describe('email/send', () => {
  it('logs to console and returns dev-mode result when RESEND_API_KEY missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { sendMail } = await import('@/server/email/send');
    const res = await sendMail({ to: 'a@b.c', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' });
    expect(res.dev).toBe(true);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('calls Resend.emails.send when key is set', async () => {
    vi.stubEnv('RESEND_API_KEY', 'real-key');
    vi.stubEnv('EMAIL_FROM', 'noreply@example.com');
    sendMock.mockResolvedValue({ data: { id: 'msg-1' }, error: null });
    const { sendMail } = await import('@/server/email/send');
    const res = await sendMail({ to: 'a@b.c', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' });
    expect(sendMock).toHaveBeenCalled();
    expect(res.id).toBe('msg-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/email-send.test.ts
```

Expected: FAIL — `resend` module not installed; `email/send` not present.

- [ ] **Step 3: Write minimal implementation**

```bash
npm install resend
```

Create `src/server/email/client.ts`:

```ts
import { Resend } from 'resend';

let cached: Resend | null = null;

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}
```

Create `src/server/email/send.ts`:

```ts
import { getResend } from './client';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendMailResult {
  id?: string;
  dev?: boolean;
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const client = getResend();
  if (!client) {
    console.log('[email] DEV MODE — would send:', input);
    return { dev: true };
  }
  const from = process.env.EMAIL_FROM ?? 'Financial Tracker <noreply@localhost>';
  const result = await client.emails.send({ from, ...input });
  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
  return { id: result.data?.id };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/email-send.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/server/email/ src/__tests__/email-send.test.ts
git commit -m "feat(email): Resend client + sendMail wrapper with dev fallback"
```

---

### Task 18: Build password-reset email template (EN + ID)

**Files:**
- Create: `src/server/email/templates/password-reset.ts`
- Test: `src/__tests__/password-reset-template.test.ts`

**Dependencies:** Task 17

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { renderPasswordResetEmail } from '@/server/email/templates/password-reset';

describe('renderPasswordResetEmail', () => {
  it('returns subject + html + text for EN locale', () => {
    const out = renderPasswordResetEmail({
      locale: 'en',
      resetUrl: 'https://app/reset?token=x',
    });
    expect(out.subject.toLowerCase()).toContain('reset');
    expect(out.html).toContain('https://app/reset?token=x');
    expect(out.text).toContain('https://app/reset?token=x');
  });

  it('returns Indonesian copy for ID locale', () => {
    const out = renderPasswordResetEmail({
      locale: 'id',
      resetUrl: 'https://app/reset?token=y',
    });
    expect(out.subject.toLowerCase()).toMatch(/reset|sandi/);
    expect(out.html).toContain('https://app/reset?token=y');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/password-reset-template.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/server/email/templates/password-reset.ts`:

```ts
export interface PasswordResetTemplateInput {
  locale: 'en' | 'id';
  resetUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const COPY = {
  en: {
    subject: 'Reset your Financial Tracker password',
    headline: 'Reset your ledger.',
    body: "We received a request to reset your password. The link below is valid for 1 hour. If you didn't ask for this, you can safely ignore this email.",
    cta: 'Reset password',
    fallback: 'Or paste this URL into your browser:',
    signoff: '— Financial Tracker',
  },
  id: {
    subject: 'Atur ulang kata sandi Financial Tracker Anda',
    headline: 'Atur ulang buku besar Anda.',
    body: 'Kami menerima permintaan untuk mengatur ulang kata sandi Anda. Tautan di bawah ini berlaku 1 jam. Abaikan email ini jika Anda tidak meminta perubahan.',
    cta: 'Atur ulang kata sandi',
    fallback: 'Atau tempel URL berikut ke browser Anda:',
    signoff: '— Financial Tracker',
  },
} as const;

export function renderPasswordResetEmail({ locale, resetUrl }: PasswordResetTemplateInput): RenderedEmail {
  const c = COPY[locale];
  const html = `<!doctype html>
<html><body style="margin:0;padding:32px;background:#f4f4f2;font-family:Geist,system-ui,sans-serif;color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e6e3;">
    <tr><td style="padding:32px 36px;">
      <div style="font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#6b6b6b;">FINANCIAL TRACKER</div>
      <h1 style="font-family:Fraunces,serif;font-style:italic;font-weight:400;font-size:32px;letter-spacing:-0.015em;line-height:1;margin:16px 0 12px;">${c.headline}</h1>
      <p style="font-size:14px;line-height:1.5;margin:0 0 24px;">${c.body}</p>
      <a href="${resetUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;font-size:12px;padding:14px 22px;text-decoration:none;">${c.cta} →</a>
      <p style="font-size:12px;color:#6b6b6b;margin:24px 0 4px;">${c.fallback}</p>
      <p style="font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;word-break:break-all;color:#0a0a0a;margin:0 0 24px;">${resetUrl}</p>
      <hr style="border:0;border-top:1px solid #e6e6e3;margin:24px 0;" />
      <p style="font-family:Fraunces,serif;font-style:italic;font-size:13px;color:#6b6b6b;margin:0;">${c.signoff}</p>
    </td></tr>
  </table>
</body></html>`;

  const text = `${c.headline}\n\n${c.body}\n\n${c.cta}: ${resetUrl}\n\n${c.signoff}\n`;

  return { subject: c.subject, html, text };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/password-reset-template.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/email/templates/ src/__tests__/password-reset-template.test.ts
git commit -m "feat(email): password-reset template (EN + ID)"
```

---

### Task 19: Build password-reset.service.ts

**Files:**
- Create: `src/server/services/password-reset.service.ts`
- Test: `src/__tests__/password-reset.service.test.ts`

**Dependencies:** Tasks 16, 17, 18

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetDb } from '@/server/db/sqlite-client';
import { registerUser } from '@/server/services/auth.service';
import {
  requestPasswordReset,
  consumePasswordReset,
} from '@/server/services/password-reset.service';

vi.mock('@/server/email/send', () => ({
  sendMail: vi.fn().mockResolvedValue({ dev: true }),
}));

describe('passwordResetService', () => {
  beforeEach(async () => { await resetDb(); });

  it('returns success for unknown email (no enumeration)', async () => {
    const r = await requestPasswordReset({ email: 'nobody@example.com', locale: 'en', appUrl: 'http://x' });
    expect(r.error).toBeUndefined();
  });

  it('issues a usable token for an existing user', async () => {
    await registerUser({ email: 'a@b.c', name: 'A', password: 'pw1234' });
    const issued = await requestPasswordReset({ email: 'a@b.c', locale: 'en', appUrl: 'http://x' });
    expect(issued.error).toBeUndefined();
    const raw = issued.data!.devToken!;
    const consumed = await consumePasswordReset({ rawToken: raw, newPassword: 'newpw1234' });
    expect(consumed.error).toBeUndefined();
  });

  it('rejects an already-used token', async () => {
    await registerUser({ email: 'a@b.c', name: 'A', password: 'pw1234' });
    const issued = await requestPasswordReset({ email: 'a@b.c', locale: 'en', appUrl: 'http://x' });
    const raw = issued.data!.devToken!;
    await consumePasswordReset({ rawToken: raw, newPassword: 'newpw1234' });
    const second = await consumePasswordReset({ rawToken: raw, newPassword: 'evenmore' });
    expect(second.error?.code).toBe('TOKEN_INVALID');
  });

  it('rejects an expired token', async () => {
    await registerUser({ email: 'a@b.c', name: 'A', password: 'pw1234' });
    const issued = await requestPasswordReset({
      email: 'a@b.c', locale: 'en', appUrl: 'http://x', ttlMs: -1000,
    });
    const raw = issued.data!.devToken!;
    const r = await consumePasswordReset({ rawToken: raw, newPassword: 'newpw1234' });
    expect(r.error?.code).toBe('TOKEN_EXPIRED');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/password-reset.service.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/server/services/password-reset.service.ts`:

```ts
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/server/db/client';
import {
  createResetToken,
  findResetTokenByHash,
  consumeResetToken,
} from '@/server/repositories/password-reset.repository';
import { sendMail } from '@/server/email/send';
import { renderPasswordResetEmail } from '@/server/email/templates/password-reset';

type ServiceResult<T> = { data?: T; error?: { message: string; code: string } };

const TTL_MS_DEFAULT = 60 * 60 * 1000;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export interface RequestResetInput {
  email: string;
  locale: 'en' | 'id';
  appUrl: string;
  ttlMs?: number;
}

export async function requestPasswordReset(
  input: RequestResetInput
): Promise<ServiceResult<{ sent: boolean; devToken?: string }>> {
  const ttl = input.ttlMs ?? TTL_MS_DEFAULT;
  const users = (await db.query('SELECT id, email FROM users WHERE email = ?', [input.email])) as Array<{ id: string }>;
  if (users.length === 0) return { data: { sent: true } };

  const raw = randomBytes(32).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + ttl).toISOString();
  await createResetToken({ userId: users[0].id, tokenHash, expiresAt });

  const url = `${input.appUrl.replace(/\/$/, '')}/reset-password?token=${raw}`;
  const email = renderPasswordResetEmail({ locale: input.locale, resetUrl: url });
  await sendMail({ to: input.email, ...email });

  return { data: { sent: true, devToken: process.env.NODE_ENV !== 'production' ? raw : undefined } };
}

export interface ConsumeResetInput {
  rawToken: string;
  newPassword: string;
}

export async function consumePasswordReset(
  input: ConsumeResetInput
): Promise<ServiceResult<{ userId: string }>> {
  const row = await findResetTokenByHash(hashToken(input.rawToken));
  if (!row) return { error: { message: 'Token invalid', code: 'TOKEN_INVALID' } };
  if (row.used_at) return { error: { message: 'Token already used', code: 'TOKEN_INVALID' } };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { error: { message: 'Token expired', code: 'TOKEN_EXPIRED' } };
  }

  const hash = await bcrypt.hash(input.newPassword, 10);
  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, row.user_id]);
  await consumeResetToken(row.id);
  return { data: { userId: row.user_id } };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/password-reset.service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/password-reset.service.ts src/__tests__/password-reset.service.test.ts
git commit -m "feat(server): password-reset service (request + consume)"
```

---

### Task 20: POST /api/auth/forgot-password route

**Files:**
- Create: `src/app/api/auth/forgot-password/route.ts`
- Test: `src/__tests__/forgot-password.api.test.ts`

**Dependencies:** Task 19

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/forgot-password/route';
import { resetDb } from '@/server/db/sqlite-client';

vi.mock('@/server/email/send', () => ({ sendMail: vi.fn().mockResolvedValue({ dev: true }) }));

describe('POST /api/auth/forgot-password', () => {
  beforeEach(async () => { await resetDb(); });

  function req(body: Record<string, unknown>) {
    return new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as Parameters<typeof POST>[0];
  }

  it('returns 200 even for unknown email', async () => {
    const res = await POST(req({ email: 'nobody@example.com', locale: 'en' }));
    expect(res.status).toBe(200);
  });

  it('rejects invalid email with 400', async () => {
    const res = await POST(req({ email: 'not-an-email', locale: 'en' }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/forgot-password.api.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/api/auth/forgot-password/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requestPasswordReset } from '@/server/services/password-reset.service';

const schema = z.object({
  email: z.string().email(),
  locale: z.enum(['en', 'id']).default('en'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }
    const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
    const result = await requestPasswordReset({ ...parsed.data, appUrl });
    if (result.error) {
      return NextResponse.json({ error: { message: result.error.message } }, { status: 500 });
    }
    return NextResponse.json({ data: { sent: true } });
  } catch (error) {
    console.error('[forgot-password] error:', error);
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/forgot-password.api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/forgot-password/ src/__tests__/forgot-password.api.test.ts
git commit -m "feat(api): POST /api/auth/forgot-password"
```

---

### Task 21: POST /api/auth/reset-password route

**Files:**
- Create: `src/app/api/auth/reset-password/route.ts`
- Test: `src/__tests__/reset-password.api.test.ts`

**Dependencies:** Task 19

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/reset-password/route';
import { resetDb } from '@/server/db/sqlite-client';
import { registerUser } from '@/server/services/auth.service';
import { requestPasswordReset } from '@/server/services/password-reset.service';

vi.mock('@/server/email/send', () => ({ sendMail: vi.fn().mockResolvedValue({ dev: true }) }));

describe('POST /api/auth/reset-password', () => {
  beforeEach(async () => { await resetDb(); });

  function req(body: Record<string, unknown>) {
    return new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as Parameters<typeof POST>[0];
  }

  it('200 on valid token + password', async () => {
    await registerUser({ email: 'a@b.c', name: 'A', password: 'pw1234' });
    const issued = await requestPasswordReset({ email: 'a@b.c', locale: 'en', appUrl: 'http://x' });
    const res = await req({ token: issued.data!.devToken!, password: 'newpw1234' });
    const r = await POST(res);
    expect(r.status).toBe(200);
  });

  it('400 on invalid token', async () => {
    const r = await POST(req({ token: 'nope', password: 'newpw1234' }));
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/reset-password.api.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/api/auth/reset-password/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { consumePasswordReset } from '@/server/services/password-reset.service';

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }
    const result = await consumePasswordReset({ rawToken: parsed.data.token, newPassword: parsed.data.password });
    if (result.error) {
      return NextResponse.json(
        { error: { message: result.error.message, code: result.error.code } },
        { status: 400 }
      );
    }
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error('[reset-password] error:', error);
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/reset-password.api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/reset-password/ src/__tests__/reset-password.api.test.ts
git commit -m "feat(api): POST /api/auth/reset-password"
```

---

### Task 22: /forgot-password page

**Files:**
- Create: `src/app/forgot-password/page.tsx`
- Test: `src/__tests__/forgot-password-page.test.ts`

**Dependencies:** Tasks 5, 10, 20

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/forgot-password/page.tsx'), 'utf-8');

describe('/forgot-password page', () => {
  it('uses EditorialHero + EditorialField', () => {
    expect(src).toContain('EditorialHero');
    expect(src).toContain('EditorialField');
  });
  it('posts to /api/auth/forgot-password', () => {
    expect(src).toContain('/api/auth/forgot-password');
  });
  it('shows confirmation panel after submit', () => {
    expect(src).toMatch(/forgotSent|CHECK YOUR EMAIL/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/forgot-password-page.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/forgot-password/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { EditorialHero } from '@/components/login/EditorialHero';
import { EditorialField } from '@/components/login/EditorialField';
import { t, useLocale } from '@/lib/i18n';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-[var(--paper)]">
      <div className="hidden lg:block"><EditorialHero locale={locale} /></div>
      <div className="flex items-center justify-center px-14 py-14">
        {sent ? (
          <div className="ft-rise flex max-w-md flex-col gap-3">
            <div className="ft-eyebrow">{t(locale, 'forgotSent')}</div>
            <h2 className="ft-display-up text-4xl">{locale === 'en' ? 'Sent.' : 'Terkirim.'}</h2>
            <p className="ft-display text-[15px] text-[var(--ink-3)]">
              {locale === 'en'
                ? 'Check your inbox for a link to reset your password.'
                : 'Periksa kotak masuk Anda untuk tautan setel ulang.'}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex max-w-md flex-col gap-3">
            <div className="ft-eyebrow">{locale === 'en' ? 'RESET' : 'SETEL ULANG'}</div>
            <h2 className="ft-display-up text-4xl">{t(locale, 'forgotTitle')}</h2>
            <p className="ft-display text-[15px] text-[var(--ink-3)]">{t(locale, 'forgotSubtitle')}</p>
            <EditorialField label="Email" value={email} onChange={setEmail} type="email" required autoFocus />
            <button
              type="submit"
              disabled={busy || !email}
              className="mt-3 w-full bg-[var(--ink)] px-4 py-3.5 text-xs font-semibold uppercase tracking-widest text-[var(--paper)] disabled:opacity-50"
            >
              {t(locale, 'forgotSubmit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/forgot-password-page.test.ts
npm run typecheck
```

Both expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/forgot-password/ src/__tests__/forgot-password-page.test.ts
git commit -m "feat(pages): /forgot-password — editorial request + sent states"
```

---

### Task 23: /reset-password page with strength meter

**Files:**
- Create: `src/app/reset-password/page.tsx`
- Test: `src/__tests__/reset-password-page.test.ts`

**Dependencies:** Tasks 5, 10, 21

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/reset-password/page.tsx'), 'utf-8');

describe('/reset-password page', () => {
  it('uses EditorialHero + 2 EditorialField inputs', () => {
    expect(src).toContain('EditorialHero');
    const fieldCount = (src.match(/EditorialField/g) ?? []).length;
    expect(fieldCount).toBeGreaterThanOrEqual(2);
  });
  it('reads token from search params', () => {
    expect(src).toMatch(/useSearchParams|searchParams\.get\('token'\)/);
  });
  it('renders a 4-segment strength meter', () => {
    expect(src).toMatch(/strength/i);
  });
  it('posts to /api/auth/reset-password', () => {
    expect(src).toContain('/api/auth/reset-password');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/reset-password-page.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/reset-password/page.tsx`:

```tsx
'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EditorialHero } from '@/components/login/EditorialHero';
import { EditorialField } from '@/components/login/EditorialField';
import { t, useLocale } from '@/lib/i18n';

function strengthScore(pwd: string): number {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

function ResetPasswordInner() {
  const router = useRouter();
  const locale = useLocale();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const score = useMemo(() => strengthScore(pwd), [pwd]);
  const matches = pwd === confirm && pwd.length > 0;
  const canSubmit = score >= 2 && matches && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pwd }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? 'Reset failed');
      } else {
        router.push('/login');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-[var(--paper)]">
      <div className="hidden lg:block"><EditorialHero locale={locale} /></div>
      <form onSubmit={submit} className="flex flex-col items-stretch justify-center gap-3 px-14 py-14">
        <div className="ft-eyebrow">{locale === 'en' ? 'RESET' : 'SETEL ULANG'}</div>
        <h2 className="ft-display-up text-4xl">{t(locale, 'resetTitle')}</h2>
        <p className="ft-display text-[15px] text-[var(--ink-3)]">{t(locale, 'resetSubtitle')}</p>

        <EditorialField label={t(locale, 'authPasswordLabel')} value={pwd} onChange={setPwd} type="password" required autoFocus />
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-1 flex-1 bg-[var(--paper-2)]">
              <div
                className="h-full transition-[width]"
                style={{ width: score > i ? '100%' : '0%', background: 'var(--accent)' }}
              />
            </div>
          ))}
        </div>
        <div className="ft-eyebrow">{t(locale, 'resetStrength')} · {score}/4</div>

        <EditorialField label={locale === 'en' ? 'Confirm password' : 'Konfirmasi kata sandi'} value={confirm} onChange={setConfirm} type="password" required />
        {confirm && !matches && (
          <div className="text-xs text-[var(--neg)]">{t(locale, 'resetMismatch')}</div>
        )}

        {error && (
          <div role="alert" className="border border-[var(--neg)] bg-[var(--neg-soft)] px-3 py-2 text-xs text-[var(--neg)]">{error}</div>
        )}

        <button type="submit" disabled={!canSubmit} className="mt-3 w-full bg-[var(--ink)] px-4 py-3.5 text-xs font-semibold uppercase tracking-widest text-[var(--paper)] disabled:opacity-50">
          {t(locale, 'resetSubmit')}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/reset-password-page.test.ts
npm run typecheck
```

Both expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/reset-password/ src/__tests__/reset-password-page.test.ts
git commit -m "feat(pages): /reset-password — strength meter + match validation"
```

---

### Task 24: Add oauth_accounts schema (and make password_hash nullable)

**Files:**
- Modify: `src/server/db/client.ts`
- Test: `src/__tests__/db-oauth-schema.test.ts`

**Dependencies:** None (independent of password reset path; can run in parallel with Tasks 15–23 architecturally, but commit after them so the migration sequence is linear)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, db } from '@/server/db/sqlite-client';

describe('db schema — oauth_accounts', () => {
  beforeEach(async () => { await resetDb(); });

  it('has the expected columns', async () => {
    const rows = await db.query(`PRAGMA table_info(oauth_accounts)`);
    const cols = rows.map((r: { name: string }) => r.name).sort();
    expect(cols).toEqual([
      'avatar_url', 'created_at', 'display_name', 'email', 'id',
      'provider', 'provider_subject', 'user_id',
    ]);
  });

  it('users.password_hash is nullable', async () => {
    const cols = (await db.query(`PRAGMA table_info(users)`)) as Array<{ name: string; notnull: number }>;
    const ph = cols.find((c) => c.name === 'password_hash');
    expect(ph).toBeDefined();
    expect(ph!.notnull).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/db-oauth-schema.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

In `src/server/db/client.ts`:

1. Update the `users` DDL — change `password_hash TEXT NOT NULL` to `password_hash TEXT`.
2. Add to the `tables` array:

```ts
`CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE(provider, provider_subject)
)`,
```

3. Add an index after the loop:

```ts
try { await client.exec(`CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id)`); } catch {}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/db-oauth-schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/db/client.ts src/__tests__/db-oauth-schema.test.ts
git commit -m "feat(db): oauth_accounts table + nullable users.password_hash"
```

---

### Task 25: PKCE utility module

**Files:**
- Create: `src/server/auth/pkce.ts`
- Test: `src/__tests__/pkce.test.ts`

**Dependencies:** None

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/pkce.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/server/auth/pkce.ts`:

```ts
import { randomBytes, createHash } from 'crypto';

export function generateVerifier(): string {
  return randomBytes(48).toString('base64url');
}

export function challengeFromVerifier(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/pkce.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/pkce.ts src/__tests__/pkce.test.ts
git commit -m "feat(auth): PKCE verifier + challenge helpers"
```

---

### Task 26: Google OAuth helpers (URL builder, token exchange, userinfo)

**Files:**
- Create: `src/server/auth/google.ts`
- Test: `src/__tests__/google-auth.test.ts`

**Dependencies:** Task 25

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildGoogleAuthUrl, exchangeCodeForTokens, fetchUserInfo } from '@/server/auth/google';

beforeEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('google auth helpers', () => {
  it('buildGoogleAuthUrl includes required query params', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'cid');
    const url = new URL(buildGoogleAuthUrl({ redirectUri: 'http://x/cb', state: 's', codeChallenge: 'c' }));
    expect(url.host).toBe('accounts.google.com');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('redirect_uri')).toBe('http://x/cb');
    expect(url.searchParams.get('state')).toBe('s');
    expect(url.searchParams.get('code_challenge')).toBe('c');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('response_type')).toBe('code');
  });

  it('exchangeCodeForTokens posts to token endpoint with code+verifier', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'cid');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'csec');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'at', id_token: 'it', expires_in: 3600 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const tokens = await exchangeCodeForTokens({ code: 'c', codeVerifier: 'v', redirectUri: 'http://x/cb' });
    expect(tokens.access_token).toBe('at');
    expect(fetchMock.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');
  });

  it('fetchUserInfo reads userinfo with bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sub: 'g-1', email: 'a@b.c', email_verified: true, name: 'A', picture: 'p' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const u = await fetchUserInfo('at');
    expect(u.sub).toBe('g-1');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer at');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/google-auth.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/server/auth/google.ts`:

```ts
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

export interface BuildAuthUrlInput {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}

export function buildGoogleAuthUrl(input: BuildAuthUrlInput): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not set');
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', input.state);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('access_type', 'online');
  return url.toString();
}

export interface ExchangeInput {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface GoogleTokens {
  access_token: string;
  id_token: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(input: ExchangeInput): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google credentials not set');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: input.redirectUri,
    code_verifier: input.codeVerifier,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  return (await res.json()) as GoogleTokens;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

export async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`userinfo failed: ${res.status}`);
  return (await res.json()) as GoogleUserInfo;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/google-auth.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/google.ts src/__tests__/google-auth.test.ts
git commit -m "feat(auth): Google OAuth helpers (auth URL, exchange, userinfo)"
```

---

### Task 27: oauth-account.repository.ts

**Files:**
- Create: `src/server/repositories/oauth-account.repository.ts`
- Test: `src/__tests__/oauth-account.repository.test.ts`

**Dependencies:** Task 24

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/sqlite-client';
import {
  insertOAuthAccount,
  findOAuthAccount,
} from '@/server/repositories/oauth-account.repository';

describe('oauthAccountRepository', () => {
  beforeEach(async () => { await resetDb(); });

  it('insert + find by (provider, subject)', async () => {
    await insertOAuthAccount({
      userId: 'u-1', provider: 'google', providerSubject: 'g-1',
      email: 'a@b.c', displayName: 'A', avatarUrl: 'p',
    });
    const found = await findOAuthAccount('google', 'g-1');
    expect(found?.user_id).toBe('u-1');
  });

  it('returns null when not found', async () => {
    const found = await findOAuthAccount('google', 'missing');
    expect(found).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/oauth-account.repository.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/server/repositories/oauth-account.repository.ts`:

```ts
import { randomUUID } from 'crypto';
import { db } from '@/server/db/client';

export interface OAuthAccountRow {
  id: string;
  user_id: string;
  provider: string;
  provider_subject: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface InsertOAuthAccountInput {
  userId: string;
  provider: string;
  providerSubject: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export async function insertOAuthAccount(input: InsertOAuthAccountInput): Promise<OAuthAccountRow> {
  const id = randomUUID();
  await db.query(
    `INSERT INTO oauth_accounts (id, user_id, provider, provider_subject, email, display_name, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.provider,
      input.providerSubject,
      input.email,
      input.displayName ?? null,
      input.avatarUrl ?? null,
    ]
  );
  const rows = (await db.query('SELECT * FROM oauth_accounts WHERE id = ?', [id])) as OAuthAccountRow[];
  return rows[0];
}

export async function findOAuthAccount(provider: string, subject: string): Promise<OAuthAccountRow | null> {
  const rows = (await db.query(
    'SELECT * FROM oauth_accounts WHERE provider = ? AND provider_subject = ?',
    [provider, subject]
  )) as OAuthAccountRow[];
  return rows[0] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/oauth-account.repository.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/repositories/oauth-account.repository.ts src/__tests__/oauth-account.repository.test.ts
git commit -m "feat(server): oauth-account repository (insert + find)"
```

---

### Task 28: oauth.service.ts (linking rules)

**Files:**
- Create: `src/server/services/oauth.service.ts`
- Test: `src/__tests__/oauth.service.test.ts`

**Dependencies:** Tasks 24, 26, 27

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, db } from '@/server/db/sqlite-client';
import { registerUser } from '@/server/services/auth.service';
import { handleGoogleCallbackUser } from '@/server/services/oauth.service';
import { insertOAuthAccount } from '@/server/repositories/oauth-account.repository';

const profile = (over: Partial<{ sub: string; email: string; verified: boolean }> = {}) => ({
  sub: 'g-1',
  email: 'a@b.c',
  email_verified: true,
  name: 'A',
  picture: 'p',
  ...over,
  ...(over.verified !== undefined ? { email_verified: over.verified } : {}),
});

describe('oauth service — linking rules', () => {
  beforeEach(async () => { await resetDb(); });

  it('rule 1: returns existing user when oauth row exists', async () => {
    await registerUser({ email: 'a@b.c', name: 'A', password: 'pw1234' });
    const u = (await db.query('SELECT id FROM users WHERE email = ?', ['a@b.c'])) as Array<{ id: string }>;
    await insertOAuthAccount({ userId: u[0].id, provider: 'google', providerSubject: 'g-1', email: 'a@b.c' });

    const r = await handleGoogleCallbackUser(profile());
    expect(r.error).toBeUndefined();
    expect(r.data!.user.id).toBe(u[0].id);
    expect(r.data!.isNew).toBe(false);
  });

  it('rule 2: links existing email user when verified', async () => {
    await registerUser({ email: 'a@b.c', name: 'A', password: 'pw1234' });
    const r = await handleGoogleCallbackUser(profile());
    expect(r.error).toBeUndefined();
    expect(r.data!.isNew).toBe(false);
    expect(r.data!.user.email).toBe('a@b.c');
  });

  it('rule 3: creates new user when no email match', async () => {
    const r = await handleGoogleCallbackUser(profile({ email: 'new@example.com' }));
    expect(r.error).toBeUndefined();
    expect(r.data!.isNew).toBe(true);
  });

  it('rule 4: rejects unverified Google email', async () => {
    const r = await handleGoogleCallbackUser(profile({ verified: false }));
    expect(r.error?.code).toBe('oauth_email_unverified');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/oauth.service.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/server/services/oauth.service.ts`:

```ts
import { randomUUID } from 'crypto';
import { db } from '@/server/db/client';
import {
  findOAuthAccount,
  insertOAuthAccount,
} from '@/server/repositories/oauth-account.repository';
import type { GoogleUserInfo } from '@/server/auth/google';

type ServiceResult<T> = { data?: T; error?: { message: string; code: string } };

export interface OAuthCallbackResult {
  user: { id: string; email: string; name: string };
  isNew: boolean;
}

export async function handleGoogleCallbackUser(
  profile: GoogleUserInfo
): Promise<ServiceResult<OAuthCallbackResult>> {
  if (!profile.email_verified) {
    return { error: { message: 'Email not verified', code: 'oauth_email_unverified' } };
  }

  // Rule 1: existing oauth_accounts row → sign in that user
  const existing = await findOAuthAccount('google', profile.sub);
  if (existing) {
    const rows = (await db.query('SELECT id, email, name FROM users WHERE id = ?', [existing.user_id])) as Array<{
      id: string; email: string; name: string;
    }>;
    if (rows[0]) return { data: { user: rows[0], isNew: false } };
  }

  // Rule 2: existing email match → link
  const byEmail = (await db.query('SELECT id, email, name FROM users WHERE email = ?', [profile.email])) as Array<{
    id: string; email: string; name: string;
  }>;
  if (byEmail[0]) {
    await insertOAuthAccount({
      userId: byEmail[0].id,
      provider: 'google',
      providerSubject: profile.sub,
      email: profile.email,
      displayName: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
    });
    return { data: { user: byEmail[0], isNew: false } };
  }

  // Rule 3: create new user with no password
  const userId = randomUUID();
  const name = profile.name ?? profile.email.split('@')[0];
  await db.query(
    'INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)',
    [userId, profile.email, name, null]
  );
  await insertOAuthAccount({
    userId,
    provider: 'google',
    providerSubject: profile.sub,
    email: profile.email,
    displayName: profile.name ?? null,
    avatarUrl: profile.picture ?? null,
  });
  return { data: { user: { id: userId, email: profile.email, name }, isNew: true } };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/oauth.service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/oauth.service.ts src/__tests__/oauth.service.test.ts
git commit -m "feat(server): oauth service — Google linking rules"
```

---

### Task 29: GET /api/auth/google route

**Files:**
- Create: `src/app/api/auth/google/route.ts`
- Test: `src/__tests__/google-route.test.ts`

**Dependencies:** Tasks 25, 26

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/auth/google/route';

beforeEach(() => { vi.unstubAllEnvs(); });

describe('GET /api/auth/google', () => {
  it('redirects to Google with state + code_challenge cookies', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'cid');
    vi.stubEnv('APP_URL', 'http://localhost:3000');
    const req = new Request('http://localhost:3000/api/auth/google');
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('accounts.google.com');
    const cookies = res.headers.get('set-cookie') || '';
    expect(cookies).toContain('oauth_state=');
    expect(cookies).toContain('oauth_verifier=');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/google-route.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/api/auth/google/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { buildGoogleAuthUrl } from '@/server/auth/google';
import { generateVerifier, challengeFromVerifier } from '@/server/auth/pkce';

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/google/callback`;
  const state = randomBytes(32).toString('hex');
  const verifier = generateVerifier();
  const challenge = challengeFromVerifier(verifier);

  const url = buildGoogleAuthUrl({ redirectUri, state, codeChallenge: challenge });
  const res = NextResponse.redirect(url);
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 600,
    path: '/',
  };
  res.cookies.set('oauth_state', state, opts);
  res.cookies.set('oauth_verifier', verifier, opts);
  return res;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/google-route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/google/route.ts src/__tests__/google-route.test.ts
git commit -m "feat(api): GET /api/auth/google — kick off OAuth with PKCE"
```

---

### Task 30: GET /api/auth/google/callback route

**Files:**
- Create: `src/app/api/auth/google/callback/route.ts`
- Test: `src/__tests__/google-callback.api.test.ts`

**Dependencies:** Tasks 26, 28, 29

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/auth/google/callback/route';
import { resetDb } from '@/server/db/sqlite-client';

vi.mock('@/server/auth/google', () => ({
  exchangeCodeForTokens: vi.fn().mockResolvedValue({ access_token: 'at', id_token: 'it', expires_in: 3600 }),
  fetchUserInfo: vi.fn().mockResolvedValue({ sub: 'g-1', email: 'new@example.com', email_verified: true, name: 'N' }),
}));

function reqWithCookies(query: string, cookies: Record<string, string>) {
  const r = new Request(`http://localhost:3000/api/auth/google/callback${query}`, {
    headers: { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') },
  });
  return r as unknown as Parameters<typeof GET>[0];
}

beforeEach(async () => { await resetDb(); });

describe('GET /api/auth/google/callback', () => {
  it('302s to /home on success and sets auth-token cookie', async () => {
    const res = await GET(reqWithCookies('?code=c&state=s', { oauth_state: 's', oauth_verifier: 'v' }));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toMatch(/\/home$/);
    const cookies = res.headers.get('set-cookie') || '';
    expect(cookies).toContain('auth-token=');
  });

  it('redirects to /login?error=oauth_state_mismatch on state mismatch', async () => {
    const res = await GET(reqWithCookies('?code=c&state=DIFFERENT', { oauth_state: 's', oauth_verifier: 'v' }));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('error=oauth_state_mismatch');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/google-callback.api.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/api/auth/google/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, fetchUserInfo } from '@/server/auth/google';
import { handleGoogleCallbackUser } from '@/server/services/oauth.service';
import { issueSessionForUser } from '@/server/services/auth.service';

function loginRedirect(origin: string, code: string) {
  return NextResponse.redirect(`${origin}/login?error=${code}`);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = request.cookies.get('oauth_state')?.value;
  const cookieVerifier = request.cookies.get('oauth_verifier')?.value;

  if (!code || !state || !cookieState || state !== cookieState || !cookieVerifier) {
    return loginRedirect(origin, 'oauth_state_mismatch');
  }

  try {
    const appUrl = process.env.APP_URL ?? origin;
    const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/google/callback`;
    const tokens = await exchangeCodeForTokens({ code, codeVerifier: cookieVerifier, redirectUri });
    const profile = await fetchUserInfo(tokens.access_token);
    const result = await handleGoogleCallbackUser(profile);
    if (result.error) {
      return loginRedirect(origin, result.error.code);
    }
    const token = await issueSessionForUser(result.data!.user.id);
    const res = NextResponse.redirect(`${origin}/home`);
    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    res.cookies.delete('oauth_state');
    res.cookies.delete('oauth_verifier');
    return res;
  } catch (error) {
    console.error('[oauth/google/callback]', error);
    return loginRedirect(origin, 'oauth_provider_error');
  }
}
```

If `issueSessionForUser` does not exist in `src/server/services/auth.service.ts`, add a small exported helper there that takes a user id and returns a freshly minted session token (mirror the JWT or random-token pattern already used by `loginUser`). One-paragraph addition; keep this in the same task to avoid splitting the OAuth callback work.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/google-callback.api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/google/callback/ src/server/services/auth.service.ts src/__tests__/google-callback.api.test.ts
git commit -m "feat(api): GET /api/auth/google/callback — verify state, link, sign in"
```

---

### Task 31: Wire OAuth error banner in LoginForm

**Files:**
- Modify: `src/components/login/LoginForm.tsx` (read `?error=` param)
- Modify: `src/app/login/page.tsx` (forward error param)
- Test: extend `src/__tests__/LoginForm.test.tsx`

**Dependencies:** Tasks 12, 13, 30

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/LoginForm.test.tsx`:

```tsx
it('renders an editorial error banner mapped from oauthError prop', () => {
  render(<LoginForm locale="en" oauthError="oauth_email_unverified" />);
  expect(screen.getByRole('alert').textContent).toMatch(/Verify your Google email/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/LoginForm.test.tsx
```

Expected: FAIL — prop unsupported.

- [ ] **Step 3: Write minimal implementation**

In `src/components/login/LoginForm.tsx`:

1. Add `oauthError?: string` to `LoginFormProps`.
2. At the top of the component, derive a translated message:

```tsx
const oauthMessage = (() => {
  if (!oauthError) return null;
  switch (oauthError) {
    case 'oauth_email_unverified': return t(locale, 'oauthErrorEmailUnverified');
    case 'oauth_state_mismatch':   return t(locale, 'oauthErrorStateMismatch');
    default:                        return t(locale, 'oauthErrorGeneric');
  }
})();
```

3. Render under the error alert when present:

```tsx
{oauthMessage && (
  <div role="alert" className="border border-[var(--neg)] bg-[var(--neg-soft)] px-3 py-2 text-xs text-[var(--neg)]">
    {oauthMessage}
  </div>
)}
```

In `src/app/login/page.tsx`, read and pass:

```tsx
const oauthError = params.get('error') ?? undefined;
// ...
<LoginForm locale={locale} sessionExpired={sessionExpired} oauthError={oauthError} />
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/LoginForm.test.tsx
npx vitest run src/__tests__/login-page-composition.test.ts
```

Both expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/login/LoginForm.tsx src/app/login/page.tsx src/__tests__/LoginForm.test.tsx
git commit -m "feat(login): wire oauthError banner from /login?error= param"
```

---

### Task 32: First-paint theme bootstrap script

**Files:**
- Modify: `src/app/layout.tsx`
- Test: `src/__tests__/layout-theme-bootstrap.test.ts`

**Dependencies:** Task 1

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/layout.tsx'), 'utf-8');

describe('layout — first-paint theme bootstrap', () => {
  it('contains an inline <script> reading localStorage theme', () => {
    expect(src).toMatch(/dangerouslySetInnerHTML/);
    expect(src).toContain("localStorage");
    expect(src).toMatch(/classList\.add\(['"]dark['"]\)/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/layout-theme-bootstrap.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

In `src/app/layout.tsx`, inside `<head>` (add a `<head>` if missing) before the body, insert:

```tsx
<head>
  <script
    dangerouslySetInnerHTML={{
      __html: `(function(){try{var t=localStorage.getItem('theme');var s=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t==='system'&&s)||(!t&&s)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
    }}
  />
</head>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/layout-theme-bootstrap.test.ts
npm run typecheck
```

Both expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/__tests__/layout-theme-bootstrap.test.ts
git commit -m "feat(theme): inline first-paint script to prevent dark-mode flash"
```

---

### Task 33: Compatibility pass — replace hardcoded blue/emerald hex values with tokens

**Files:**
- Modify: any `.tsx` / `.ts` / `.css` file that contains `#2563EB`, `#10b981`, `#ef4444`, `#f59e0b`, or `from-blue-50 via-white to-emerald-50` (excluding `.design-bundle/` and `archive/`)
- Test: `src/__tests__/no-hardcoded-design-hex.test.ts`

**Dependencies:** Task 2

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

const FORBIDDEN_HEX = ['#2563EB', '#2563eb', '#10b981', '#10B981', '#ef4444', '#EF4444', '#f59e0b', '#F59E0B'];

describe('no hardcoded design-token hex values in src/', () => {
  for (const hex of FORBIDDEN_HEX) {
    it(`does not appear in src/ (use tokens instead): ${hex}`, () => {
      let out = '';
      try {
        out = execSync(
          `git grep -n -F -e "${hex}" -- "src/**" ":(exclude)src/__tests__/no-hardcoded-design-hex.test.ts"`,
          { encoding: 'utf-8' }
        );
      } catch (e) {
        // git grep exits 1 when no matches — that's a pass
        const err = e as { status?: number; stdout?: string };
        if (err.status === 1) return;
        throw e;
      }
      expect(out).toBe('');
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/no-hardcoded-design-hex.test.ts
```

Expected: FAIL — list of files containing each hex.

- [ ] **Step 3: Write minimal implementation**

For each hex listed in failures:
- Replace with the matching token: `#2563EB` → `var(--accent)` (or `bg-primary` / `text-primary` for Tailwind class form), `#10b981` → `var(--pos)`, `#ef4444` → `var(--neg)`, `#f59e0b` → `var(--warn)`.
- For `from-blue-50 via-white to-emerald-50` and similar Tailwind class strings, remove the gradient and replace with `bg-[var(--paper)]` or `bg-[var(--paper-2)]` per context.

Run grep to enumerate before editing:

```bash
git grep -n -F "#2563EB" -- src/
git grep -n -F "#10b981" -- src/
git grep -n -F "#ef4444" -- src/
git grep -n -F "#f59e0b" -- src/
git grep -n "from-blue-50 via-white to-emerald-50" -- src/
```

Edit each file individually (do not introduce widespread refactors — token swap only).

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/no-hardcoded-design-hex.test.ts
npm run typecheck
npm run lint
```

All expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -u
git add src/__tests__/no-hardcoded-design-hex.test.ts
git commit -m "refactor(theme): replace hardcoded blue/emerald hex values with tokens"
```

---

### Task 34: Numeral upgrade — add font-mono to currency/date displays

**Files:**
- Modify: dashboard widget files (`src/components/dashboard/*.tsx`), `src/features/dashboard/CashFlowChart.tsx`, transaction table cells, savings progress, bills, balance cards. Touched component-by-component.

**Dependencies:** Task 2

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/numerals-mono.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const TARGETS = [
  'src/features/dashboard/CashFlowChart.tsx',
  'src/components/dashboard/SummaryCard.tsx',
  'src/components/transactions/TransactionsTable.tsx',
];

describe('amount displays use the mono font token', () => {
  for (const path of TARGETS) {
    if (!existsSync(resolve(path))) continue;
    it(`${path} references font-mono or var(--font-mono)`, () => {
      const src = readFileSync(resolve(path), 'utf-8');
      const usesMono = src.includes('font-mono') || src.includes('var(--font-mono)') || src.includes('ft-mono');
      expect(usesMono).toBe(true);
    });
  }
});
```

(Adjust the `TARGETS` array to match the actual filenames in your codebase. Run `git grep -l "formatIDR\|currency"` if unsure; pick 3–5 representative files.)

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/numerals-mono.test.ts
```

Expected: FAIL on any target file that does not currently apply `font-mono` / `var(--font-mono)` / `ft-mono` to amount text.

- [ ] **Step 3: Write minimal implementation**

For each failing target file: add `className="font-mono"` (or `className="ft-mono"`) to the JSX element rendering the currency amount, percentage, or date stamp. Do not refactor surrounding markup.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/numerals-mono.test.ts
npm test
```

Both expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -u
git add src/__tests__/numerals-mono.test.ts
git commit -m "feat(theme): apply mono font to currency / date / percent displays"
```

---

### Task 35: Update .env.example

**Files:**
- Modify: `.env.example`

**Dependencies:** None

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/env-example.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const env = readFileSync(resolve('.env.example'), 'utf-8');

describe('.env.example', () => {
  it('declares Resend + email vars', () => {
    expect(env).toMatch(/^RESEND_API_KEY=/m);
    expect(env).toMatch(/^EMAIL_FROM=/m);
  });
  it('declares APP_URL', () => {
    expect(env).toMatch(/^APP_URL=/m);
  });
  it('declares Google OAuth vars', () => {
    expect(env).toMatch(/^GOOGLE_CLIENT_ID=/m);
    expect(env).toMatch(/^GOOGLE_CLIENT_SECRET=/m);
    expect(env).toMatch(/^GOOGLE_REDIRECT_URI=/m);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/env-example.test.ts
```

Expected: FAIL — keys missing.

- [ ] **Step 3: Write minimal implementation**

Append to `.env.example`:

```
# --- Email (Resend) ---
RESEND_API_KEY=
EMAIL_FROM=Financial Tracker <noreply@example.com>

# --- App ---
APP_URL=http://localhost:3000

# --- Google OAuth ---
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/env-example.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .env.example src/__tests__/env-example.test.ts
git commit -m "chore(env): document RESEND, APP_URL, GOOGLE_* in .env.example"
```

---

### Task 36: Final preflight + manual verification checklist

**Files:**
- None to modify (verification-only task)

**Dependencies:** All prior tasks

- [ ] **Step 1: Run preflight**

```bash
npm run preflight
```

Expected: format check + typecheck + lint + build all pass.

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: 69+ files, all green.

- [ ] **Step 3: Boot dev server and walk through manual checklist**

```bash
npm run dev
```

Manually verify in a browser:
- `/login` renders editorial split-panel; ribbon, ticker, counters all animate; theme toggle in top-right works
- `/login?reason=expired` shows the SESSION ENDED banner
- Submit valid creds → land on `/home` with cookie set; check Application → Cookies for `Max-Age` (≈ 7 days)
- Tick "Keep me signed in" + submit → cookie `Max-Age` ≈ 30 days
- `/login?error=oauth_state_mismatch` shows banner with translated message
- `/forgot-password` → submit any email → confirmation panel; in dev, console logs the reset URL → paste into browser → set new password → redirect to `/login` → sign in with new password works
- Click "Continue with Google" with `GOOGLE_CLIENT_ID` set → consent screen → callback → `/home`
- Toggle dark mode in Settings — every page repaints without flash
- Set OS to `prefers-reduced-motion: reduce` → ribbon, ticker, counters, stagger all freeze
- `/register` renders editorial layout; submit creates user

- [ ] **Step 4: Lighthouse on /login**

In Chrome DevTools, run Lighthouse on `/login` and confirm:
- No "render-blocking resources" warning that wasn't there before
- No "cumulative layout shift" attributable to font swap

- [ ] **Step 5: Final commit if anything trivial fixed during verification**

```bash
git status
# If any small fix was needed:
git add <files>
git commit -m "chore: final polish from manual verification"
```

If verification passes with no changes, no commit needed; the implementation is complete.

---

## Parallel Execution Map

The following groups can be implemented in parallel (within each group, tasks are independent):

```
Parallel Group 1 (foundation, all independent):
  Task 1  — Fonts in layout.tsx
  Task 2  — Editorial tokens in globals.css
  Task 5  — i18n keys
  Task 11 — keepSignedIn flag in /api/auth/login
  Task 15 — password_reset_tokens schema
  Task 24 — oauth_accounts schema + nullable password_hash
  Task 25 — PKCE module
  Task 17 — Resend email client
  Task 35 — .env.example

Sequential dependencies:
  Task 3 ← Task 2
  Task 4 ← Task 3
  Task 6 ← Task 4
  Task 7 ← Task 4
  Task 8 ← Task 4
  Task 9 ← Task 4
  Task 32 ← Task 1
  Task 16 ← Task 15
  Task 18 ← Task 17
  Task 19 ← Task 16, Task 17, Task 18
  Task 20 ← Task 19
  Task 21 ← Task 19
  Task 22 ← Task 5, Task 10, Task 20
  Task 23 ← Task 5, Task 10, Task 21
  Task 26 ← Task 25
  Task 27 ← Task 24
  Task 28 ← Task 24, Task 26, Task 27
  Task 29 ← Task 25, Task 26
  Task 30 ← Task 26, Task 28, Task 29

Parallel Group 2 (after foundation):
  Task 6, Task 7, Task 8, Task 9 (all depend only on Task 4)

Sequential:
  Task 10 ← Task 7, Task 8, Task 9

Parallel Group 3 (after Task 10 + Task 5 + Task 11):
  Task 12 — LoginForm
  Task 14 — /register page
  Task 22 — /forgot-password page (also needs Task 20)
  Task 23 — /reset-password page (also needs Task 21)

Sequential:
  Task 13 ← Task 10, Task 12
  Task 31 ← Task 12, Task 13, Task 30
  Task 33 ← Task 2 (compatibility pass; can run any time after Task 2)
  Task 34 ← Task 2 (numeral upgrade; can run any time after Task 2)
  Task 36 ← all tasks
```

A reasonable single-track execution order is exactly the task numbers 1 → 36.

---

## Out of Scope (named so the implementation doesn't drift)

- Editorial widget redesign of dashboard / transactions / calendar / forecast / insights / net worth / upload / export / settings — deferred to future spec
- Real session table (existing cookie sessions kept)
- Two-factor auth (the "TLS · END-TO-END ENCRYPTED" footer is decorative)
- Apple / GitHub / Microsoft OAuth providers
- Email verification on signup
- Server-side password strength enforcement (client-side meter only)
- Mobile-specific Login layout (responsive collapse handles it)
- Settings 3-segment theme switch restyle — defer; current Settings continues to work and only gets a visual touch-up if it surfaces during Task 33
- Login mini theme toggle — defer; user can toggle theme via Settings post-sign-in
