---
feature: Figma Mobile Kit Visual Adoption
type: spec
date: 2026-04-28
status: approved
tier: 1
revision: 2
related-figma: oQJ6LE7vTOhjKuhpTCEV6X (Finance Management Mobile App UI UX Kit — Community)
supersedes-internal: 2026-04-28 r1 (initial draft)
---

# Figma Mobile Kit Visual Adoption — Design Spec (r2)

## Overview

A redesign that adopts a narrow, high-leverage subset of the "Finance Management Mobile App UI UX Kit" (Figma community file) into the existing Next.js web dashboard. The product, routes, data layer, and information architecture are unchanged.

The work is split into **three independently mergeable phases**:

- **Phase 1a — Tokens only.** Add brand-mint, tile, and hero token families to `globals.css`. Bump `--radius` from `0.75rem` to `1rem`. No component or page touched.
- **Phase 1b — Chrome.** Introduce `<HeroHeader>`, `<BottomNavFab>`, exported-but-unused `<CategoryTile>`, and `lib/icon.ts`. Wire hero band into top-level mobile pages. Replace `BottomNav.tsx` with `BottomNavFab.tsx`. Restyle Sidebar / Topbar / MobileNav via tokens only. Add a mint-CTA `<Button variant="mint">`.
- **Phase 2 — Mobile fidelity (Home + Transactions only).** Introduce `<PeriodTabs>`, `<SavingsRingCard>`, `<TransactionRowMobile>`. Refactor mobile compositions of `/` and `/transactions` to match the kit's Home and Transaction screens. Desktop layouts untouched.

## Scope

| | Phase 1a | Phase 1b | Phase 2 |
|---|---|---|---|
| New files | 0 | 4 | 3 |
| Removed files | 0 | 1 (`BottomNav.tsx`) | 0 |
| Modified files | 1 | ~9 | ~3 |
| New tests | 0 | 0 | 2 (component) |
| New routes | 0 | 0 | 0 |
| API changes | 0 | 0 | 0 |

## Goals

- Refresh visual identity with a brand-mint accent applied **only to opt-in chrome** (hero band, FAB, bottom-nav active item, primary CTAs). Forms, sidebar focus, calendar selection, links, and charts keep today's blue identity.
- Preserve universal finance semantics: **red = expense, green = income.**
- Land Phase 1a on its own as the smallest possible visual nudge.
- Land Phase 1b without changing any page layout (hero is additive on top-level mobile pages; CategoryTile is exported but unused).
- For Phase 2, bring `/` and `/transactions` mobile layout to visual parity with the kit's Home and Transaction screens.

## Non-Goals

- No native mobile app, no PWA shell changes, no Capacitor wrapping. Web-only.
- No auth flow build-out (Login / Create Account / PIN / Fingerprint / Delete Account screens from the kit are skipped). Existing `/login` and `/register` placeholder routes are not modified.
- No icon-library swap. `lucide-react` stays; only `strokeWidth` and line-cap defaults change via opt-in `lucideProps`.
- No layout refactor of `/bills`, `/upload`, `/upload/bulk`, `/export`, `/transactions/new`, `/budget`, `/reports`, `/savings`, `/settings`, `/settings/categories`, `/recurring`, `/net-worth`, `/insights`, `/home`. They inherit Phase 1a tokens only.
- No notifications system. The bell icon in the hero is decorative.
- No dark-mode UX redesign — dark-mode token values are derived from the new palette but the dark UX stays as-is otherwise.
- No swap of `--primary`, `--ring`, `--accent`, `--secondary`, `--sidebar-*`, `--background`, `--card`, or any `--chart-*`. Surfaces and existing accents stay today's slate-blue identity.
- No wiring of `<CategoryTile>` into any page. Component ships exported but with zero callsites; page-level wiring is a future-work item.
- No PageHeader `variant` prop. PageHeader stays exactly as it is today.

## Recorded Decisions

| ID | Decision |
|---|---|
| A | Expense color stays **red** (`--destructive`, `--chart-expense`). Kit's blue is used only as accent for dates / secondary text / links. |
| B | **Hybrid brand swap.** Mint applies only to opt-in chrome (hero, FAB, bottom-nav active, primary CTAs). Charts, links, sidebar focus, calendar, form rings stay blue. |
| C | Hero band only on **top-level mobile pages** (`/`, `/transactions`, `/reports`, `/budget`, `/settings`). The hero set is independent from the 5-slot bottom-nav set (`/reports` has a hero but is not in the nav). Detail/edit pages keep the current flat header. |
| D | **Keep `lucide-react`.** Add `src/lib/icon.ts` exporting `lucideProps = { strokeWidth: 2.25, strokeLinecap: 'round', strokeLinejoin: 'round' }`. Apply opt-in only at leaf callsites that read poorly today. No blanket icon edits. |
| E | Bottom-nav 5 slots: **Home / Transactions / Add (FAB) / Budget / Settings.** |
| F | **Skip all auth screens.** No PIN, fingerprint, account-deletion flows. |
| G | Phase 2 ships **Home + Transactions only.** Other mobile pages stay token-only. |
| H | **Brand-mint as a separate token family.** `--primary` stays blue. Mint shows up only where opt-in. (Chunk-2 alternative II.) |
| I | `CategoryTile` ships in Phase 1b as exported-but-unused. Wiring into `/settings/categories` and `/savings` is deferred to a future phase. (Q1=a.) |
| J | Drop the `PageHeader` variant prop. `HeroHeader` is the separate component used on top-level mobile pages; `PageHeader` is unchanged. (Q2.) |
| K | Hero band renders only at `< 1024px`. At `≥ 1024px`, top-level pages keep `Topbar + PageHeader` exactly as today. (Q3.) |
| L | Mobile/desktop layout split uses **CSS-only** (`md:hidden` / `hidden md:block`). No `useMediaQuery`, no SSR sniff. (Q4.) |
| M | `/home`, `/insights`, `/net-worth`, `/recurring` get Phase 1a tokens only. No hero, no other changes. (Q5.) |

---

## Phase 1a — Tokens only

### 1a.1 New tokens — light mode (`:root`)

```css
/* Brand mint — used only on opt-in chrome */
--brand-mint: #22c97e;
--brand-mint-foreground: #0f172a;
--brand-mint-soft: #98e8b8;        /* gradient stop, hover hint */
--brand-mint-strong: #16a368;      /* press state */

/* Hero band */
--hero-bg: var(--brand-mint);
--hero-foreground: var(--brand-mint-foreground);

/* Category icon tile */
--tile-bg: #c9defe;                /* pastel blue (kit) */
--tile-foreground: #1f4fff;        /* line-art icon color */
--tile-bg-active: #1f4fff;
--tile-foreground-active: #ffffff;

/* Radius bump */
--radius: 1rem;                    /* was 0.75rem */
```

### 1a.2 New tokens — dark mode (`.dark`)

```css
--brand-mint: #34d399;
--brand-mint-foreground: #062b18;
--brand-mint-soft: #1f6447;
--brand-mint-strong: #0f9b6c;

--hero-bg: var(--brand-mint);
--hero-foreground: var(--brand-mint-foreground);

--tile-bg: #1e3a5f;
--tile-foreground: #93c5fd;
--tile-bg-active: #3b82f6;
--tile-foreground-active: #ffffff;
```

### 1a.3 Tailwind exposure (`@theme inline`)

```css
--color-brand-mint: var(--brand-mint);
--color-brand-mint-foreground: var(--brand-mint-foreground);
--color-brand-mint-soft: var(--brand-mint-soft);
--color-brand-mint-strong: var(--brand-mint-strong);
--color-hero: var(--hero-bg);
--color-hero-foreground: var(--hero-foreground);
--color-tile: var(--tile-bg);
--color-tile-foreground: var(--tile-foreground);
--color-tile-active: var(--tile-bg-active);
--color-tile-active-foreground: var(--tile-foreground-active);
```

Available as utilities: `bg-brand-mint`, `text-brand-mint-foreground`, `bg-hero`, `text-hero-foreground`, `bg-tile`, `text-tile-foreground`, `bg-tile-active`, `text-tile-active-foreground`.

### 1a.4 Contrast verification (target: WCAG AA)

| Pair | Ratio | Pass? |
|---|---|---|
| `#0f172a` on `#22c97e` (mint hero text) | ~10.0 : 1 | ✓ AAA |
| `#0f172a` on `#16a368` (mint pressed) | ~6.6 : 1 | ✓ AA |
| `#062b18` on `#34d399` (dark hero text) | ~12.5 : 1 | ✓ AAA |
| `#1f4fff` on `#c9defe` (tile icon) | ~5.1 : 1 | ✓ AA |
| `#93c5fd` on `#1e3a5f` (dark tile icon) | ~7.0 : 1 | ✓ AAA |

The implementer must re-verify with axe DevTools or Stark before merge.

### 1a.5 Radius bump cascade

`--radius-sm/md/lg/xl/2xl/3xl/4xl` are already proportional in `globals.css` and inherit the new base:

| Token | Before | After |
|---|---|---|
| `--radius-sm` | 0.45rem | 0.6rem |
| `--radius-md` | 0.6rem | 0.8rem |
| `--radius-lg` (= `--radius`) | 0.75rem | 1rem |
| `--radius-xl` | 1.05rem | 1.4rem |
| `--radius-2xl` | 1.35rem | 1.8rem |
| `--radius-3xl` | 1.65rem | 2.2rem |

All cards, buttons, inputs, dialogs, sheets, popovers, tooltips become a touch rounder. **No code change beyond `globals.css`.**

### 1a.6 What Phase 1a explicitly does NOT do

- Does not touch `--background`, `--foreground`, `--card`, `--card-foreground`. Surfaces remain slate-blue today.
- Does not touch `--primary`, `--primary-foreground`, `--ring`, `--secondary`, `--accent`, `--sidebar-*`. Form focus, sidebar accent, calendar selection, link hover all stay blue.
- Does not modify `--destructive`, `--success`, `--warning`, `--chart-*`, `--chart-color-*`. Income/expense semantics fully preserved.

---

## Phase 1b — Chrome

Layered on top of Phase 1a. Phase 1b can ship in the same PR as 1a if the implementer prefers; the split is for risk-management, not policy.

### 1b.1 `<HeroHeader>` contract

```tsx
interface HeroHeaderProps {
  title: string;
  greeting?: string;        // top-level Home only
  subgreeting?: string;     // top-level Home only
  showBack?: boolean;       // default false
  rightAction?: ReactNode;  // default: bell icon (decorative)
  children?: ReactNode;     // metric chips inside the band
}
```

**Rendering rules:**
- Renders **nothing at `≥ 1024px`** — desktop keeps `Topbar + PageHeader`. Use `lg:hidden` wrapper.
- At `< 1024px`:
  - Background `bg-hero`, `rounded-b-3xl`, soft bottom shadow.
  - Top row: optional back button (left) + `title` (center) + `rightAction` (right).
  - Below top row (when provided): `greeting` (12px medium) + `subgreeting` (16px bold) — Home-only.
  - `children` renders below the title row, inside the mint band (used for metric chips).
- Height is **content-driven**. Empty hero ≈ 96px. With metric chips ≈ 200–220px.
- **No animations** specified. Reduced-motion behavior is unchanged from app baseline.

**Default `rightAction`:** decorative bell icon with `aria-label={t('hero.bell.aria')}`. No notifications system; the icon is non-interactive in this revision.

### 1b.2 `<BottomNavFab>` contract

Replaces `src/components/layout/BottomNav.tsx` (deleted).

```tsx
type NavSlot =
  | { key: string; href: string;   icon: LucideIcon; labelKey: string }
  | { key: string; fab: true;      icon: LucideIcon; labelKey: string };

const SLOTS: ReadonlyArray<NavSlot> = [
  { key: 'home',     href: '/',             icon: Home,           labelKey: 'nav.home' },
  { key: 'tx',       href: '/transactions', icon: ArrowLeftRight, labelKey: 'nav.transactions' },
  { key: 'add',      fab: true,             icon: Plus,           labelKey: 'nav.add' },
  { key: 'budget',   href: '/budget',       icon: PiggyBank,      labelKey: 'nav.budget' },
  { key: 'settings', href: '/settings',     icon: Settings,       labelKey: 'nav.settings' },
];
```

**Rules:**
- Renders only at `< 1024px` (matches existing `BottomNav` breakpoint).
- FAB pill: 56×56, `bg-brand-mint` + `text-brand-mint-foreground`, `-translate-y-3`, ring shadow. 11px label below the pill.
- FAB tap opens a shadcn `Sheet` anchored bottom. Sheet contents are **three router-link buttons**:
  - "Add Income" → `/transactions/new?type=income`
  - "Add Expense" → `/transactions/new?type=expense`
  - "Scan Receipt" → `/upload`
- The sheet is a router-link list, not a form. No state lives in the sheet.
- "Active" rule: a slot is active when `usePathname()` equals its `href` exactly OR (for `/transactions`) starts with `/transactions/`.

### 1b.3 `<CategoryTile>` contract (exported, unused)

```tsx
interface CategoryTileProps {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}
```

- Square tile, `aspect-[1/1.05]`, `rounded-2xl`, `bg-tile` + `text-tile-foreground`.
- `active` swaps to `bg-tile-active` + `text-tile-active-foreground`.
- Renders `<Link>` if `href` provided, otherwise `<button>`.
- **Zero callsites in Phase 1b.** Resolves the original spec's contradiction (no Phase 1 layout changes).

### 1b.4 `<Button variant="mint">`

A new button variant added to `src/components/ui/button.tsx`:

- `variant="mint"`: `bg-brand-mint text-brand-mint-foreground hover:bg-brand-mint-strong`.
- `default`, `ghost`, `outline`, `link`, `destructive`, `secondary` variants are **unchanged**.
- This is opt-in. Pages that want a mint primary CTA explicitly pass `variant="mint"`.

### 1b.5 `lib/icon.ts`

```ts
export const lucideProps = {
  strokeWidth: 2.25,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;
```

Used opt-in (`<MyIcon {...lucideProps} />`) at leaf callsites that the implementer judges read poorly today. Not a blanket replacement.

### 1b.6 Top-level page wiring (mobile only)

In each of `src/app/page.tsx`, `src/app/transactions/page.tsx`, `src/app/budget/page.tsx`, `src/app/reports/page.tsx`, `src/app/settings/page.tsx`:

- Mount `<HeroHeader>` once, wrapped in a `lg:hidden` container.
- Hero contents (`/budget`, `/reports`, `/settings`): **title + bell only.** No metric chips, no greeting.
- Hero contents (`/transactions`): title + bell, plus two metric chips (Total Balance / Total Expense) — see Phase 2 (chips render only when wrapped in the Phase 2 mobile branch; until Phase 2, `/transactions` hero is title + bell only).
- Hero contents (`/`): title + bell + greeting/subgreeting + chips — only when wrapped in the Phase 2 mobile branch; until Phase 2, `/` hero is title + bell only.

So in Phase 1b, **all five top-level pages get a minimal title-only hero**. Phase 2 expands hero contents on `/` and `/transactions`.

### 1b.7 Sidebar / Topbar / MobileNav

Pure recolor via tokens — **no markup or behavior change.**

- `Sidebar.tsx`: brand mark accepts mint via `text-brand-mint`. Active nav item background unchanged (still `--accent` blue).
- `Topbar.tsx`: background unchanged. (Already `bg-card`/`bg-background`.)
- `MobileNav.tsx`: drawer header gets a thin mint accent strip (`h-1 bg-brand-mint`) at the top. Optional polish; can be skipped if cost outweighs visual gain.

### 1b.8 Verification (Phase 1b)

- `npm run preflight` passes.
- `npm run test` still passes (existing 312 tests, no new tests).
- WCAG AA verified on hero, FAB, tile, mint CTA via axe DevTools or Stark. Implementer captures one screenshot per surface in the PR description.
- Bottom-nav FAB visible at `< 1024px`. Sheet opens, dismisses on outside click and Esc.
- HeroHeader renders only at `< 1024px`. At `≥ 1024px`, top-level pages render byte-identically to current `main`.
- `prefers-reduced-motion` respected app-wide (no regression).

---

## Phase 2 — Mobile fidelity (Home + Transactions only)

Activates only at `< 768px` (Tailwind `md:`). Above that, layouts are exactly the Phase 1b result.

### 2.1 `/` (Dashboard) mobile layout

Top to bottom:

1. `<HeroHeader>` with `greeting={t('home.greeting')}`, `subgreeting={t(`home.subgreeting.${timeOfDay()}`)}`, no back arrow, bell icon right (decorative). Inside the hero:
   - Two metric chips: `home.totalBalance` and `home.totalExpense` (signed; expense uses `text-destructive`, income uses `text-foreground`).
   - Below chips: a 30%-of-monthly-budget progress bar with caption from `home.budget.caption.*` keyed by current % bucket.
2. White card overlap (`-mt-6 rounded-t-3xl`) containing `<SavingsRingCard>` (occupies the full row).
3. `<PeriodTabs variant="three" value={…} onChange={…} />` (Daily / Weekly / Monthly).
4. Recent-transactions list — 5 most recent items + "See all" → `/transactions`. Rows are `<TransactionRowMobile>`.
5. Spacer for `BottomNavFab` clearance (`pb-24`).

**Sources (no new endpoints):**
- Total balance: `/api/dashboard/summary`
- Total expense (current month): `/api/dashboard/summary`
- Monthly budget %: existing `useBudgetData`
- Savings ring: existing `useSavingsData` (Zustand-backed, per current architecture)
- Recent transactions: `/api/transactions?page=1&pageSize=5`
- Last-week stats: `/api/transactions?from=…&to=…` then aggregate client-side

### 2.2 `/transactions` mobile layout

Top to bottom:

1. `<HeroHeader>` with `title={t('nav.transactions')}`, no back arrow, bell icon right.
   - Inside: two metric chips (Total Balance / Total Expense), same shape as Home.
2. `<PeriodTabs variant="four" value={…} onChange={…} />` (Daily / Weekly / Monthly / Yearly).
3. Transactions grouped by month. Each group titled (e.g. "April", "March"). Inside each group: `<TransactionRowMobile>` items.
4. Existing `useAllTransactions` hook is reused — only rendering changes.

### 2.3 `<PeriodTabs>` contract

```tsx
type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface PeriodTabsProps {
  variant: 'three' | 'four';
  value: Period;
  onChange: (next: Period) => void;
  className?: string;
}
```

- Pill row, full-width, `bg-secondary`. Active pill: `bg-brand-mint`, `text-brand-mint-foreground`. Inactive: transparent, muted text.
- Controlled. No internal state.
- `variant="three"` exposes `daily | weekly | monthly`; type space stays `Period`.

### 2.4 `<SavingsRingCard>` contract

```tsx
interface SavingsRingCardProps {} // no props; reads useSavingsData internally
```

- Card with circular progress ring (recharts PieChart, single ring) showing aggregate savings-goal completion %.
- Ring color: `--brand-mint` (filled) on `--brand-mint-soft` (track).
- Right column: two stacked stat lines.
  1. **Revenue last week** — sum of income transactions in the last 7 days.
  2. **Top expense category last week** — single category with the highest expense total in the last 7 days. Computed client-side from the same query. Tie resolved by absolute total then locale-aware category-name sort.
- Empty states: see 2.7.

### 2.5 `<TransactionRowMobile>` contract

```tsx
interface TransactionRowMobileProps {
  transaction: Transaction;
  category: Category;
  onTap?: () => void; // existing edit-transaction handler
}
```

- 64px row. Left → right:
  - 52×52 rounded-2xl tile, `bg-tile`, `text-tile-foreground`, line-art `category.icon` (lucide).
  - Two-line text: bold name + 12px italic secondary-foreground date (`HH:mm – MMM dd`).
  - Center: 12px muted tag (category name or "Monthly").
  - Right: amount, JetBrains Mono. Expense → `text-destructive`. Income → `text-foreground`.
- `onTap` invokes the existing edit-transaction flow.

### 2.6 Mobile / desktop branching strategy (Q4 — CSS only)

```tsx
// src/app/page.tsx (sketch)
return (
  <>
    <div className="md:hidden"><DashboardMobile /></div>
    <div className="hidden md:block"><DashboardDesktop /></div>
  </>
);
```

- Both subtrees render. `md:hidden` and `hidden md:block` gate visibility via CSS only.
- No `useMediaQuery`. No SSR sniff. No hydration mismatch.
- **Acceptance rule:** dual subtree must not duplicate API calls. React Query DevTools must show one inflight request per query key.

### 2.7 Edge-case behavior

| Case | Behavior |
|---|---|
| No transactions yet | Stat lines show `home.stats.empty`. Recent-tx list shows `tx.empty`. Total balance renders as `0`. |
| No budget set / budget = 0 | `home.budget.caption.noBudget` shown. Progress bar hidden. |
| Over budget | Bar fills 100%. Caption uses `home.budget.caption.over` with the over-amount. Bar uses `--destructive`. |
| No savings goals | Ring at 0% with track only. `home.savings.empty` shown below. |
| Top category tie | Largest absolute total → tiebreak by locale-aware category-name sort. Deterministic. |
| No income last week | "Revenue Last Week" shows `0`. No empty state — zero is valid. |
| `/transactions/new?type=…` query param missing today | FAB still navigates correctly; the page just opens with no preselect. Graceful no-op. Param parsing is a follow-up. |
| Locale switch mid-session | Existing `t(locale, key)` flow handles it. New keys behave identically. |
| Reduced motion | No animations specified in any new component. OS preference still drives existing animations elsewhere. |

### 2.8 Verification (Phase 2)

- `npm run preflight` passes.
- `npm run test` passes — 314 tests = 312 + 2 new.
- At `< 768px`, `/` and `/transactions` adopt the kit composition.
- At `≥ 768px`, both pages render their pre-Phase-2 (post-1b) layout.
- React Query DevTools shows one inflight request per query key, even with both subtrees in DOM.
- `useAllTransactions` infinite-scroll still works on the new mobile list.
- Lighthouse Mobile on `/` does not regress vs. the Phase 1b baseline the implementer captures before starting Phase 2.

---

## i18n keys (final)

All keys need EN + ID pairs in `src/lib/i18n.ts`.

### Phase 1b

| Key | EN | ID |
|---|---|---|
| `nav.add` | Add | Tambah |
| `nav.budget` | Budget | Anggaran *(no-op if already exists)* |
| `fab.addIncome` | Add Income | Tambah Pemasukan |
| `fab.addExpense` | Add Expense | Tambah Pengeluaran |
| `fab.scanReceipt` | Scan Receipt | Pindai Struk |
| `hero.bell.aria` | Notifications | Notifikasi |
| `hero.back.aria` | Go back | Kembali |

### Phase 2

| Key | EN | ID |
|---|---|---|
| `home.greeting` | Hi, Welcome Back | Halo, Selamat Datang Kembali |
| `home.subgreeting.morning` | Good Morning | Selamat Pagi |
| `home.subgreeting.afternoon` | Good Afternoon | Selamat Siang |
| `home.subgreeting.evening` | Good Evening | Selamat Sore |
| `home.subgreeting.night` | Good Night | Selamat Malam |
| `home.totalBalance` | Total Balance | Saldo Total |
| `home.totalExpense` | Total Expense | Pengeluaran Total |
| `home.budget.caption.under30` | Looking great — well under budget. | Bagus — masih jauh di bawah anggaran. |
| `home.budget.caption.under70` | On track. Keep it steady. | Sesuai jalur. Pertahankan. |
| `home.budget.caption.under100` | Close to your limit. | Mendekati batas. |
| `home.budget.caption.atLimit` | At your monthly limit. | Tepat di batas bulanan. |
| `home.budget.caption.over` | Over budget by {amount}. | Melebihi anggaran sebesar {amount}. |
| `home.budget.caption.noBudget` | Set a monthly budget to see progress. | Atur anggaran bulanan untuk melihat progres. |
| `home.savings.title` | Savings on Goals | Tabungan untuk Tujuan |
| `home.savings.empty` | No goals yet. Add one to start tracking. | Belum ada tujuan. Tambahkan untuk mulai melacak. |
| `home.stats.revenueLastWeek` | Revenue Last Week | Pendapatan Minggu Lalu |
| `home.stats.topCategoryLastWeek` | Top Category Last Week | Kategori Teratas Minggu Lalu |
| `home.stats.empty` | Not enough data yet. | Data belum cukup. |
| `period.daily` | Daily | Harian |
| `period.weekly` | Weekly | Mingguan |
| `period.monthly` | Monthly | Bulanan |
| `period.yearly` | Yearly | Tahunan |
| `tx.seeAll` | See all | Lihat semua |
| `tx.empty` | No transactions yet. | Belum ada transaksi. |

---

## File-by-file change manifest

### Phase 1a (1 file)

**Modified:**
- `src/app/globals.css` (add `--brand-mint*`, `--hero-*`, `--tile-*`; bump `--radius`; expose via `@theme inline`)

### Phase 1b (4 new, 1 deleted, ~9 modified)

**New:**
- `src/components/layout/HeroHeader.tsx`
- `src/components/layout/BottomNavFab.tsx`
- `src/components/shared/CategoryTile.tsx` *(exported, unused)*
- `src/lib/icon.ts`

**Deleted:**
- `src/components/layout/BottomNav.tsx`

**Modified:**
- `src/components/layout/AppShell.tsx` (swap import to `BottomNavFab`)
- `src/components/layout/Topbar.tsx` (token-driven recolor only; behavior unchanged)
- `src/components/layout/Sidebar.tsx` (token-driven recolor only)
- `src/components/layout/MobileNav.tsx` (drawer header mint accent strip — optional polish)
- `src/components/ui/button.tsx` (add `variant="mint"`; default unchanged)
- `src/app/page.tsx` (mount `<HeroHeader>` at `< 1024px`)
- `src/app/transactions/page.tsx` (same)
- `src/app/budget/page.tsx` (mount minimal `<HeroHeader>`, title + bell only)
- `src/app/reports/page.tsx` (same)
- `src/app/settings/page.tsx` (same)
- `src/lib/i18n.ts` (Phase 1b keys)

### Phase 2 (3 new, 2 new tests, ~3 modified)

**New:**
- `src/components/shared/PeriodTabs.tsx`
- `src/components/dashboard/SavingsRingCard.tsx`
- `src/components/transactions/TransactionRowMobile.tsx`

**New tests** (path matches existing project Vitest convention — implementer verifies via `npm run test -- --reporter verbose` before adding):
- `…/PeriodTabs.test.tsx`
- `…/TransactionRowMobile.test.tsx`

**Modified:**
- `src/app/page.tsx` (mobile branch: hero + savings ring card + period tabs + recent tx list)
- `src/app/transactions/page.tsx` (mobile branch: hero + period tabs + month-grouped list)
- `src/features/transactions/AllTransactionsView.tsx` (use `TransactionRowMobile` at `< 768px`)
- `src/lib/i18n.ts` (Phase 2 keys)

---

## Implementation order (intra-phase)

| Order | Phase | Step | Why |
|---|---|---|---|
| 1 | 1a | Token swap in `globals.css` | Foundation. |
| 2 | 1a | Run `preflight`, manual visual smoke. Ship 1a (optional independent ship). | Ship. |
| 3 | 1b | Build `HeroHeader`, `BottomNavFab`, `CategoryTile`, `lib/icon.ts` | Reusable chrome. |
| 4 | 1b | Delete `BottomNav.tsx`, swap `AppShell.tsx` import. | Wire the new nav. |
| 5 | 1b | Add minimal `<HeroHeader>` to top-level routes (`/`, `/transactions`, `/budget`, `/reports`, `/settings`). | Conditional only on `< 1024px`. |
| 6 | 1b | Add `variant="mint"` to `Button`. | Primary CTA option available. |
| 7 | 1b | Sidebar / Topbar / MobileNav recolors. | Token application at chrome layer. |
| 8 | 1b | Add Phase 1b i18n keys. | Strings ready. |
| 9 | 1b | Run `preflight`, manual QA per acceptance criteria. Ship 1b. | Ship. |
| 10 | 2 | Build `PeriodTabs`, `SavingsRingCard`, `TransactionRowMobile`. | Building blocks. |
| 11 | 2 | Add Phase 2 i18n keys. | Strings ready. |
| 12 | 2 | Refactor mobile composition of `/`. | Home parity. |
| 13 | 2 | Refactor mobile composition of `/transactions`. | Transactions parity. |
| 14 | 2 | Add Vitest coverage for the 2 new pure components. | Tests. |
| 15 | 2 | Run `preflight`, manual QA per acceptance criteria. Ship 2. | Ship. |

---

## Open questions / future work

These are deliberately not resolved in this spec. They become candidate follow-ups after Phase 2 ships:

- Wire `<CategoryTile>` into `/settings/categories` and `/savings` (mobile layout).
- Mobile-fidelity pass for `/budget`, `/reports`, `/settings`.
- Bell-driven notifications system (the bell becomes functional).
- `/transactions/new?type=` query-param parsing for FAB shortcuts.
- Auth flows from the kit (Login / Create Account / PIN / Fingerprint / Delete Account).
- 404 / 405 styled pages.
- Icon-library swap or bigger lucide-strokeWidth rollout.
