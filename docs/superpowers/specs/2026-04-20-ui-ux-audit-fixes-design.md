---
feature: UI/UX Audit Fixes
type: spec
date: 2026-04-20
status: approved
tier: 1
supersedes: 2026-04-13-ui-ux-audit-fixes-design.md
---

# UI/UX Audit Fixes — Final Design Spec (v2)

## Overview

A fix pass addressing 15 UI/UX issues found during a full app audit. Covers accessibility (WCAG compliance), dark mode theming, form usability, chart readability, and navigation polish. No new features — purely fixes to existing components.

**Scope:** 0 new files, 20 modified files, 0 new tests (no behavior change).

## Changes from v1 (2026-04-13)

| Item | Change |
|------|--------|
| Fix #2 skip link | Tweak only — 3 class changes (`focus:fixed→absolute`, `z-[100]→z-50`, `rounded-lg→rounded-md`). The implementation existed; spec was wrong about it being missing. |
| Fix #6 legend | CashFlowChart only. CategoryBreakdown excluded — pie chart legends with dynamic category names are cluttered and redundant with tooltips. |
| Fix #8 framing | Reframed from "placeholder-as-label" to "missing `htmlFor`" — the real bug on `RecurringTransactionForm`. `TransactionForm` already correct. |
| Fix #15 approach | Index-based CSS palette (`--chart-color-1…6`) instead of remapping to existing chart vars. Covers any payment method name, not just the 4 hardcoded ones. |
| Fix #1 SVG gradients | `style={{ stopColor: 'var(--chart-income)' }}` prop — no JS helper needed. CSS custom properties resolve in `style` attributes on SVG elements. |
| Test count | Updated 448 → 496 (32 test files). |

## Goals

- Fix 4 CRITICAL accessibility blockers (chart colors, skip link, SVG aria, reduced motion)
- Fix 7 HIGH functional gaps (i18n, legend, backdrop, forms, pills, color indicators)
- Fix 5 MEDIUM/LOW polish items (animation timing, chart aria, nav grouping, consistency)
- All charts adapt correctly to dark/light mode via CSS custom properties
- All Framer Motion animations respect `prefers-reduced-motion` OS setting
- All forms have visible labels with correct `htmlFor` linkage and required field indicators

## Non-Goals

- No structural navigation redesign (just visual grouping in More drawer)
- No new components or pages
- No new tests (accessibility/theming fixes with zero behavior change)
- No chart library migration (keep Recharts)

---

## Part 1: CRITICAL Fixes (4 issues)

### Fix #1: Chart colors → CSS custom properties

**Problem:** 6+ chart components use hardcoded hex colors in SVG fills, strokes, and gradient stops. These don't adapt to dark/light mode.

**Fix:** Define two sets of chart color tokens in `globals.css`:

1. **Semantic tokens** — income/expense/primary/muted/grid (5 vars):

```css
:root {
  --chart-income: #059669;
  --chart-expense: #DC2626;
  --chart-primary: #3B82F6;
  --chart-muted: #94A3B8;
  --chart-grid: #E2E8F0;
}
.dark {
  --chart-income: #34D399;
  --chart-expense: #F87171;
  --chart-primary: #60A5FA;
  --chart-muted: #64748B;
  --chart-grid: #334155;
}
```

2. **Palette tokens** — index-based for dynamic series (6 vars, used by Fix #15):

```css
:root {
  --chart-color-1: #3B82F6;
  --chart-color-2: #10B981;
  --chart-color-3: #8B5CF6;
  --chart-color-4: #F59E0B;
  --chart-color-5: #EC4899;
  --chart-color-6: #06B6D4;
}
.dark {
  --chart-color-1: #60A5FA;
  --chart-color-2: #34D399;
  --chart-color-3: #A78BFA;
  --chart-color-4: #FCD34D;
  --chart-color-5: #F9A8D4;
  --chart-color-6: #67E8F9;
}
```

Update all chart components to use `var(--chart-income)` etc. in `stroke` and `fill` props.

For SVG `<stop>` elements, use the `style` prop (CSS custom properties resolve in `style`, not in XML presentation attributes):

```tsx
// Instead of:
<stop offset="0%" stopColor="#059669" stopOpacity={0.2} />

// Use:
<stop offset="0%" style={{ stopColor: 'var(--chart-income)', stopOpacity: 0.2 }} />
```

**Files:** `globals.css`, `CashFlowChart.tsx`, `ForecastChart.tsx`, `TrendChart.tsx`, `NetWorthTrendChart.tsx`, `CategoryComparisonChart.tsx`, `CategoryBreakdown.tsx`

### Fix #2: Skip link class tweak

**Problem:** The skip link in `layout.tsx:48` exists and is functional, but uses `focus:fixed`, `focus:z-[100]`, and `focus:rounded-lg` instead of the spec-standard values.

**Fix:** Three class changes on the existing `<a>` element:

```
focus:fixed    → focus:absolute
focus:z-[100]  → focus:z-50
focus:rounded-lg → focus:rounded-md
```

**File:** `src/app/layout.tsx`

### Fix #3: SVG health score ring aria-label

**Problem:** HealthScoreCard's SVG ring has no `role` or `aria-label`. Screen readers skip it entirely.

**Fix:**

```tsx
<svg role="img" aria-label={`${t(locale, 'healthScore')}: ${savingsRate}%`}>
```

**File:** `src/features/insights/HealthScoreCard.tsx`

### Fix #4: MotionConfig reducedMotion at app level

**Problem:** Framer Motion component animations bypass the OS `prefers-reduced-motion` setting.

**Fix:** Wrap the provider tree in `StoreProvider.tsx`:

```tsx
import { MotionConfig } from 'framer-motion';

<MotionConfig reducedMotion="user">
  {children}
</MotionConfig>
```

One change. All `motion.*` components in the app automatically respect the OS setting.

**File:** `src/components/providers/StoreProvider.tsx`

---

## Part 2: HIGH Fixes (7 issues)

### Fix #5: Insights chart hardcoded English → i18n

**Problem:** `CategoryComparisonChart` tooltip and legend use hardcoded `'This Month'` / `'Last Month'` strings.

**Fix:** Replace with `t(locale, 'thisMonth')` and `t(locale, 'lastMonth')`. Add 2 new i18n keys (check for duplicates first):

| Key | EN | ID |
|-----|----|----|
| `thisMonth` | This Month | Bulan Ini |
| `lastMonth` | Last Month | Bulan Lalu |

**Files:** `src/features/insights/CategoryComparisonChart.tsx`, `src/lib/i18n.ts`

### Fix #6: CashFlowChart legend

**Problem:** CashFlowChart has no visible legend — users can't distinguish income vs expense bars without hover.

**Fix:** Add Recharts `<Legend>` inside the `<BarChart>`:

```tsx
<Legend
  verticalAlign="bottom"
  height={36}
  formatter={(value: string) => t(locale, value)}
/>
```

The dataKeys are `'income'` and `'expense'` — both valid i18n keys.

`CategoryBreakdown` is excluded: it's a pie chart with dynamic category names from the DB. A legend of 10+ user-defined names is cluttered and redundant with tooltips.

**File:** `src/features/dashboard/CashFlowChart.tsx`

### Fix #7: Modal backdrop opacity /10 → /25

**Problem:** Sheet and AlertDialog backdrop uses `bg-black/10` — too subtle. WCAG recommends 20–40%.

**Fix:** Change `bg-black/10` to `bg-black/25` in both overlay components.

**Files:** `src/components/ui/sheet.tsx`, `src/components/ui/alert-dialog.tsx`

### Fix #8: RecurringTransactionForm missing htmlFor

**Problem:** Every `<Label>` in `RecurringTransactionForm` lacks a `htmlFor` attribute. Clicking a label doesn't focus its input — semantically broken even though visually correct. `TransactionForm` already uses `htmlFor` correctly.

**Fix:** Add matching `htmlFor` to every `<Label>` and `id` to every corresponding input/select in `RecurringTransactionForm`:

```tsx
// Before:
<Label>{t(locale, 'description')}</Label>
<Input id="description" ... />

// After:
<Label htmlFor="description">{t(locale, 'description')}</Label>
<Input id="description" ... />
```

Fields: `description`, `amount`, `category`, `paymentMethod`, `frequency`, `startDate`, `endDate`, `notes`.

**File:** `src/features/transactions/RecurringTransactionForm.tsx`

### Fix #9: Required field indicators

**Problem:** Required fields have no visual indicator across both forms.

**Fix:** Add a red asterisk after the label text for all required fields:

```tsx
<Label htmlFor="description">
  {t(locale, 'description')}
  <span className="text-red-500 ml-0.5">*</span>
</Label>
```

Applied to required fields in both forms. `TransactionForm` only needs the asterisk (htmlFor already correct). `RecurringTransactionForm` gets both this and Fix #8.

**Files:** `src/features/transactions/RecurringTransactionForm.tsx`, `src/features/transactions/TransactionForm.tsx`

### Fix #10: DayOfWeekPills ARIA roles

**Problem:** Pills are `div` elements with no semantic meaning. Screen readers get no context.

**Fix:**

```tsx
<div role="list" aria-label={t(locale, 'spendingByDay')}>
  <div role="listitem" aria-label={`${dayName}: ${formattedAmount}`}>
    ...
  </div>
</div>
```

Verify `spendingByDay` key exists in `i18n.ts` before this fix.

**File:** `src/features/insights/DayOfWeekPills.tsx`

### Fix #11: Color-only indicators → aria-hidden + +/- prefix

**Problem:** Green/red dots in transaction lists convey income/expense by color alone — fails WCAG SC 1.4.1 (use of color).

**Fix:** Mark the dot `aria-hidden="true"` (decorative), and add `+`/`-` prefix to the amount:

```tsx
<span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
<span className="font-mono">+Rp 5.000.000</span>  {/* income */}
<span className="font-mono">-Rp 350.000</span>    {/* expense */}
```

**Files:** `src/features/insights/BiggestTransactionsCard.tsx`, `src/features/insights/OutlierAlerts.tsx`

---

## Part 3: MEDIUM + LOW Fixes (5 issues)

### Fix #12: SVG ring animation 700ms → 500ms

**Problem:** `HealthScoreCard` ring `transition-all duration-700` exceeds micro-interaction guidelines.

**Fix:** Change to `duration-500`.

**File:** `src/features/insights/HealthScoreCard.tsx`

### Fix #13: Chart aria-label wrapper divs

**Problem:** Dashboard charts lack screen reader descriptions.

**Fix:** Wrap each chart's `ResponsiveContainer` in a `div` with `role="img"` and a descriptive `aria-label`:

```tsx
<div role="img" aria-label={t(locale, 'cashFlowChartLabel')}>
  <ResponsiveContainer>...</ResponsiveContainer>
</div>
```

Use an appropriate i18n key per chart (verify or add as needed).

**Files:** `src/features/dashboard/CashFlowChart.tsx`, `src/features/dashboard/CategoryBreakdown.tsx`, `src/features/insights/CategoryComparisonChart.tsx`

### Fix #14: BottomNav More drawer section grouping

**Problem:** 9 items in a flat list. No information hierarchy.

**Fix:** Add visual section headers and dividers between groups. CSS-only — no structural change to the `moreItems` array:

- **Finance:** Bills, Recurring, Savings, Insights
- **Tools:** Reports, Upload, Export
- **Settings:** Settings, Categories

```tsx
{/* Section header example */}
<p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
  Finance
</p>
```

**File:** `src/components/layout/BottomNav.tsx`

### Fix #15: PaymentMethods METHOD_COLORS → CSS palette

**Problem:** `METHOD_COLORS` hardcodes hex colors for specific payment method names. Doesn't adapt to dark mode, and breaks for any method name not in the map.

**Fix:** Remove `METHOD_COLORS` entirely. Assign colors by index from the `--chart-color-1…6` palette defined in Fix #1:

```tsx
const PALETTE = [
  'var(--chart-color-1)', 'var(--chart-color-2)',
  'var(--chart-color-3)', 'var(--chart-color-4)',
  'var(--chart-color-5)', 'var(--chart-color-6)',
];

const data = Object.entries(totals)
  .sort((a, b) => b[1] - a[1])
  .map(([name, value], index) => ({
    name,
    value,
    color: PALETTE[index % PALETTE.length],
  }));
```

**File:** `src/features/dashboard/PaymentMethods.tsx`

### Fix #16: Consistent font-mono on currency amounts

**Problem:** Most amounts use `font-mono` but chart tooltips and some Insights compact amounts don't.

**Fix:** Audit all currency displays in Insights components and chart tooltips. Add `font-mono` class to any currency `<span>` missing it.

**Files:** All Insights components, chart tooltip renderers

---

## i18n Keys

| Key | EN | ID | Notes |
|-----|----|----|-------|
| `thisMonth` | This Month | Bulan Ini | Check for duplicates before adding |
| `lastMonth` | Last Month | Bulan Lalu | Check for duplicates before adding |

`spendingByDay` (Fix #10) — verify this key already exists before implementing.

---

## Testing

No new tests needed. Verification:

- `npx tsc --noEmit` — zero type errors
- `npx vitest run` — all **496** tests pass (32 test files)
- `npx eslint src/ --max-warnings 0` — zero lint warnings
- `npx prettier --check "src/**/*.{ts,tsx}"` — all formatted
- Visual: toggle dark/light mode — chart colors adapt via CSS vars
- Visual: PaymentMethods bars change color correctly in dark mode
- Keyboard: Tab from top — skip link appears, `focus:absolute` positions correctly
- Reduced motion: enable in DevTools → all Framer Motion animations disabled
- Click modal/sheet → backdrop clearly dims page content at 25%
- Screen reader: navigate DayOfWeekPills — each pill announces day name + amount

---

## Summary of Modified Files (20)

| File | Fixes Applied |
|------|--------------|
| `src/app/globals.css` | #1 — 5 semantic + 6 palette chart CSS vars |
| `src/app/layout.tsx` | #2 — skip link: fixed→absolute, z-[100]→z-50, rounded-lg→rounded-md |
| `src/components/providers/StoreProvider.tsx` | #4 — MotionConfig reducedMotion="user" |
| `src/components/ui/sheet.tsx` | #7 — backdrop /10 → /25 |
| `src/components/ui/alert-dialog.tsx` | #7 — backdrop /10 → /25 |
| `src/lib/i18n.ts` | #5 — thisMonth, lastMonth keys |
| `src/components/layout/BottomNav.tsx` | #14 — Finance / Tools / Settings section headers |
| `src/features/dashboard/CashFlowChart.tsx` | #1 CSS vars, #6 Legend, #13 aria wrapper |
| `src/features/dashboard/CategoryBreakdown.tsx` | #1 CSS vars, #13 aria wrapper |
| `src/features/dashboard/PaymentMethods.tsx` | #15 — METHOD_COLORS → index CSS palette |
| `src/features/reports/ForecastChart.tsx` | #1 — CSS vars (style prop for gradients) |
| `src/features/reports/TrendChart.tsx` | #1 — CSS vars (style prop for gradients) |
| `src/features/net-worth/NetWorthTrendChart.tsx` | #1 — CSS vars (style prop for gradients) |
| `src/features/insights/HealthScoreCard.tsx` | #3 SVG aria-label, #12 duration-700→500 |
| `src/features/insights/CategoryComparisonChart.tsx` | #1 CSS vars, #5 i18n, #13 aria wrapper |
| `src/features/insights/BiggestTransactionsCard.tsx` | #11 aria-hidden + +/- prefix, #16 font-mono |
| `src/features/insights/DayOfWeekPills.tsx` | #10 role="list/listitem" + aria-labels |
| `src/features/insights/OutlierAlerts.tsx` | #11 aria-hidden + +/- prefix, #16 font-mono |
| `src/features/transactions/RecurringTransactionForm.tsx` | #8 htmlFor on all Labels, #9 required asterisks |
| `src/features/transactions/TransactionForm.tsx` | #9 — required asterisks only |
