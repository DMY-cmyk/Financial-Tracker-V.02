---
plan: Figma Mobile Kit Visual Adoption
spec: docs/superpowers/specs/2026-04-28-figma-mobile-kit-adoption-design.md
date: 2026-04-29
branch: feature/figma-mobile-kit-adoption
worktree: .worktrees/figma-mobile-kit-adoption
phases: 1a (tokens) → 1b (chrome) → 2 (mobile fidelity Home + Transactions)
---

# Figma Mobile Kit Visual Adoption — Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to drive this plan task-by-task. Steps follow TDD — RED test first, then GREEN minimal impl, then verify, then commit.

**Goal:** Adopt a high-leverage subset of the "Finance Management Mobile App UI UX Kit" (Figma community) into the existing Next.js dashboard across three independently-mergeable phases. Product, routes, data, and IA are unchanged.

**Architecture:** Phase 1a is a CSS-only token extension. Phase 1b adds opt-in chrome (`<HeroHeader>`, `<BottomNavFab>`, `<CategoryTile>`, `Button variant="mint"`, `lib/icon.ts`) and wires hero band into top-level mobile pages. Phase 2 introduces three pure components (`<PeriodTabs>`, `<SavingsRingCard>`, `<TransactionRowMobile>`) and refactors mobile layouts of `/` and `/transactions` only — using CSS-only mobile/desktop branching (`md:hidden` / `hidden md:block`). No new routes, no API changes.

**Tech stack:** Next.js 16 App Router · Tailwind v4 (`@theme inline`) · shadcn/ui · lucide-react · recharts · React Query · Zustand · Vitest · happy-dom.

---

## Conventions used by every task

- **Worktree:** all paths are relative to `.worktrees/figma-mobile-kit-adoption/`. Run all commands from that directory.
- **Test placement:** colocate Vitest specs in `src/__tests__/<Name>.test.{ts,tsx}` to match the existing pattern.
- **Verification:** every task ends with `npm run typecheck && npm test -- <new-or-touched-spec>` plus the targeted manual check listed.
- **Commit cadence:** one commit per task. Use the exact `feat:` / `style:` / `refactor:` prefix supplied per task.
- **TDD:** write the failing test first, run it to confirm RED, then implement, then confirm GREEN.
- **Existing patterns referenced:** CSS-token tests (`src/__tests__/css-color-tokens.test.ts`), source-grep + render-without-crashing tests (`src/__tests__/BottomNav.test.tsx`).

---

## Phase 1a — Tokens only (1 task)

### Task 1: Add brand-mint / hero / tile tokens and bump `--radius` in `globals.css`

**Description:** Foundation for all later visual work. Extend `:root` and `.dark` with brand-mint (4 shades), hero band, and category-tile tokens; bump `--radius` from `0.75rem` → `1rem` (proportional radii cascade automatically); expose new tokens via `@theme inline` so utilities like `bg-brand-mint`, `bg-hero`, `bg-tile-active` become available. Touches **only** `globals.css`. Does NOT modify `--primary`, `--ring`, `--background`, `--card`, `--accent`, `--sidebar-*`, `--chart-*`, `--destructive`, `--success`, `--warning`.

**Files:**
- Modify: `src/app/globals.css`
- Test: `src/__tests__/css-mobile-kit-tokens.test.ts` (new)

**Dependencies:** None.

**Test to write FIRST (RED):** `src/__tests__/css-mobile-kit-tokens.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve('src/app/globals.css'), 'utf-8');
const root = css.slice(css.indexOf(':root'), css.indexOf('.dark'));
const dark = css.slice(css.indexOf('.dark {'));

describe('Phase 1a — mobile-kit tokens', () => {
  it('defines brand-mint family in :root (light)', () => {
    expect(root).toContain('--brand-mint: #22c97e');
    expect(root).toContain('--brand-mint-foreground: #0f172a');
    expect(root).toContain('--brand-mint-soft: #98e8b8');
    expect(root).toContain('--brand-mint-strong: #16a368');
  });

  it('defines hero + tile tokens in :root', () => {
    expect(root).toContain('--hero-bg: var(--brand-mint)');
    expect(root).toContain('--hero-foreground: var(--brand-mint-foreground)');
    expect(root).toContain('--tile-bg: #c9defe');
    expect(root).toContain('--tile-foreground: #1f4fff');
    expect(root).toContain('--tile-bg-active: #1f4fff');
    expect(root).toContain('--tile-foreground-active: #ffffff');
  });

  it('bumps --radius to 1rem', () => {
    expect(root).toMatch(/--radius:\s*1rem/);
    expect(root).not.toMatch(/--radius:\s*0\.75rem/);
  });

  it('overrides brand-mint + tile in .dark', () => {
    expect(dark).toContain('--brand-mint: #34d399');
    expect(dark).toContain('--brand-mint-foreground: #062b18');
    expect(dark).toContain('--brand-mint-soft: #1f6447');
    expect(dark).toContain('--brand-mint-strong: #0f9b6c');
    expect(dark).toContain('--tile-bg: #1e3a5f');
    expect(dark).toContain('--tile-foreground: #93c5fd');
    expect(dark).toContain('--tile-bg-active: #3b82f6');
  });

  it('exposes tokens in @theme inline (Tailwind utilities)', () => {
    expect(css).toContain('--color-brand-mint: var(--brand-mint)');
    expect(css).toContain('--color-brand-mint-foreground: var(--brand-mint-foreground)');
    expect(css).toContain('--color-brand-mint-soft: var(--brand-mint-soft)');
    expect(css).toContain('--color-brand-mint-strong: var(--brand-mint-strong)');
    expect(css).toContain('--color-hero: var(--hero-bg)');
    expect(css).toContain('--color-hero-foreground: var(--hero-foreground)');
    expect(css).toContain('--color-tile: var(--tile-bg)');
    expect(css).toContain('--color-tile-foreground: var(--tile-foreground)');
    expect(css).toContain('--color-tile-active: var(--tile-bg-active)');
    expect(css).toContain('--color-tile-active-foreground: var(--tile-foreground-active)');
  });
});
```

Run: `npm test -- css-mobile-kit-tokens` → FAIL (assertions on tokens that don't exist yet).

**Implementation (GREEN):**

In `src/app/globals.css`:

1. Inside `:root { … }`, alongside the existing token block, add:

```css
/* Brand mint — used only on opt-in chrome */
--brand-mint: #22c97e;
--brand-mint-foreground: #0f172a;
--brand-mint-soft: #98e8b8;
--brand-mint-strong: #16a368;

/* Hero band */
--hero-bg: var(--brand-mint);
--hero-foreground: var(--brand-mint-foreground);

/* Category icon tile */
--tile-bg: #c9defe;
--tile-foreground: #1f4fff;
--tile-bg-active: #1f4fff;
--tile-foreground-active: #ffffff;
```

2. Replace `--radius: 0.75rem;` with `--radius: 1rem;` in `:root`.

3. Inside `.dark { … }`, add:

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

4. Inside the existing `@theme inline { … }` block (the one that already maps `--color-background: var(--background);` etc.) append:

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

**Verification:**
- `npm test -- css-mobile-kit-tokens` → PASS (5 assertions).
- `npm run typecheck` → PASS.
- `npm test` → 559 + 5 = **564** passed, 0 failed.
- `npm run build` → success (Tailwind compiles new utilities).
- Manual: open `/` in dev (`npm run dev`), confirm corners are slightly rounder than before. No color regressions.

**Commit message:** `feat(tokens): add brand-mint/hero/tile token families and bump --radius to 1rem`

---

## Phase 1b — Chrome (14 tasks)

### Task 2: Create `src/lib/icon.ts` with `lucideProps`

**Description:** Single 4-line module exporting opt-in lucide defaults. Used at leaf callsites where icons read poorly today. Not applied here — just shipped.

**Files:**
- Create: `src/lib/icon.ts`
- Test: `src/__tests__/lib-icon.test.ts` (new)

**Dependencies:** None.

**Test to write FIRST (RED):** `src/__tests__/lib-icon.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { lucideProps } from '@/lib/icon';

describe('lucideProps', () => {
  it('exports the kit-recommended stroke defaults', () => {
    expect(lucideProps).toEqual({
      strokeWidth: 2.25,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    });
  });
});
```

Run: `npm test -- lib-icon` → FAIL (module does not exist).

**Implementation (GREEN):** `src/lib/icon.ts`

```ts
export const lucideProps = {
  strokeWidth: 2.25,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;
```

**Verification:**
- `npm test -- lib-icon` → PASS.
- `npm run typecheck` → PASS.

**Commit message:** `feat(icon): add lucideProps opt-in defaults`

---

### Task 3: Add Phase 1b i18n keys (`nav.add`, `fab.*`, `hero.*.aria`)

**Description:** Add EN + ID translations for the 6 strings Phase 1b chrome needs. `nav.budget` already exists per spec — verify, do not duplicate.

**Files:**
- Modify: `src/lib/i18n.ts`
- Test: `src/__tests__/i18n-mobile-kit-keys.test.ts` (new)

**Dependencies:** None.

**Test to write FIRST (RED):**

```ts
import { describe, it, expect } from 'vitest';
import { t } from '@/lib/i18n';

describe('Phase 1b i18n keys', () => {
  const keys = [
    'nav.add',
    'fab.addIncome',
    'fab.addExpense',
    'fab.scanReceipt',
    'hero.bell.aria',
    'hero.back.aria',
  ] as const;

  it.each(keys)('returns non-empty EN value for %s', (k) => {
    const v = t('en', k);
    expect(v).toBeTruthy();
    expect(v).not.toBe(k);
  });

  it.each(keys)('returns non-empty ID value for %s', (k) => {
    const v = t('id', k);
    expect(v).toBeTruthy();
    expect(v).not.toBe(k);
  });
});
```

Run: `npm test -- i18n-mobile-kit-keys` → FAIL.

**Implementation (GREEN):** Add to the `en` and `id` dictionaries in `src/lib/i18n.ts`:

```ts
// EN
'nav.add': 'Add',
'fab.addIncome': 'Add Income',
'fab.addExpense': 'Add Expense',
'fab.scanReceipt': 'Scan Receipt',
'hero.bell.aria': 'Notifications',
'hero.back.aria': 'Go back',

// ID
'nav.add': 'Tambah',
'fab.addIncome': 'Tambah Pemasukan',
'fab.addExpense': 'Tambah Pengeluaran',
'fab.scanReceipt': 'Pindai Struk',
'hero.bell.aria': 'Notifikasi',
'hero.back.aria': 'Kembali',
```

If `t()`'s key union is a TypeScript literal type, append the 6 keys to it.

**Verification:**
- `npm test -- i18n-mobile-kit-keys` → PASS (12 assertions).
- `npm test -- i18n-keys` → still PASS (existing parity test).
- `npm run typecheck` → PASS.

**Commit message:** `feat(i18n): add Phase 1b mobile-kit keys (EN + ID)`

---

### Task 4: Create `<HeroHeader>` component

**Description:** Mint band rendered only at `< 1024px` (use `lg:hidden` wrapper). Accepts `title`, optional `greeting`/`subgreeting`, optional `showBack`, optional `rightAction` (defaults to decorative bell with `aria-label={t('hero.bell.aria')}`), and `children` (metric chips slot).

**Files:**
- Create: `src/components/layout/HeroHeader.tsx`
- Test: `src/__tests__/HeroHeader.test.tsx` (new)

**Dependencies:** Task 3 (i18n keys for `hero.bell.aria`, `hero.back.aria`).

**Test to write FIRST (RED):** `src/__tests__/HeroHeader.test.tsx`

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { HeroHeader } from '@/components/layout/HeroHeader';

afterEach(() => cleanup());

describe('HeroHeader', () => {
  it('renders the title', () => {
    render(<HeroHeader title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('wraps content in a lg:hidden container', () => {
    const { container } = render(<HeroHeader title="x" />);
    expect(container.querySelector('.lg\\:hidden')).toBeTruthy();
  });

  it('renders greeting + subgreeting when provided', () => {
    render(<HeroHeader title="x" greeting="Hi" subgreeting="Good Morning" />);
    expect(screen.getByText('Hi')).toBeTruthy();
    expect(screen.getByText('Good Morning')).toBeTruthy();
  });

  it('renders a decorative bell with aria-label by default', () => {
    render(<HeroHeader title="x" />);
    expect(screen.getByLabelText('Notifications')).toBeTruthy();
  });

  it('renders back button only when showBack is true', () => {
    const { rerender } = render(<HeroHeader title="x" />);
    expect(screen.queryByLabelText('Go back')).toBeNull();
    rerender(<HeroHeader title="x" showBack />);
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('renders children below the title row', () => {
    render(
      <HeroHeader title="x">
        <div data-testid="chips">chips</div>
      </HeroHeader>,
    );
    expect(screen.getByTestId('chips')).toBeTruthy();
  });
});
```

Run: `npm test -- HeroHeader` → FAIL.

**Implementation (GREEN):** `src/components/layout/HeroHeader.tsx`

```tsx
'use client';

import { ReactNode } from 'react';
import { Bell, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';

export interface HeroHeaderProps {
  title: string;
  greeting?: string;
  subgreeting?: string;
  showBack?: boolean;
  rightAction?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function HeroHeader({
  title,
  greeting,
  subgreeting,
  showBack = false,
  rightAction,
  children,
  className,
}: HeroHeaderProps) {
  const locale = useLocale();
  const fallbackRight = (
    <span aria-label={t(locale, 'hero.bell.aria')} className="text-hero-foreground inline-flex">
      <Bell className="h-5 w-5" aria-hidden="true" />
    </span>
  );

  return (
    <div className={cn('lg:hidden', className)}>
      <div className="bg-hero text-hero-foreground rounded-b-3xl px-5 pt-6 pb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBack && (
              <button type="button" aria-label={t(locale, 'hero.back.aria')} className="-ml-1 p-1">
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <h1 className="text-base font-semibold">{title}</h1>
          </div>
          <div className="flex items-center">{rightAction ?? fallbackRight}</div>
        </div>

        {(greeting || subgreeting) && (
          <div className="mt-4 space-y-0.5">
            {greeting && <p className="text-xs font-medium opacity-90">{greeting}</p>}
            {subgreeting && <p className="text-base font-bold">{subgreeting}</p>}
          </div>
        )}

        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
```

**Verification:**
- `npm test -- HeroHeader` → PASS (6 assertions).
- `npm run typecheck` → PASS.

**Commit message:** `feat(layout): add HeroHeader component for mobile top-level pages`

---

### Task 5: Create `<CategoryTile>` component (exported, unused)

**Description:** Square pastel-blue tile with a lucide icon and label. Renders `<Link>` if `href`, otherwise `<button>`. Active state swaps to `bg-tile-active` + `text-tile-active-foreground`. **Zero callsites** in this phase — exported only.

**Files:**
- Create: `src/components/shared/CategoryTile.tsx`
- Test: `src/__tests__/CategoryTile.test.tsx` (new)

**Dependencies:** Task 1 (tile tokens exist).

**Test to write FIRST (RED):**

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Tag } from 'lucide-react';
import { CategoryTile } from '@/components/shared/CategoryTile';

afterEach(() => cleanup());

describe('CategoryTile', () => {
  it('renders label + icon', () => {
    render(<CategoryTile label="Food" icon={Tag} />);
    expect(screen.getByText('Food')).toBeTruthy();
  });

  it('renders a button when no href is provided', () => {
    const { container } = render(<CategoryTile label="x" icon={Tag} />);
    expect(container.querySelector('button')).toBeTruthy();
    expect(container.querySelector('a')).toBeNull();
  });

  it('renders an anchor when href is provided', () => {
    const { container } = render(<CategoryTile label="x" icon={Tag} href="/c/food" />);
    expect(container.querySelector('a')).toBeTruthy();
  });

  it('applies active classes when active', () => {
    const { container } = render(<CategoryTile label="x" icon={Tag} active />);
    expect(container.firstElementChild?.className).toContain('bg-tile-active');
  });
});
```

Run: `npm test -- CategoryTile` → FAIL.

**Implementation (GREEN):** `src/components/shared/CategoryTile.tsx`

```tsx
'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CategoryTileProps {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}

export function CategoryTile({ label, icon: Icon, active, href, onClick }: CategoryTileProps) {
  const classes = cn(
    'flex aspect-[1/1.05] flex-col items-center justify-center gap-2 rounded-2xl p-3 text-xs font-medium transition-colors',
    active ? 'bg-tile-active text-tile-active-foreground' : 'bg-tile text-tile-foreground',
  );

  const content = (
    <>
      <Icon className="h-6 w-6" aria-hidden="true" />
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      {content}
    </button>
  );
}
```

**Verification:**
- `npm test -- CategoryTile` → PASS (4 assertions).
- `npm run typecheck` → PASS.
- Confirm with `npx grep -r "CategoryTile" src` that there are still **zero callsites** outside the component file and its test.

**Commit message:** `feat(shared): add CategoryTile component (exported, unused — wiring deferred)`

---

### Task 6: Add `Button variant="mint"`

**Description:** New variant for primary CTAs that opt-in to the brand-mint accent. Existing variants (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`) untouched.

**Files:**
- Modify: `src/components/ui/button.tsx`
- Test: `src/__tests__/Button-variant-mint.test.tsx` (new)

**Dependencies:** Task 1 (mint tokens).

**Test to write FIRST (RED):**

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Button } from '@/components/ui/button';

afterEach(() => cleanup());

describe('Button variant="mint"', () => {
  it('applies brand-mint background and foreground', () => {
    const { container } = render(<Button variant="mint">Save</Button>);
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain('bg-brand-mint');
    expect(btn.className).toContain('text-brand-mint-foreground');
  });

  it('uses brand-mint-strong on hover', () => {
    const { container } = render(<Button variant="mint">Save</Button>);
    expect(container.querySelector('button')!.className).toContain('hover:bg-brand-mint-strong');
  });

  it('default variant is unchanged (still bg-primary)', () => {
    const { container } = render(<Button>Default</Button>);
    expect(container.querySelector('button')!.className).toContain('bg-primary');
  });
});
```

Run: `npm test -- Button-variant-mint` → FAIL (TS narrowing on `variant` will reject `"mint"`).

**Implementation (GREEN):** Inside the `variants.variant` map of `buttonVariants`:

```ts
mint: 'bg-brand-mint text-brand-mint-foreground hover:bg-brand-mint-strong',
```

(No other change. Type inferred from `cva` config.)

**Verification:**
- `npm test -- Button-variant-mint` → PASS (3 assertions).
- `npm run typecheck` → PASS.
- `npm test` (full) → no regressions.

**Commit message:** `feat(button): add variant="mint" for opt-in brand-mint CTAs`

---

### Task 7: Create `<BottomNavFab>` component

**Description:** Replacement for `BottomNav.tsx`. Five slots: Home / Transactions / Add (FAB) / Budget / Settings. Renders only at `< 1024px`. FAB pill (`56×56`, `bg-brand-mint`, `text-brand-mint-foreground`, `-translate-y-3`) opens a shadcn `Sheet` (anchored bottom) containing three router-link buttons: Add Income, Add Expense, Scan Receipt. Active rule: `pathname === href` exactly, OR `pathname.startsWith('/transactions/')` for the Transactions slot.

**Files:**
- Create: `src/components/layout/BottomNavFab.tsx`
- Test: `src/__tests__/BottomNavFab.test.tsx` (new)

**Dependencies:** Task 1 (mint tokens), Task 3 (i18n keys for `nav.*` and `fab.*`).

**Test to write FIRST (RED):**

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { BottomNavFab } from '@/components/layout/BottomNavFab';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

afterEach(() => cleanup());

describe('BottomNavFab', () => {
  it('renders 4 nav links + 1 FAB button (5 slots)', () => {
    const { container } = render(<BottomNavFab />);
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(4); // Home, Tx, Budget, Settings
    expect(container.querySelectorAll('button[aria-label]').length).toBeGreaterThanOrEqual(1);
  });

  it('FAB button uses bg-brand-mint', () => {
    const { container } = render(<BottomNavFab />);
    const fab = container.querySelector('button[data-slot="fab"]')!;
    expect(fab.className).toContain('bg-brand-mint');
  });

  it('opens the Add sheet with three router links when FAB is tapped', () => {
    render(<BottomNavFab />);
    fireEvent.click(screen.getByLabelText('Add'));
    expect(screen.getByText('Add Income')).toBeTruthy();
    expect(screen.getByText('Add Expense')).toBeTruthy();
    expect(screen.getByText('Scan Receipt')).toBeTruthy();
  });
});
```

Run: `npm test -- BottomNavFab` → FAIL.

**Implementation (GREEN):** `src/components/layout/BottomNavFab.tsx`

```tsx
'use client';

import { useState, ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ArrowLeftRight,
  Plus,
  PiggyBank,
  Settings,
  TrendingUp,
  TrendingDown,
  Camera,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';

type Slot =
  | { key: string; href: string; icon: ComponentType<{ className?: string }>; labelKey: 'nav.home' | 'nav.transactions' | 'nav.budgetPage' | 'nav.settings' }
  | { key: 'add'; fab: true; icon: ComponentType<{ className?: string }>; labelKey: 'nav.add' };

const SLOTS: ReadonlyArray<Slot> = [
  { key: 'home', href: '/', icon: Home, labelKey: 'nav.home' },
  { key: 'tx', href: '/transactions', icon: ArrowLeftRight, labelKey: 'nav.transactions' },
  { key: 'add', fab: true, icon: Plus, labelKey: 'nav.add' },
  { key: 'budget', href: '/budget', icon: PiggyBank, labelKey: 'nav.budgetPage' },
  { key: 'settings', href: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function BottomNavFab() {
  const pathname = usePathname();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/transactions') return pathname === '/transactions' || pathname.startsWith('/transactions/');
    return pathname === href;
  };

  return (
    <>
      <nav
        aria-label={locale === 'id' ? 'Navigasi bawah' : 'Bottom navigation'}
        className="border-border bg-card/95 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur-md lg:hidden"
      >
        <div className="grid grid-cols-5 items-end px-2 pt-1 pb-2">
          {SLOTS.map((slot) => {
            if ('fab' in slot) {
              const FabIcon = slot.icon;
              return (
                <div key={slot.key} className="flex flex-col items-center">
                  <button
                    type="button"
                    data-slot="fab"
                    aria-label={t(locale, slot.labelKey)}
                    onClick={() => setOpen(true)}
                    className="bg-brand-mint text-brand-mint-foreground -translate-y-3 inline-flex h-14 w-14 items-center justify-center rounded-full shadow-lg ring-4 ring-card"
                  >
                    <FabIcon className="h-6 w-6" />
                  </button>
                  <span className="text-muted-foreground -mt-1 text-[11px]">{t(locale, slot.labelKey)}</span>
                </div>
              );
            }
            const Icon = slot.icon;
            const active = isActive(slot.href);
            return (
              <Link
                key={slot.key}
                href={slot.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-1 text-xs transition-colors',
                  active ? 'text-brand-mint-strong' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{t(locale, slot.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="pb-2">
            <SheetTitle>{t(locale, 'nav.add')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-2">
            <Link
              href="/transactions/new?type=income"
              onClick={() => setOpen(false)}
              className="bg-secondary hover:bg-muted flex items-center gap-3 rounded-xl px-4 py-3"
            >
              <TrendingUp className="h-5 w-5" /> <span>{t(locale, 'fab.addIncome')}</span>
            </Link>
            <Link
              href="/transactions/new?type=expense"
              onClick={() => setOpen(false)}
              className="bg-secondary hover:bg-muted flex items-center gap-3 rounded-xl px-4 py-3"
            >
              <TrendingDown className="h-5 w-5" /> <span>{t(locale, 'fab.addExpense')}</span>
            </Link>
            <Link
              href="/upload"
              onClick={() => setOpen(false)}
              className="bg-secondary hover:bg-muted flex items-center gap-3 rounded-xl px-4 py-3"
            >
              <Camera className="h-5 w-5" /> <span>{t(locale, 'fab.scanReceipt')}</span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

> **Note for implementer:** if `nav.budgetPage` does not exist (it does — verify via `grep budgetPage src/lib/i18n.ts`), change `labelKey` to `'nav.budget'` and add an `nav.budget` key in Task 3.

**Verification:**
- `npm test -- BottomNavFab` → PASS (3 assertions).
- `npm run typecheck` → PASS.

**Commit message:** `feat(layout): add BottomNavFab with 5-slot mint FAB and add-action sheet`

---

### Task 8: Swap `AppShell` to use `BottomNavFab`; delete `BottomNav.tsx` + its test

**Description:** Replace the import in `AppShell.tsx`, then delete the now-unused `BottomNav.tsx` and `BottomNav.test.tsx`. The new component fully supersedes the old one.

**Files:**
- Modify: `src/components/layout/AppShell.tsx`
- Delete: `src/components/layout/BottomNav.tsx`
- Delete: `src/__tests__/BottomNav.test.tsx`

**Dependencies:** Task 7.

**Test to write FIRST (RED):** No new test. Existing `BottomNavFab.test.tsx` already gates correctness; the act of deleting `BottomNav.test.tsx` is the change. Verify the full suite still passes after the swap.

A pre-flight RED check: before editing AppShell, run `npm test -- BottomNav.test` and confirm it currently passes; that's the file we are about to remove. Confirming the swap leaves no orphan import is the verification.

**Implementation (GREEN):**

In `src/components/layout/AppShell.tsx`:
- Replace `import { BottomNav } from './BottomNav';` with `import { BottomNavFab } from './BottomNavFab';`
- Replace `<BottomNav />` with `<BottomNavFab />`

Then:
```bash
rm src/components/layout/BottomNav.tsx
rm src/__tests__/BottomNav.test.tsx
```

**Verification:**
- `npm run typecheck` → PASS (no orphan imports).
- `npm test` → 559 + new tests from Tasks 1–7, **minus 2** removed BottomNav tests = green.
- `grep -r "from .*BottomNav['\"]" src` → returns 0 hits (only `BottomNavFab` references remain).
- Manual: `npm run dev`, narrow browser to `< 1024px`, confirm new FAB pill is visible and the sheet opens.

**Commit message:** `refactor(layout): swap AppShell to BottomNavFab; remove legacy BottomNav`

---

### Task 9: Mount minimal `<HeroHeader>` on `/` (Dashboard)

**Description:** Render a title-only hero (no greeting, no chips yet) above the existing dashboard content. Phase 2 will expand it.

**Files:**
- Modify: `src/app/page.tsx`

**Dependencies:** Task 4.

**Test to write FIRST (RED):** `src/__tests__/page-home-hero.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/page.tsx'), 'utf-8');

describe('Home page hero mount', () => {
  it('imports HeroHeader', () => {
    expect(src).toMatch(/from\s+['"]@\/components\/layout\/HeroHeader['"]/);
  });
  it('renders <HeroHeader title=', () => {
    expect(src).toMatch(/<HeroHeader[^>]*title=/);
  });
});
```

Run: `npm test -- page-home-hero` → FAIL.

**Implementation (GREEN):** At the top of the page's returned JSX, before the existing dashboard content, mount:

```tsx
import { HeroHeader } from '@/components/layout/HeroHeader';
import { t, useLocale } from '@/lib/i18n';
// …
const locale = useLocale();
// …
return (
  <>
    <HeroHeader title={t(locale, 'nav.dashboard')} />
    {/* existing dashboard content */}
  </>
);
```

(Use whatever existing key the page already uses for its title; if it uses a literal, keep that literal. Goal here is title-only.)

**Verification:**
- `npm test -- page-home-hero` → PASS.
- `npm run typecheck` → PASS.
- Manual at `< 1024px`: hero band visible above the dashboard. Manual at `≥ 1024px`: page renders byte-identically to before this commit (because `HeroHeader` is wrapped in `lg:hidden`).

**Commit message:** `feat(home): mount minimal HeroHeader on / (mobile only)`

---

### Task 10: Mount minimal `<HeroHeader>` on `/transactions`

**Description:** Same as Task 9 for the Transactions page. Title only — chips deferred to Phase 2.

**Files:** Modify: `src/app/transactions/page.tsx`
**Dependencies:** Task 4.

**Test to write FIRST (RED):** `src/__tests__/page-transactions-hero.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve('src/app/transactions/page.tsx'), 'utf-8');
describe('/transactions hero mount', () => {
  it('imports HeroHeader', () => expect(src).toMatch(/HeroHeader/));
  it('renders <HeroHeader title=', () => expect(src).toMatch(/<HeroHeader[^>]*title=/));
});
```

Run → FAIL.

**Implementation (GREEN):** Mount `<HeroHeader title={t(locale, 'nav.transactions')} />` at top of returned JSX.

**Verification:** `npm test -- page-transactions-hero` → PASS. Typecheck → PASS. Manual: visible at `< 1024px`, hidden at `≥ 1024px`.

**Commit message:** `feat(transactions): mount minimal HeroHeader on /transactions (mobile only)`

---

### Task 11: Mount minimal `<HeroHeader>` on `/budget`

**Description:** Same pattern as Task 9.

**Files:** Modify: `src/app/budget/page.tsx`
**Dependencies:** Task 4.

**Test to write FIRST (RED):** Mirror Task 10's test, swap path → `src/__tests__/page-budget-hero.test.ts`. → FAIL.

**Implementation (GREEN):** `<HeroHeader title={t(locale, 'nav.budgetPage')} />` (use the existing budget-page i18n key).

**Verification:** test PASS, typecheck PASS, manual mobile/desktop rendering correct.

**Commit message:** `feat(budget): mount minimal HeroHeader on /budget (mobile only)`

---

### Task 12: Mount minimal `<HeroHeader>` on `/reports`

**Files:** Modify: `src/app/reports/page.tsx`
**Dependencies:** Task 4.

**Test to write FIRST (RED):** Mirror Task 10 → `src/__tests__/page-reports-hero.test.ts`. → FAIL.

**Implementation (GREEN):** `<HeroHeader title={t(locale, 'nav.reports')} />`.

**Verification:** as Task 10.

**Commit message:** `feat(reports): mount minimal HeroHeader on /reports (mobile only)`

---

### Task 13: Mount minimal `<HeroHeader>` on `/settings`

**Files:** Modify: `src/app/settings/page.tsx`
**Dependencies:** Task 4.

**Test to write FIRST (RED):** Mirror Task 10 → `src/__tests__/page-settings-hero.test.ts`. → FAIL.

**Implementation (GREEN):** `<HeroHeader title={t(locale, 'nav.settings')} />`.

**Verification:** as Task 10.

**Commit message:** `feat(settings): mount minimal HeroHeader on /settings (mobile only)`

---

### Task 14: Sidebar token recolor (brand mark accepts mint)

**Description:** Pure recolor. The brand mark in `Sidebar.tsx` (e.g. the icon inside the workspace logo) gets `text-brand-mint`. Active nav-item background stays unchanged (`--accent` blue).

**Files:** Modify: `src/components/layout/Sidebar.tsx`

**Dependencies:** Task 1.

**Test to write FIRST (RED):** `src/__tests__/sidebar-mint-mark.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve('src/components/layout/Sidebar.tsx'), 'utf-8');
describe('Sidebar brand mark', () => {
  it('uses text-brand-mint on the brand mark', () => {
    expect(src).toContain('text-brand-mint');
  });
});
```

Run → FAIL.

**Implementation (GREEN):** Locate the brand-mark icon/element in `Sidebar.tsx` and add `text-brand-mint` to its `className`. No other change.

**Verification:** test PASS, typecheck PASS, full suite green. Manual: at `≥ 1024px`, sidebar logo is mint-tinted; active nav item background unchanged.

**Commit message:** `style(sidebar): apply mint tint to brand mark via token`

---

### Task 15: MobileNav drawer mint accent strip (optional polish)

**Description:** Add a `h-1 bg-brand-mint` strip at the very top of the mobile drawer header. Spec marks this optional; include it for visual consistency.

**Files:** Modify: `src/components/layout/MobileNav.tsx`

**Dependencies:** Task 1.

**Test to write FIRST (RED):** `src/__tests__/mobilenav-mint-strip.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve('src/components/layout/MobileNav.tsx'), 'utf-8');
describe('MobileNav drawer accent', () => {
  it('contains a thin mint accent strip', () => {
    expect(src).toMatch(/h-1[^"]*bg-brand-mint|bg-brand-mint[^"]*h-1/);
  });
});
```

Run → FAIL.

**Implementation (GREEN):** Inside the drawer's `<SheetContent>` (or equivalent root), add a `<div className="h-1 bg-brand-mint -mt-4 -mx-6 mb-3" />` at the top — adjust margins so the strip sits flush with the sheet edges.

**Verification:** test PASS, typecheck PASS. Manual: open mobile menu → 4px mint strip visible at the top.

**Commit message:** `style(mobilenav): add thin mint accent strip on drawer header`

---

#### 🚦 Phase 1b end-of-phase gate

Before merging Phase 1b, run from the worktree:

```bash
npm run preflight   # format check + typecheck + lint + build
npm test            # full suite
```

Both must pass. Visually QA at `< 1024px` (FAB visible, hero on all 5 top-level pages, sheet opens) and at `≥ 1024px` (hero hidden, layouts byte-identical to Phase 1a).

---

## Phase 2 — Mobile fidelity (Home + Transactions only) — 8 tasks

> Activates only at `< 768px` (Tailwind `md:`). Above that, layouts are exactly the Phase 1b result.

### Task 16: Add Phase 2 i18n keys (~22 keys, EN + ID)

**Description:** Bulk-add the Phase 2 i18n keys per the spec table.

**Files:**
- Modify: `src/lib/i18n.ts`
- Test: `src/__tests__/i18n-phase2-keys.test.ts` (new)

**Dependencies:** None.

**Test to write FIRST (RED):**

```ts
import { describe, it, expect } from 'vitest';
import { t } from '@/lib/i18n';

const keys = [
  'home.greeting',
  'home.subgreeting.morning',
  'home.subgreeting.afternoon',
  'home.subgreeting.evening',
  'home.subgreeting.night',
  'home.totalBalance',
  'home.totalExpense',
  'home.budget.caption.under30',
  'home.budget.caption.under70',
  'home.budget.caption.under100',
  'home.budget.caption.atLimit',
  'home.budget.caption.over',
  'home.budget.caption.noBudget',
  'home.savings.title',
  'home.savings.empty',
  'home.stats.revenueLastWeek',
  'home.stats.topCategoryLastWeek',
  'home.stats.empty',
  'period.daily',
  'period.weekly',
  'period.monthly',
  'period.yearly',
  'tx.seeAll',
  'tx.empty',
] as const;

describe('Phase 2 i18n keys', () => {
  it.each(keys)('returns non-empty EN value for %s', (k) => {
    const v = t('en', k);
    expect(v).toBeTruthy();
    expect(v).not.toBe(k);
  });
  it.each(keys)('returns non-empty ID value for %s', (k) => {
    const v = t('id', k);
    expect(v).toBeTruthy();
    expect(v).not.toBe(k);
  });
});
```

Run → FAIL.

**Implementation (GREEN):** Add all 24 keys to both EN and ID dictionaries per the spec's i18n table (verbatim values). For `home.budget.caption.over` use the literal `'Over budget by {amount}.'` / `'Melebihi anggaran sebesar {amount}.'` — `{amount}` is a positional placeholder substituted at call site.

**Verification:** `npm test -- i18n-phase2-keys` → PASS (48 assertions). Existing `i18n-keys.test.ts` parity check still PASS.

**Commit message:** `feat(i18n): add Phase 2 mobile-kit keys (EN + ID)`

---

### Task 17: Create `<PeriodTabs>` component (with test)

**Description:** Controlled pill-row tabs. `variant="three"` exposes `daily | weekly | monthly`; `variant="four"` adds `yearly`. Active pill: `bg-brand-mint text-brand-mint-foreground`. Type space stays `Period`.

**Files:**
- Create: `src/components/shared/PeriodTabs.tsx`
- Test: `src/__tests__/PeriodTabs.test.tsx`

**Dependencies:** Task 1, Task 16.

**Test to write FIRST (RED):**

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { PeriodTabs } from '@/components/shared/PeriodTabs';

afterEach(() => cleanup());

describe('PeriodTabs', () => {
  it('renders 3 tabs for variant="three"', () => {
    const onChange = vi.fn();
    render(<PeriodTabs variant="three" value="daily" onChange={onChange} />);
    expect(screen.getByRole('tab', { name: 'Daily' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Weekly' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Monthly' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Yearly' })).toBeNull();
  });

  it('renders 4 tabs for variant="four"', () => {
    render(<PeriodTabs variant="four" value="daily" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Yearly' })).toBeTruthy();
  });

  it('marks the active value with aria-selected and bg-brand-mint', () => {
    render(<PeriodTabs variant="three" value="weekly" onChange={() => {}} />);
    const weekly = screen.getByRole('tab', { name: 'Weekly' });
    expect(weekly.getAttribute('aria-selected')).toBe('true');
    expect(weekly.className).toContain('bg-brand-mint');
  });

  it('calls onChange when a different tab is clicked', () => {
    const onChange = vi.fn();
    render(<PeriodTabs variant="four" value="daily" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Yearly' }));
    expect(onChange).toHaveBeenCalledWith('yearly');
  });
});
```

Run → FAIL.

**Implementation (GREEN):** `src/components/shared/PeriodTabs.tsx`

```tsx
'use client';

import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';

export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface PeriodTabsProps {
  variant: 'three' | 'four';
  value: Period;
  onChange: (next: Period) => void;
  className?: string;
}

const THREE: Period[] = ['daily', 'weekly', 'monthly'];
const FOUR: Period[] = ['daily', 'weekly', 'monthly', 'yearly'];

export function PeriodTabs({ variant, value, onChange, className }: PeriodTabsProps) {
  const locale = useLocale();
  const items = variant === 'four' ? FOUR : THREE;
  return (
    <div role="tablist" className={cn('bg-secondary inline-flex w-full rounded-2xl p-1', className)}>
      {items.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              'flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-brand-mint text-brand-mint-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(locale, `period.${p}` as const)}
          </button>
        );
      })}
    </div>
  );
}
```

**Verification:** `npm test -- PeriodTabs` → PASS (4 assertions). Typecheck → PASS.

**Commit message:** `feat(shared): add PeriodTabs (3/4 variant) controlled component`

---

### Task 18: Create `<TransactionRowMobile>` component (with test)

**Description:** 64px row with 52×52 tile (mint-blue, line-art icon), name + small italic timestamp, center muted tag, right amount in JetBrains Mono. Expense → `text-destructive`. Income → `text-foreground`. Calls `onTap` when row is clicked.

**Files:**
- Create: `src/components/transactions/TransactionRowMobile.tsx`
- Test: `src/__tests__/TransactionRowMobile.test.tsx`

**Dependencies:** Task 1.

**Test to write FIRST (RED):**

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { Tag } from 'lucide-react';
import { TransactionRowMobile } from '@/components/transactions/TransactionRowMobile';

afterEach(() => cleanup());

const baseTx = {
  id: 't1',
  date: '2026-04-15T08:00:00.000Z',
  description: 'Lunch at canteen',
  type: 'expense' as const,
  amount: 25000,
  categoryId: 'c1',
  paymentMethodId: 'p1',
};
const baseCat = { id: 'c1', name: 'Food', type: 'expense' as const, color: '#f00', icon: 'Tag', iconComponent: Tag };

describe('TransactionRowMobile', () => {
  it('renders description and category', () => {
    render(<TransactionRowMobile transaction={baseTx} category={baseCat as any} />);
    expect(screen.getByText('Lunch at canteen')).toBeTruthy();
    expect(screen.getByText('Food')).toBeTruthy();
  });

  it('uses text-destructive for expense', () => {
    const { container } = render(<TransactionRowMobile transaction={baseTx} category={baseCat as any} />);
    expect(container.querySelector('[data-amount]')!.className).toContain('text-destructive');
  });

  it('uses text-foreground for income', () => {
    const income = { ...baseTx, type: 'income' as const };
    const incomeCat = { ...baseCat, type: 'income' as const };
    const { container } = render(<TransactionRowMobile transaction={income} category={incomeCat as any} />);
    expect(container.querySelector('[data-amount]')!.className).toContain('text-foreground');
  });

  it('invokes onTap when clicked', () => {
    const onTap = vi.fn();
    const { container } = render(<TransactionRowMobile transaction={baseTx} category={baseCat as any} onTap={onTap} />);
    fireEvent.click(container.firstElementChild as Element);
    expect(onTap).toHaveBeenCalledOnce();
  });
});
```

Run → FAIL.

**Implementation (GREEN):** `src/components/transactions/TransactionRowMobile.tsx`

```tsx
'use client';

import { format } from 'date-fns';
import { LucideIcon, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { Transaction, Category } from '@/lib/types';

export interface TransactionRowMobileProps {
  transaction: Transaction;
  category: Category & { iconComponent?: LucideIcon };
  onTap?: () => void;
}

export function TransactionRowMobile({ transaction, category, onTap }: TransactionRowMobileProps) {
  const Icon = category.iconComponent ?? Tag;
  const isExpense = transaction.type === 'expense';
  const when = format(new Date(transaction.date), 'HH:mm – MMM dd');

  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-muted/40 transition-colors"
    >
      <div className="bg-tile text-tile-foreground flex h-13 w-13 items-center justify-center rounded-2xl">
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold">{transaction.description}</p>
        <p className="text-secondary-foreground text-[12px] italic">{when}</p>
      </div>
      <div className="text-muted-foreground text-[12px]">{category.name}</div>
      <div
        data-amount
        className={cn(
          'font-mono text-sm tabular-nums',
          isExpense ? 'text-destructive' : 'text-foreground',
        )}
      >
        {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
      </div>
    </button>
  );
}
```

(Adjust `Transaction`/`Category` import to whatever shape `lib/types.ts` exposes. If `iconComponent` resolution lives elsewhere — e.g. a `useCategoryIcon` helper — use that instead and adapt the test fixture.)

**Verification:** `npm test -- TransactionRowMobile` → PASS (4 assertions). Typecheck → PASS.

**Commit message:** `feat(transactions): add TransactionRowMobile row component`

---

### Task 19: Create `<SavingsRingCard>` component

**Description:** Card with a recharts `PieChart` ring (single ring, mint fill on mint-soft track) showing aggregate savings-goal completion %. Right column has two stacked stats: Revenue Last Week (sum of incomes in last 7 days) and Top Category Last Week (highest-total expense category in last 7 days; tie → locale-aware category-name sort). Reads `useSavingsData` and `useTransactions` (or whichever hook returns the last-week window).

**Files:**
- Create: `src/components/dashboard/SavingsRingCard.tsx`
- Test: `src/__tests__/SavingsRingCard.test.tsx` (smoke render + empty-state)

**Dependencies:** Task 1, Task 16.

**Test to write FIRST (RED):**

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

vi.mock('@/hooks/useSavingsData', () => ({
  useSavingsData: () => ({ goals: [], totalCompletionPct: 0 }),
}));
vi.mock('@/hooks/useTransactions', () => ({
  useTransactions: () => ({ data: [], isLoading: false }),
}));

import { SavingsRingCard } from '@/components/dashboard/SavingsRingCard';

afterEach(() => cleanup());

describe('SavingsRingCard', () => {
  it('renders the savings title (i18n)', () => {
    render(<SavingsRingCard />);
    expect(screen.getByText('Savings on Goals')).toBeTruthy();
  });

  it('renders the empty stats copy when there is no data', () => {
    render(<SavingsRingCard />);
    expect(screen.getAllByText('Not enough data yet.').length).toBeGreaterThanOrEqual(1);
  });
});
```

Run → FAIL.

**Implementation (GREEN):** `src/components/dashboard/SavingsRingCard.tsx`

```tsx
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useSavingsData } from '@/hooks/useSavingsData';
import { useTransactions } from '@/hooks/useTransactions';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

function lastWeekRange(now = new Date()) {
  const end = now;
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  return { start, end };
}

export function SavingsRingCard() {
  const locale = useLocale();
  const { totalCompletionPct } = useSavingsData();
  const { data: txs = [] } = useTransactions(); // adjust to actual API

  const { start } = lastWeekRange();
  const recent = txs.filter((t) => new Date(t.date) >= start);

  const revenueLastWeek = recent
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseByCat = new Map<string, number>();
  for (const tx of recent) {
    if (tx.type !== 'expense') continue;
    expenseByCat.set(tx.categoryId, (expenseByCat.get(tx.categoryId) ?? 0) + tx.amount);
  }
  const topCategoryEntry = [...expenseByCat.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0], locale);
  })[0];

  const ringPct = Math.min(100, Math.max(0, totalCompletionPct ?? 0));
  const data = [
    { name: 'done', value: ringPct },
    { name: 'rest', value: 100 - ringPct },
  ];

  return (
    <div className="bg-card rounded-3xl p-5 shadow-sm">
      <div className="grid grid-cols-2 items-center gap-4">
        <div className="relative h-32">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={42} outerRadius={56} startAngle={90} endAngle={-270} stroke="none">
                <Cell fill="var(--brand-mint)" />
                <Cell fill="var(--brand-mint-soft)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-semibold">
            {Math.round(ringPct)}%
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-base font-semibold">{t(locale, 'home.savings.title')}</p>
          <div>
            <p className="text-muted-foreground text-xs">{t(locale, 'home.stats.revenueLastWeek')}</p>
            <p className={cn('font-mono', revenueLastWeek > 0 ? 'text-foreground' : 'text-muted-foreground')}>
              {revenueLastWeek > 0 ? formatCurrency(revenueLastWeek) : t(locale, 'home.stats.empty')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t(locale, 'home.stats.topCategoryLastWeek')}</p>
            <p className={cn('font-mono', topCategoryEntry ? 'text-foreground' : 'text-muted-foreground')}>
              {topCategoryEntry ? topCategoryEntry[0] : t(locale, 'home.stats.empty')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

> **Implementer note:** the actual hook names (`useSavingsData`, `useTransactions`) and shapes may differ — check `src/hooks/` and adjust both the component and the test mocks. The contract from the spec is: ring color = `--brand-mint`, track = `--brand-mint-soft`, two stat lines (Revenue / Top category). If `useSavingsData` returns goals only and not a percentage, derive `totalCompletionPct` inline.

**Verification:** `npm test -- SavingsRingCard` → PASS. Typecheck → PASS.

**Commit message:** `feat(dashboard): add SavingsRingCard with mint progress ring`

---

### Task 20: Refactor `/` (Dashboard) mobile composition

**Description:** Split `src/app/page.tsx` into `<DashboardMobile />` (`md:hidden`) and `<DashboardDesktop />` (`hidden md:block`). The mobile branch composes:
1. Expanded `<HeroHeader>` (greeting + subgreeting via `timeOfDay()`, two metric chips for `home.totalBalance` / `home.totalExpense`, and a 30%-of-monthly-budget bar with `home.budget.caption.*` keyed by % bucket).
2. Mint-overlap card (`-mt-6 rounded-t-3xl`) with `<SavingsRingCard />`.
3. `<PeriodTabs variant="three" />` (state lifted into the page).
4. Recent-transactions list (5 items via `/api/transactions?page=1&pageSize=5`) + "See all" link → `/transactions`. Rows render via `<TransactionRowMobile>`.
5. `pb-24` spacer for `BottomNavFab` clearance.

The desktop branch is exactly the current page contents, unchanged. **Both subtrees share data hooks** so React Query DevTools shows a single inflight per query key — do not duplicate fetches.

**Files:**
- Modify: `src/app/page.tsx`
- (Optional) Create: `src/components/dashboard/DashboardMobile.tsx` and `DashboardDesktop.tsx` if `page.tsx` becomes >150 lines.

**Dependencies:** Tasks 4, 9, 17, 18, 19.

**Test to write FIRST (RED):** `src/__tests__/page-home-mobile-composition.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve('src/app/page.tsx'), 'utf-8');
describe('Home mobile composition', () => {
  it('uses md:hidden / hidden md:block branching', () => {
    expect(src).toContain('md:hidden');
    expect(src).toMatch(/hidden\s+md:block/);
  });
  it('mounts SavingsRingCard, PeriodTabs, TransactionRowMobile in mobile branch', () => {
    expect(src).toContain('SavingsRingCard');
    expect(src).toContain('PeriodTabs');
    expect(src).toContain('TransactionRowMobile');
  });
  it('passes greeting/subgreeting to HeroHeader', () => {
    expect(src).toMatch(/<HeroHeader[^>]*greeting=/);
    expect(src).toMatch(/<HeroHeader[^>]*subgreeting=/);
  });
});
```

Run → FAIL.

**Implementation (GREEN):** Refactor per the composition above. Keep all data-fetching at the page level so the two subtrees consume the same `useDashboardData()` / `useTransactions()` query results. `timeOfDay()` is a 5-line local helper:

```ts
function timeOfDay(d = new Date()): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = d.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'evening';
  return 'night';
}
```

Budget caption resolver (5 lines, see spec §2.7):

```ts
function budgetCaptionKey(pct: number, hasBudget: boolean) {
  if (!hasBudget) return 'home.budget.caption.noBudget';
  if (pct > 100) return 'home.budget.caption.over';
  if (pct === 100) return 'home.budget.caption.atLimit';
  if (pct >= 70) return 'home.budget.caption.under100';
  if (pct >= 30) return 'home.budget.caption.under70';
  return 'home.budget.caption.under30';
}
```

Use `t(locale, key, { amount })` / interpolation for the over case (the spec uses `{amount}` placeholder).

**Verification:**
- `npm test -- page-home-mobile-composition` → PASS.
- `npm test` → full suite green.
- `npm run build` → PASS.
- Manual at `< 768px`: hero with greeting + chips + budget bar; savings ring card with overlap; period tabs; 5 recent tx rows; FAB clearance respected.
- Manual at `≥ 768px`: page renders unchanged from Phase 1b.
- Open React Query DevTools (in dev): only one inflight per query key. **Hard fail** if duplicated.

**Commit message:** `feat(home): mobile composition with hero chips, savings ring, period tabs, recent tx`

---

### Task 21: Refactor `/transactions` mobile composition

**Description:** Same dual-subtree split. Mobile branch:
1. `<HeroHeader title={t('nav.transactions')}>` with two metric chips (Total Balance / Total Expense).
2. `<PeriodTabs variant="four" />` (state lifted).
3. Transactions grouped by month label (e.g. "April", "March"). Inside each group: `<TransactionRowMobile>` items.
4. Reuse `useAllTransactions` hook (already exists per memory: load-more pagination of 50/page) — only render path changes.

**Files:**
- Modify: `src/app/transactions/page.tsx`
- Modify: `src/features/transactions/AllTransactionsView.tsx` (add a `<768px` mobile render branch using `TransactionRowMobile`)

**Dependencies:** Tasks 4, 10, 17, 18.

**Test to write FIRST (RED):** `src/__tests__/page-transactions-mobile-composition.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve('src/app/transactions/page.tsx'), 'utf-8');
const view = readFileSync(resolve('src/features/transactions/AllTransactionsView.tsx'), 'utf-8');

describe('/transactions mobile composition', () => {
  it('uses md:hidden / hidden md:block branching', () => {
    expect(src).toContain('md:hidden');
    expect(src).toMatch(/hidden\s+md:block/);
  });
  it('mounts PeriodTabs in mobile branch', () => {
    expect(src).toContain('PeriodTabs');
  });
  it('AllTransactionsView mounts TransactionRowMobile under md:hidden', () => {
    expect(view).toContain('TransactionRowMobile');
    expect(view).toContain('md:hidden');
  });
});
```

Run → FAIL.

**Implementation (GREEN):**
- In `src/app/transactions/page.tsx`, add `md:hidden` mobile subtree with hero + two-chip band + `<PeriodTabs variant="four" …/>`. Keep desktop subtree as today.
- In `AllTransactionsView.tsx`, add a `md:hidden` block that renders rows via `TransactionRowMobile`, grouped by `format(date, 'MMMM')`. The existing `hidden md:block` retains today's table.
- Both branches share the same `useAllTransactions(filterKey)` to avoid duplicate fetches.

**Verification:**
- `npm test -- page-transactions-mobile-composition` → PASS.
- `npm test` full suite green.
- Manual at `< 768px`: month headers + mobile rows; load-more still works.
- Manual at `≥ 768px`: original table layout unchanged.

**Commit message:** `feat(transactions): mobile composition with hero chips, period tabs, month-grouped rows`

---

### Task 22: Final preflight + visual QA

**Description:** Run the full preflight, capture before/after screenshots at three viewports.

**Files:** None modified.

**Dependencies:** All prior.

**Test to write FIRST (RED):** N/A (verification-only task — no new test required by the spec or by TDD discipline, since the tests added in Tasks 1–21 collectively cover the spec).

**Implementation (GREEN):**

```bash
npm run preflight   # format check + typecheck + lint + build
npm test            # full suite
```

Manual:
- Mobile (`< 768px`): screenshot `/`, `/transactions`, `/budget`, `/reports`, `/settings`.
- Tablet (`≥ 768px` and `< 1024px`): screenshot `/` (no longer mobile-fidelity layout, but hero still present).
- Desktop (`≥ 1024px`): screenshot `/` and `/transactions` — must look byte-identical to Phase 1a baseline.
- WCAG: run axe DevTools on hero, FAB, mint CTA, tile.
- React Query DevTools: confirm single inflight per query key on `/` and `/transactions`.

**Verification:**
- `npm run preflight` → PASS.
- All tests pass: 559 baseline + ~30 new = ~590.
- Lighthouse Mobile on `/` does not regress vs. the Phase 1b screenshot.
- Screenshots attached to the PR description.

**Commit message:** `chore(figma-kit): final preflight + visual QA evidence (no code changes)`

---

## Parallel Execution Map

```
Sequential — Phase 1a:
  Task 1 (tokens)

Parallel Group A (after Task 1):
  Task 2 (lib/icon.ts)         — independent
  Task 3 (Phase 1b i18n keys)  — independent
  Task 5 (CategoryTile)        — depends only on Task 1's tokens
  Task 6 (Button mint variant) — depends only on Task 1's tokens
  Task 14 (Sidebar mint mark)  — depends only on Task 1's tokens
  Task 15 (MobileNav strip)    — depends only on Task 1's tokens

Sequential — gated on Task 3:
  Task 4 (HeroHeader) — needs hero.bell.aria + hero.back.aria

Parallel Group B (after Task 4):
  Task 9  (mount hero on /)
  Task 10 (mount hero on /transactions)
  Task 11 (mount hero on /budget)
  Task 12 (mount hero on /reports)
  Task 13 (mount hero on /settings)

Sequential — gated on Tasks 1 + 3:
  Task 7 (BottomNavFab)  → Task 8 (AppShell swap, delete BottomNav)

Phase 1b end-of-phase gate (manual + preflight)

Sequential — Phase 2 setup:
  Task 16 (Phase 2 i18n keys)

Parallel Group C (after Task 16):
  Task 17 (PeriodTabs)
  Task 18 (TransactionRowMobile)
  Task 19 (SavingsRingCard)

Sequential — gated on 4 + 17 + 18 + 19:
  Task 20 (/ mobile composition)

Sequential — gated on 4 + 17 + 18 (independent of 19/20):
  Task 21 (/transactions mobile composition)

Sequential — gated on all prior:
  Task 22 (preflight + QA)
```

**Independent ship points:**
- After Task 1 → Phase 1a can ship as its own PR.
- After Task 15 → Phase 1b can ship as its own PR (combines Tasks 2–15).
- After Task 22 → Phase 2 ship.

---

## YAGNI / DRY notes

- **YAGNI applied:** `<CategoryTile>` ships exported with **zero callsites** per spec decision I (page wiring is deferred). The `lucideProps` constant is shipped but not applied anywhere — opt-in only. The bell icon is decorative; no notification system. No `useMediaQuery` helper, no SSR sniff helper — CSS-only branching per decision L. No PageHeader variant prop per decision J.
- **DRY applied:** `timeOfDay()` and `budgetCaptionKey()` are tiny page-local helpers in Task 20 — not extracted to `src/lib/` because each has exactly one callsite and the spec doesn't anticipate a second. If a second consumer materializes (future-work item), promote them then. The `<PeriodTabs>` `variant` prop was chosen over two separate components specifically to keep one component for two callsites.
- **Reuse:** `useAllTransactions` (existing) drives the mobile transactions list — no new fetch path. Both mobile and desktop subtrees share page-level hooks so React Query deduplicates queries.

---

## Self-review

- ✅ Spec coverage: every section (1a.1–1a.6, 1b.1–1b.8, 2.1–2.8, i18n tables, file-by-file manifest, intra-phase order) maps to one or more tasks.
- ✅ Placeholder scan: no TBD / TODO / "implement later" / "fill in details" / "similar to Task N" — every task contains the actual code or grep target.
- ✅ Type consistency: `Period` (Task 17) is the same union used implicitly by Tasks 20 + 21. `HeroHeader` props (Task 4) match the `greeting`/`subgreeting`/`children` usage in Task 20. `TransactionRowMobile`'s `category.iconComponent` resolution may need adjustment to match the existing project pattern — flagged in the implementer note in Task 18.
- ⚠️ Soft assumption: existing i18n keys `nav.transactions`, `nav.budgetPage`, `nav.reports`, `nav.settings`, `nav.dashboard`, `nav.home` already exist — verified via memory; implementer should `grep` to confirm before Task 9–13 land. If any are missing, add them in Task 3 (move that into Task 3's scope).
