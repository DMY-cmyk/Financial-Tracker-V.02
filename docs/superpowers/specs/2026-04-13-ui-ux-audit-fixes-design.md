---
feature: UI/UX Audit Fixes
type: spec
date: 2026-04-13
status: approved
tier: 1
---

# UI/UX Audit Fixes — Final Design Spec

## Overview

A comprehensive fix pass addressing 16 UI/UX issues found during a full app audit. Covers accessibility (WCAG compliance), dark mode theming, form usability, chart readability, and navigation polish. No new features — purely fixes to existing components.

**Scope:** 0 new files, 20 modified files, 0 new tests (no behavior change).

## Goals

- Fix 4 CRITICAL accessibility blockers (chart colors, skip link, SVG aria, reduced motion)
- Fix 7 HIGH functional gaps (i18n, legends, backdrop, forms, pills, color indicators)
- Fix 5 MEDIUM/LOW polish items (animation timing, chart aria, nav grouping, consistency)
- All charts adapt correctly to dark/light mode via CSS custom properties
- All Framer Motion animations respect `prefers-reduced-motion` OS setting
- All forms have visible labels and required field indicators

## Non-Goals

- No structural navigation redesign (just visual grouping in More drawer)
- No new components or pages
- No new tests (these are accessibility/theming fixes with zero behavior change)
- No chart library migration (keep Recharts)

---

## Part 1: CRITICAL Fixes (4 issues)

### Fix #1: Chart colors → CSS custom properties

**Problem:** 6+ chart components use hardcoded hex colors (`#059669`, `#DC2626`, `#3B82F6`) in SVG fills, strokes, and gradient stops. These don't adapt to dark/light mode.

**Fix:** Define chart-specific color tokens as CSS custom properties in `globals.css`, with different values for light and dark themes. All chart components reference `var(--chart-*)` instead of hex.

Add to `src/app/globals.css`:

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

Update all chart components to use `var(--chart-income)` etc. instead of hardcoded hex. For SVG gradient `stopColor` attributes that don't support CSS variables, use a JS helper that reads the computed CSS variable value.

**Files:** `globals.css`, `CashFlowChart.tsx`, `ForecastChart.tsx`, `TrendChart.tsx`, `NetWorthTrendChart.tsx`, `CategoryComparisonChart.tsx`, `CategoryBreakdown.tsx`

### Fix #2: Skip link visible on keyboard focus

**Problem:** Skip link exists (`#main-content` target) but uses `sr-only` permanently. Keyboard users can't see it when tabbing.

**Fix:** Change skip link classes to become visible on `:focus`:

```
sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50
focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md
```

**File:** `layout.tsx` or `AppShell.tsx` (wherever skip link lives)

### Fix #3: SVG health score ring aria-label

**Problem:** HealthScoreCard's SVG ring has no `role` or `aria-label`. Screen readers skip it entirely.

**Fix:** Add to the SVG element:

```tsx
<svg role="img" aria-label={`${t(locale, 'healthScore')}: ${savingsRate}%`}>
```

**File:** `HealthScoreCard.tsx`

### Fix #4: MotionConfig reducedMotion at app level

**Problem:** CSS animations respect `prefers-reduced-motion` via globals.css, but Framer Motion component animations bypass this.

**Fix:** Wrap the app's provider tree with Framer Motion's `MotionConfig`:

```tsx
import { MotionConfig } from 'framer-motion';

<MotionConfig reducedMotion="user">
  {children}
</MotionConfig>
```

This makes all `motion.*` components automatically respect the OS reduced motion setting. One line, zero per-component changes.

**File:** `StoreProvider.tsx` or providers wrapper

---

## Part 2: HIGH Fixes (7 issues)

### Fix #5: Insights chart hardcoded English → i18n

**Problem:** CategoryComparisonChart tooltip and legend use hardcoded "This Month" / "Last Month" strings.

**Fix:** Use `t(locale, 'thisMonth')` and `t(locale, 'lastMonth')`. Add 2 new i18n keys.

**i18n keys to add:**

| Key | EN | ID |
|-----|----|----|
| `thisMonth` | This Month | Bulan Ini |
| `lastMonth` | Last Month | Bulan Lalu |

**File:** `CategoryComparisonChart.tsx`, `i18n.ts`

### Fix #6: Chart legends missing

**Problem:** CashFlowChart and CategoryBreakdown have no visible legend.

**Fix:** Add Recharts `<Legend>` component to each chart:

```tsx
<Legend
  verticalAlign="bottom"
  height={36}
  formatter={(value) => t(locale, value)}
/>
```

**Files:** `CashFlowChart.tsx`, `CategoryBreakdown.tsx`

### Fix #7: Modal backdrop opacity 10% → 25%

**Problem:** Sheet and AlertDialog backdrop uses `bg-black/10` — too subtle for users with visual impairments. WCAG recommends 20-40%.

**Fix:** Change `bg-black/10` to `bg-black/25` in both overlay components.

**Files:** `sheet.tsx`, `alert-dialog.tsx`

### Fix #8: Form placeholder-as-label → persistent labels

**Problem:** Some form fields use placeholder text that mimics labels. When typing, the "label" disappears.

**Fix:** Audit RecurringTransactionForm and TransactionForm. Ensure every field has a visible `<Label>` with `htmlFor`. Keep placeholders only for hint text (e.g., "e.g., Coffee at Starbucks").

**Files:** `RecurringTransactionForm.tsx`, `TransactionForm.tsx`

### Fix #9: Required field indicators

**Problem:** Required fields have no visual indicator. Users discover which fields are mandatory only after submission fails.

**Fix:** Add red asterisk next to required field labels:

```tsx
<Label htmlFor="description">
  {t(locale, 'description')}
  <span className="text-red-500 ml-0.5">*</span>
</Label>
```

**Files:** `RecurringTransactionForm.tsx`, `TransactionForm.tsx`

### Fix #10: Day-of-week pills aria-labels

**Problem:** Pills are `div` elements with no semantic meaning. Screen readers get no context.

**Fix:** Mark the container as `role="list"` with `aria-label`. Each pill gets `role="listitem"` with an `aria-label` describing the day and formatted amount.

```tsx
<div role="list" aria-label={t(locale, 'spendingByDay')}>
  <div role="listitem" aria-label={`${dayName}: ${formattedAmount}`}>
    ...
  </div>
</div>
```

**File:** `DayOfWeekPills.tsx`

### Fix #11: Color-only indicators → aria-hidden + text prefix

**Problem:** Green/red dots in transaction lists convey income/expense by color alone.

**Fix:** Add `aria-hidden="true"` to the colored dot (decorative), and ensure the amount text has a +/- prefix that conveys the same information.

```tsx
<span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
<span className="font-mono">-Rp 500.000</span>
```

**Files:** `BiggestTransactionsCard.tsx`, `OutlierAlerts.tsx`

---

## Part 3: MEDIUM + LOW Fixes (5 issues)

### Fix #12: SVG ring animation 700ms → 500ms

**Problem:** HealthScoreCard ring `transition-all duration-700` exceeds micro-interaction guidelines.

**Fix:** Change to `duration-500`.

**File:** `HealthScoreCard.tsx`

### Fix #13: Chart aria-label descriptions

**Problem:** Dashboard charts lack screen reader descriptions.

**Fix:** Wrap each chart's `ResponsiveContainer` in a `div` with `role="img"` and `aria-label` describing what the chart shows.

**Files:** `CashFlowChart.tsx`, `CategoryBreakdown.tsx`, `CategoryComparisonChart.tsx`

### Fix #14: Bottom nav More drawer section grouping

**Problem:** 9+ items in a flat list. Information hierarchy unclear.

**Fix:** Add visual section headers ("Finance", "Tools") and subtle dividers between groups in the More drawer render. No structural change — just CSS separators.

**File:** `BottomNav.tsx`

### Fix #15: PaymentMethods METHOD_COLORS → CSS variables

**Problem:** Hardcoded hex color object doesn't adapt to dark mode.

**Fix:** Replace with CSS variable references from the chart color system (Fix #1), or use category colors from the DB which already theme correctly.

**File:** `PaymentMethods.tsx`

### Fix #16: Consistent monospace on currency amounts

**Problem:** Most amounts use `font-mono` but some tooltips and compact amounts don't.

**Fix:** Audit all currency displays in Insights components and chart tooltips. Ensure `font-mono` class is applied consistently.

**Files:** All insight components, chart tooltips

---

## i18n Keys

| Key | EN | ID |
|-----|----|----|
| `thisMonth` | This Month | Bulan Ini |
| `lastMonth` | Last Month | Bulan Lalu |

Check for duplicates before adding.

---

## Testing

No new tests needed. All fixes are accessibility, theming, and UX polish with zero behavior change. Verification:

- `npx tsc --noEmit` — zero type errors
- `npx vitest run` — all existing 448 tests pass
- `npx eslint src/ --max-warnings 0` — zero lint errors
- `npx prettier --check "src/**/*.{ts,tsx}"` — all formatted
- Visual verification: toggle dark/light mode and confirm chart colors adapt
- Keyboard test: Tab from top of page, verify skip link appears on focus
- Reduced motion: Enable `prefers-reduced-motion` in DevTools, confirm animations disabled

---

## Summary of All Files

### Modified Files (20)

| File | Fixes Applied |
|------|--------------|
| `src/app/globals.css` | #1 — chart color CSS variables |
| `src/app/layout.tsx` (or AppShell) | #2 — skip link focus visibility |
| `src/components/providers/StoreProvider.tsx` | #4 — MotionConfig wrapper |
| `src/components/ui/sheet.tsx` | #7 — backdrop /10 → /25 |
| `src/components/ui/alert-dialog.tsx` | #7 — backdrop /10 → /25 |
| `src/features/dashboard/CashFlowChart.tsx` | #1, #6, #13 — CSS vars + legend + aria |
| `src/features/dashboard/CategoryBreakdown.tsx` | #1, #6, #13 — CSS vars + legend + aria |
| `src/features/dashboard/PaymentMethods.tsx` | #15 — CSS vars |
| `src/features/reports/ForecastChart.tsx` | #1 — CSS vars |
| `src/features/reports/TrendChart.tsx` | #1 — CSS vars |
| `src/features/net-worth/NetWorthTrendChart.tsx` | #1 — CSS vars |
| `src/features/insights/HealthScoreCard.tsx` | #3, #12 — SVG aria + duration |
| `src/features/insights/CategoryComparisonChart.tsx` | #1, #5, #13 — CSS vars + i18n + aria |
| `src/features/insights/BiggestTransactionsCard.tsx` | #11, #16 — color indicator + monospace |
| `src/features/insights/DayOfWeekPills.tsx` | #10 — role + aria-labels |
| `src/features/insights/OutlierAlerts.tsx` | #11, #16 — color indicator + monospace |
| `src/features/transactions/RecurringTransactionForm.tsx` | #8, #9 — labels + required indicators |
| `src/features/transactions/TransactionForm.tsx` | #8, #9 — labels + required indicators |
| `src/components/layout/BottomNav.tsx` | #14 — grouped More drawer |
| `src/lib/i18n.ts` | #5 — 2 new keys (thisMonth, lastMonth) |
