---
feature: Figma Mobile Kit Visual Adoption
type: spec
date: 2026-04-28
status: draft
tier: 1
related-figma: oQJ6LE7vTOhjKuhpTCEV6X (Finance Management Mobile App UI UX Kit — Community)
---

# Figma Mobile Kit Visual Adoption — Design Spec

## Overview

A two-phase redesign that adopts the visual language of the "Finance Management Mobile App UI UX Kit" (Figma community file) into the existing Next.js web dashboard. The product, routes, data layer, and information architecture are unchanged. The work is layered:

- **Phase 1 — Visual Language Adoption.** Token swap, chrome refresh, three new shared components, restyle of existing components. No layout changes, no new routes, no new data.
- **Phase 2 — Mobile Fidelity Pass (Home + Transactions only).** Mobile-breakpoint layout refactors for `/` and `/transactions` to match the kit's mobile screens 1:1 where patterns map cleanly. Desktop layouts untouched.

Phases ship independently. Phase 1 is mergeable on its own; Phase 2 layers on top.

## Scope

| | Phase 1 | Phase 2 |
|---|---|---|
| New files | 4 | 3 |
| Removed files | 1 (`BottomNav.tsx`) | 0 |
| Modified files | ~14 | ~4 |
| New tests | 0 (visual-only) | 2 (component) |
| New routes | 0 | 0 |
| API changes | 0 | 0 |

## Goals

- Refresh the visual identity to a green-primary, mint-cream-surface system inspired by the kit, while preserving universal finance semantics (red = expense, green = income).
- Introduce three reusable chrome components (`HeroHeader`, `CategoryTile`, `BottomNavFab`) that are framework-agnostic enough to live alongside existing primitives.
- Land Phase 1 with zero behavior or data-flow change so it can be merged and tested independently.
- For Phase 2, bring the mobile breakpoint of `/` and `/transactions` to visual parity with the kit's Home and Transaction screens.

## Non-Goals

- No native mobile app, no PWA shell changes, no Capacitor wrapping. Web-only.
- No auth flow build-out (Login / Create Account / PIN / Fingerprint / Delete Account screens from the kit are skipped). Existing `/login` and `/register` placeholder routes are not modified.
- No icon-library swap. `lucide-react` stays; only `strokeWidth` is bumped.
- No refactor of `/bills`, `/upload`, `/upload/bulk`, `/export`, `/transactions/new`, `/budget`, `/reports`, `/savings`, `/settings`, `/settings/categories`, `/recurring`, `/net-worth`, `/insights`, `/home` layouts. They inherit Phase 1 tokens only.
- No notifications system. The bell icon in the hero is decorative for now.
- No dark mode redesign — dark mode token values are derived from the new palette but the dark UX stays as-is otherwise.

## Recorded Decisions (from brainstorming, 2026-04-28)

| ID | Decision |
|---|---|
| A | Expense color stays **red** (`--destructive`, `--chart-expense`). Kit's blue is used only as accent for dates/secondary text/links. |
| B | **Hybrid brand swap.** Green primary for CTA, hero band, active nav. Charts and links keep blue tones. |
| C | Hero band only on **top-level mobile pages** (`/`, `/transactions`, `/reports`, `/budget`, `/settings`). Note: this set is independent from the 5-slot bottom-nav set (`/reports` has a hero but is not in the nav). Detail/edit pages keep current flat header. |
| D | **Keep `lucide-react`.** Bump `strokeWidth` default from 2 to 2.25; adopt rounded line caps. |
| E | Bottom-nav 5 slots: **Home / Transactions / Add (FAB) / Budget / Settings.** |
| F | **Skip all auth screens.** No PIN, fingerprint, account-deletion flows. |
| G | Phase 2 ships **Home + Transactions only.** Other mobile pages stay in Phase 1 token-only state. |

---

## Phase 1 — Visual Language Adoption

### 1.1 Token swap (`src/app/globals.css`)

Replace the values of select existing tokens and add a small set of new ones (`--hero-*`, `--tile-*`). All other tokens keep their current values. Charts keep their current semantic split.

**Light mode (`:root`):**

| Token | Current | New | Reason |
|---|---|---|---|
| `--primary` | `#2563eb` | `#22c97e` | Kit's mint green |
| `--primary-foreground` | `#ffffff` | `#0f172a` | Dark text reads better on mint |
| `--ring` | `#2563eb` | `#22c97e` | Match primary |
| `--background` | `#f8fafc` | `#eaf8ec` | Mint cream surface |
| `--card` | `#ffffff` | `#f4fcf4` | Warmer card |
| `--accent` | `#dbeafe` | `#d8f3e0` | Mint accent |
| `--accent-foreground` | `#1e40af` | `#0a4f2c` | Mint accent text |
| `--secondary` | `#f1f5f9` | `#e7f4ec` | Mint-tinged neutral |
| `--sidebar` | `#f8fafc` | `#e7f4ec` | Match background tone |
| `--sidebar-primary` | `#2563eb` | `#22c97e` | Match brand |
| `--sidebar-accent` | `#dbeafe` | `#d8f3e0` | Match accent |

**Dark mode (`.dark`):**

| Token | Current | New |
|---|---|---|
| `--primary` | `#3b82f6` | `#34d399` |
| `--primary-foreground` | `#ffffff` | `#062b18` |
| `--ring` | `#3b82f6` | `#34d399` |
| `--accent` | `#1e3a5f` | `#0e3b27` |
| `--accent-foreground` | `#93c5fd` | `#86efac` |
| `--sidebar-primary` | `#3b82f6` | `#34d399` |
| `--sidebar-accent` | `#1e3a5f` | `#0e3b27` |

**Unchanged on purpose:**
- `--destructive`, `--chart-expense` — stay red (Decision A).
- `--success`, `--chart-income` — stay green (no semantic change).
- `--chart-1` through `--chart-color-6` — chart palettes stay blue/teal-led for readability and a11y (Decision B).
- Font tokens (`--font-sans`, `--font-mono`) — Plus Jakarta Sans matches the kit closely enough.

**New tokens (added):**

```css
--hero-bg: #22c97e;          /* full-bleed hero band */
--hero-foreground: #0f172a;  /* hero text */
--hero-bg-soft: #98e8b8;     /* faded hero gradient stop */
--tile-bg: #c9defe;          /* category icon tile background */
--tile-bg-active: #1f4fff;   /* selected category tile */
--tile-foreground: #1f4fff;  /* line-art icon color on tile */
--tile-foreground-active: #ffffff;
--radius: 1rem;              /* bumped from 0.75rem */
```

Dark-mode equivalents (`.dark`):

```css
--hero-bg: #1d8a5e;
--hero-foreground: #f1f5f9;
--hero-bg-soft: #1f6447;
--tile-bg: #1e3a5f;
--tile-bg-active: #3b82f6;
--tile-foreground: #93c5fd;
--tile-foreground-active: #ffffff;
```

Expose them in the `@theme inline` block as `--color-hero`, `--color-hero-foreground`, `--color-tile`, `--color-tile-active`, etc., so they are usable as Tailwind classes (`bg-hero`, `text-hero-foreground`, `bg-tile`).

### 1.2 New shared components

#### `src/components/layout/HeroHeader.tsx` (new)

Replaces `PageHeader.tsx` callsites on top-level mobile routes. On desktop, renders as a slimmer band tucked under `Topbar`.

```tsx
interface HeroHeaderProps {
  title: string;
  greeting?: string;          // optional eyebrow ("Hi, Welcome Back")
  subgreeting?: string;       // optional ("Good Morning")
  showBack?: boolean;         // default true on detail pages, false on tabs
  rightAction?: ReactNode;    // bell icon, settings cog, etc.
  children?: ReactNode;       // metrics row inside the band (Total Balance / Total Expense)
}
```

- Background: `bg-hero` (mint), full-bleed top, `rounded-b-3xl` on its own (so the next surface tucks under).
- Mobile: 25–30% of viewport height when `children` is provided, ~96px when not.
- Desktop: 80px tall band under the existing `Topbar`. No back arrow.
- Foreground respects `prefers-reduced-motion` for any subtle animation.

#### `src/components/shared/CategoryTile.tsx` (new)

```tsx
interface CategoryTileProps {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}
```

- Square-ish tile, `aspect-[1/1.05]`, `rounded-2xl`, `bg-tile` with `text-tile-foreground` line icon centered, label below in `text-sm font-medium`.
- `active` state: `bg-tile-active` with `text-tile-foreground-active`.
- Used in `/settings/categories` (replace current list rows on mobile) and `/savings` (replace current goal cards on mobile). On desktop both pages keep their current grid cards.

#### `src/components/layout/BottomNavFab.tsx` (new) — `BottomNav.tsx` is deleted

5 slots, center is a raised FAB that opens an "Add" sheet (transaction quick-add). The existing `BottomNav.tsx` file is removed; its sole importer (`AppShell.tsx`) switches to `BottomNavFab`.

```tsx
const SLOTS = [
  { key: 'home',    href: '/',             icon: Home,        labelKey: 'nav.home' },
  { key: 'tx',      href: '/transactions', icon: ArrowLeftRight, labelKey: 'nav.transactions' },
  { key: 'add',     fab: true,             icon: Plus,        labelKey: 'nav.add' },
  { key: 'budget',  href: '/budget',       icon: PiggyBank,   labelKey: 'nav.budget' },
  { key: 'settings',href: '/settings',     icon: Settings,    labelKey: 'nav.settings' },
] as const;
```

- The FAB is a 56×56 mint pill that floats `-translate-y-3` above the bar, with shadow.
- Pressing FAB opens a `Sheet` with three big buttons: "Add Income", "Add Expense", "Scan Receipt" (links to `/transactions/new?type=income|expense` and `/upload`).
- The existing `BottomNav.tsx` file is deleted; `BottomNavFab.tsx` is the replacement. All importers updated.

### 1.3 Component restyles (no API change)

| File | Change |
|---|---|
| `src/components/layout/PageHeader.tsx` | Add `variant="hero" \| "flat"` prop. Default stays `flat` (no hero band) so non-top-level pages are unchanged. Top-level tabs migrate to `<HeroHeader>` directly (PageHeader keeps for detail pages). |
| `src/components/layout/Topbar.tsx` | Background tinted to `bg-card`, border bottom `border-border/60`. No layout change. |
| `src/components/layout/Sidebar.tsx` | Active nav item uses `bg-tile/30` with `text-tile-foreground`. Brand mark recolored to mint. |
| `src/components/layout/MobileNav.tsx` | Drawer header gets the new mint band. |
| `src/components/ui/button.tsx` | `default` variant: `bg-primary text-primary-foreground` (now mint with dark text). `ghost`, `outline`, `link` unchanged. Add `radius-3xl` to the `lg`/`xl` sizes used in CTAs. |
| `src/components/ui/card.tsx` | Default radius bumped via `--radius` change. No code edit needed. |
| `src/components/shared/SummaryCard.tsx` | When `tone="primary"`, use mint background with dark text instead of blue/white. |
| `src/components/shared/EmptyState.tsx` | Icon recolored via tokens. |
| Icons used app-wide via `lucide-react` | Adopt strokeWidth via wrapper or via global lucide config (Decision D). Implementation: create `src/lib/icon.ts` exporting `lucideProps = { strokeWidth: 2.25, strokeLinecap: 'round', strokeLinejoin: 'round' }` and apply through `<Icon {...lucideProps} />` only at the leaf callsites that read poorly today (max 10 places). Don't blanket-edit every icon usage. |

### 1.4 Verification (Phase 1)

- Visual diff via screenshots is acceptable; no Vitest needed (no behavior change).
- Run `npm run preflight` (typecheck + lint + format + build).
- Manual QA pass: each top-level page in light + dark mode, mobile + desktop breakpoints. Acceptance criteria below.

#### Acceptance criteria (Phase 1)

- All existing pages render without layout shift > 4px from baseline screenshots.
- All charts retain their current color semantics (income green, expense red).
- All forms still pass label `htmlFor` checks (no regression on the 2026-04-20 audit fixes).
- All buttons meet 4.5:1 contrast against their background in both light and dark mode.
- `prefers-reduced-motion` is still respected on every animated component.
- `npm run test` still passes (312 tests).

---

## Phase 2 — Mobile Fidelity Pass (Home + Transactions only)

Activates only at `< 640px`. Above that, layouts are exactly the Phase 1 result.

### 2.1 `/` (Dashboard) mobile layout

Below 640px, `src/app/page.tsx` returns a different composition. Above 640px, current bento grid is unchanged.

**Mobile composition (top to bottom):**

1. `<HeroHeader>` with `greeting="Hi, Welcome Back"`, `subgreeting={timeOfDayGreeting()}`, no back arrow, bell icon right (decorative). Inside the hero, render two metric chips: `Total Balance` and `Total Expense` (signed, red if negative). Below them, a 30%-of-monthly-budget progress bar + caption like "30% of your expenses, looks good." (caption is conditional on actual % vs. budget.)
2. White card overlap (`-mt-6 rounded-t-3xl`) containing a savings-on-goals ring summary (`<SavingsRingCard>` — uses existing `useSavingsData`) on the left and 2 stacked stat lines (Revenue Last Week, biggest-expense Last Week) on the right.
3. `<PeriodTabs value={"Daily"|"Weekly"|"Monthly"} />` (new component, 3 pills).
4. Recent transactions list (5 items, "See all" → `/transactions`). Row component is `<TransactionRowMobile>` — see 2.3.
5. Spacer for `BottomNavFab` clearance.

**Sources:**
- Total balance: `/api/dashboard/summary`
- Total expense (current month): same endpoint
- Monthly budget %: existing `useBudgetData`
- Savings ring: existing `useSavingsData`
- Recent transactions: `/api/transactions?page=1&pageSize=5`

**No new endpoints. No new fields.** All numbers already exist.

### 2.2 `/transactions` mobile layout

Below 640px, `src/app/transactions/page.tsx` adopts:

1. `<HeroHeader>` with `title="Transactions"`, back arrow hidden (it's a tab), bell icon right.
2. Inside the hero, two metric chips: `Total Balance` and `Total Expense` (same pattern as Home).
3. `<PeriodTabs />` for Daily / Weekly / Monthly / Yearly (Decision E uses Budget on the bottom nav, but the Period tabs here filter the list — separate concept).
4. Transactions grouped by month, each group titled (e.g. "April", "March"). Inside each group, `<TransactionRowMobile>` items.
5. Existing `useAllTransactions` hook is reused — only the rendering changes.

### 2.3 `<TransactionRowMobile>` (new)

```tsx
interface TransactionRowMobileProps {
  transaction: Transaction;
  category: Category;
  onTap?: () => void; // opens edit sheet
}
```

Layout (left → right):
- Pastel mint or blue circular icon tile (52px) with category line-art icon
- Two-line text: bold transaction name (Salary, Groceries, …) + small italic blue date/time (`18:27 - April 30`)
- Center: small subdued tag (Monthly, Pantry, Rent, Fuel)
- Right: amount, signed, monospace, color-tagged (red for expense, dark for income — kit uses dark text for both, but red restores the safety semantic per Decision A)

### 2.4 New components for Phase 2

- `src/components/dashboard/SavingsRingCard.tsx`
- `src/components/shared/PeriodTabs.tsx` (`Daily | Weekly | Monthly | Yearly` variants; controlled, no internal state)
- `src/components/transactions/TransactionRowMobile.tsx`

### 2.5 Tests added in Phase 2

- `tests/components/PeriodTabs.test.tsx` — renders 3 or 4 tabs by `variant` prop, calls `onChange` with selected value.
- `tests/components/TransactionRowMobile.test.tsx` — renders amount with correct sign and color, fires `onTap`.

### 2.6 Acceptance criteria (Phase 2)

- At viewport < 640px, `/` and `/transactions` visually match their kit counterparts (Home, Transaction) within 8px on layout positions.
- At ≥ 640px, both pages render identically to their Phase 1 (post-token-swap) state.
- Bottom-nav FAB is reachable and the Add sheet opens / dismisses cleanly.
- No regression in `useAllTransactions` infinite-scroll behavior on mobile.
- `npm run test` passes (314 tests = 312 + 2 new).
- Lighthouse Mobile score for `/` does not regress vs. the Phase 1 (post-token-swap) baseline that the implementer captures before starting Phase 2.

---

## Implementation order

| Order | Phase | Step | Why |
|---|---|---|---|
| 1 | 1 | Token swap in `globals.css` | Foundation — every other change reads from these. |
| 2 | 1 | Build `HeroHeader`, `CategoryTile`, `BottomNavFab` | Reusable chrome. |
| 3 | 1 | Restyle `Sidebar`, `Topbar`, `MobileNav`, `PageHeader`, `button`, `SummaryCard` | Apply tokens at the chrome layer. |
| 4 | 1 | Replace `BottomNav` import with `BottomNavFab` in `AppShell` | Wire the new nav. |
| 5 | 1 | Add `<HeroHeader variant="tab">` to top-level routes (`/`, `/transactions`, `/budget`, `/reports`, `/settings`) | Conditional only on mobile breakpoint. |
| 6 | 1 | Run `preflight`, manual QA, ship Phase 1. | Ship. |
| 7 | 2 | `PeriodTabs`, `SavingsRingCard`, `TransactionRowMobile` | Building blocks. |
| 8 | 2 | Refactor mobile composition of `/` | Home parity. |
| 9 | 2 | Refactor mobile composition of `/transactions` | Transactions parity. |
| 10 | 2 | Add Vitest coverage for the 2 new pure components. | Tests. |
| 11 | 2 | Run `preflight`, manual QA, ship Phase 2. | Ship. |

## Open questions (parking)

These are deliberately not resolved in this spec. They become candidate follow-ups after Phase 2 ships:

- Should the rest of the mobile pages (`/budget`, `/reports`, `/settings`, `/settings/categories`, `/savings`) get a fidelity pass too? (Spec recommends deciding from real Phase 2 results.)
- Do we want a bell-driven notifications system later (the kit has 5.1 Notification)? Out of scope here.
- Auth flows (Login / PIN / Fingerprint) — the kit has them; the app does not. Tracked separately.
- Icon-library swap — keeping `lucide-react` for now; revisit if line-art friendliness becomes a complaint.

## Future work / explicitly out of scope

- All auth-flow screens from the kit (Launch / Onboarding / Login / Create Account / PIN / Fingerprint / Delete Account).
- Notifications screen.
- 404 / 405 styled pages (light polish — could be added at the end of Phase 1 if cheap, otherwise dropped).
- Native mobile app or PWA install flow.

## File-by-file change manifest

### Phase 1

**New files (4):**
- `src/components/layout/HeroHeader.tsx`
- `src/components/shared/CategoryTile.tsx`
- `src/components/layout/BottomNavFab.tsx`
- `src/lib/icon.ts` (shared `lucideProps` constant for strokeWidth + linecap defaults)

**Removed files (1):**
- `src/components/layout/BottomNav.tsx`

**Modified files (~14):**
- `src/app/globals.css` (token swap + new hero/tile tokens + radius bump)
- `src/components/layout/AppShell.tsx` (import BottomNavFab)
- `src/components/layout/PageHeader.tsx` (add `variant` prop)
- `src/components/layout/Topbar.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileNav.tsx`
- `src/components/ui/button.tsx`
- `src/components/shared/SummaryCard.tsx`
- `src/components/shared/EmptyState.tsx`
- `src/app/page.tsx` (set `variant="hero"`)
- `src/app/transactions/page.tsx` (set `variant="hero"`)
- `src/app/budget/page.tsx` (set `variant="hero"`)
- `src/app/reports/page.tsx` (set `variant="hero"`)
- `src/app/settings/page.tsx` (set `variant="hero"`)
- `src/lib/i18n.ts` — add `nav.add`, `nav.budget` (if not present), `home.greeting`, `home.budgetCaption.under30`, `…over30`, `…over70`, `home.totalBalance`, `home.totalExpense` (≈ 8 EN/ID pairs)

### Phase 2

**New files (3):**
- `src/components/shared/PeriodTabs.tsx`
- `src/components/dashboard/SavingsRingCard.tsx`
- `src/components/transactions/TransactionRowMobile.tsx`

**Modified files (~4):**
- `src/app/page.tsx` (mobile branch)
- `src/app/transactions/page.tsx` (mobile branch)
- `src/features/transactions/AllTransactionsView.tsx` (use `TransactionRowMobile` at `< 640px`)
- `src/lib/i18n.ts` (period labels: Daily / Weekly / Monthly / Yearly + savings ring caption)

**New test files (2):**
- `tests/components/PeriodTabs.test.tsx`
- `tests/components/TransactionRowMobile.test.tsx`
