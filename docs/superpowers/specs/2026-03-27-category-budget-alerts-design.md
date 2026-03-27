---
feature: Category Budget Alerts
type: spec
date: 2026-03-27
status: draft
tier: 2
---

# Category Budget Alerts — Design Spec

## Overview

Budget progress bars on the budget page and dashboard already show spending vs budget visually. But users must navigate to `/budget` to notice they're over. This feature adds proactive alerts: amber badges when a category hits 80% of budget, red badges at 100%, a dashboard banner summarizing over-budget categories, and a one-time toast when a category is first exceeded. No new API or DB work is needed — all data is already computed by existing hooks.

## Goals

- Amber badge on each category at 80%+ of budget: "Dining: 80% used"
- Red badge at 100%+ of budget: "OVER BUDGET"
- Dashboard `BudgetProgress` widget shows a `BudgetAlertBanner` summarizing over-budget count
- One toast per session per exceeded category (deduped via sessionStorage)
- Alerts appear on both the dashboard and the `/budget` page

## Non-Goals

- No push notifications (browser/mobile)
- No email alerts
- No per-category threshold customization (fixed 80%/100%)
- No snoozeable/dismissible alerts
- No server-side alert state — pure client computation

## Approaches

### Option A — Client-side computation in hooks + sessionStorage dedup (Recommended)
`computeBudgetAlerts()` utility reads from data already returned by `useDashboardData()` and `useBudgetData()`. Alert badges rendered in existing components. Toast dedup via `sessionStorage`.

**Pros:** No new API or DB needed. Fast. Consistent with project's pattern of computing derived state in hooks.
**Cons:** None meaningful.

### Option B — Server-side `/api/alerts/budget` endpoint
Server computes alerts, returns alert list.

**Cons:** Unnecessary extra API call — all data is already fetched by existing hooks. Over-engineered.

### Option C — Store dismissed alerts in Zustand
Persist toast-shown state across page refreshes.

**Cons:** Using Zustand for this is wrong — it's ephemeral session state, not UI state. sessionStorage is the right tool.

**Recommendation: Option A + sessionStorage for toast dedup.**

## Design

### Alert Types

```typescript
type BudgetAlertLevel = 'warning' | 'exceeded'

interface BudgetAlert {
  categoryId: string
  categoryName: string
  color: string
  budgetAmount: number
  spentAmount: number
  spentPct: number      // 0–∞, e.g. 1.2 = 120%
  level: BudgetAlertLevel
}
```

Thresholds:
- `warning`: `spentPct >= 0.8 && spentPct < 1.0`
- `exceeded`: `spentPct >= 1.0`

Categories with `budgetAmount === 0` or `null` are excluded.

### New Utility: `src/lib/budget-alerts.ts`

```typescript
export function computeBudgetAlerts(
  categories: Array<{ id: string; name: string; color: string; budget: number; spent: number }>
): BudgetAlert[]
```

Pure function — easy to unit test. Called by both `useDashboardData()` and `useBudgetData()`.

### Hook Updates

**`src/hooks/useDashboardData.ts`**
- Add `budgetAlerts: BudgetAlert[]` to return value
- Computed from existing `categoryTotals` data via `computeBudgetAlerts()`

**`src/hooks/useBudgetData.ts`**
- Add `budgetAlerts: BudgetAlert[]` to return value
- Same utility, same computation

### New Component: `BudgetAlertBanner`

Location: `src/features/dashboard/BudgetAlertBanner.tsx`

```tsx
interface BudgetAlertBannerProps {
  alerts: BudgetAlert[]
}
```

Behavior:
- Hidden when `alerts.length === 0`
- Shows amber banner when only warnings exist: "3 categories approaching budget limit"
- Shows red banner when any `exceeded` alerts exist: "2 categories over budget this month"
- Links to `/budget` — "View Budget →"
- Animated entrance: `fadeInUp` from `src/lib/motion.ts`
- Placement: above all widgets in the dashboard grid

### Dashboard Widget Updates (`BudgetProgress`)

Each category row gets an inline badge:
- `level === 'warning'`: amber badge "80%" with amber text
- `level === 'exceeded'`: red badge "OVER" with red text
- No badge for normal categories

### Budget Page Updates (`BudgetCategoryCard`)

Same badge logic on each category card:
```tsx
{alert?.level === 'exceeded' && <Badge variant="destructive">Over Budget</Badge>}
{alert?.level === 'warning' && <Badge className="bg-amber-100 text-amber-700">{Math.round(alert.spentPct * 100)}%</Badge>}
```

### Toast Behavior

New hook: `useBudgetAlertToasts(alerts: BudgetAlert[])`

```typescript
// sessionStorage key: 'budget-alert-toasts-shown'
// Value: Set<categoryId> of categories already toasted this session

useEffect(() => {
  const shownIds = getShownIds() // from sessionStorage
  const newlyExceeded = alerts
    .filter(a => a.level === 'exceeded' && !shownIds.has(a.categoryId))

  if (newlyExceeded.length === 1) {
    toast.warning(`${newlyExceeded[0].categoryName} is over budget this month`)
  } else if (newlyExceeded.length > 1) {
    toast.warning(`${newlyExceeded.length} categories are over budget this month`)
  }

  markShown(newlyExceeded.map(a => a.categoryId))
}, [alerts])
```

Call `useBudgetAlertToasts(budgetAlerts)` in the dashboard page component.

### No new API routes. No DB changes.

## i18n Keys

| Key | EN | ID |
|-----|----|----|
| `budgetWarning` | "approaching budget limit" | "mendekati batas anggaran" |
| `overBudget` | "over budget" | "melebihi anggaran" |
| `categoriesOverBudget` | "{n} categories over budget this month" | "{n} kategori melebihi anggaran bulan ini" |
| `categoriesAtLimit` | "{n} categories approaching budget limit" | "{n} kategori mendekati batas anggaran" |
| `viewBudget` | "View Budget" | "Lihat Anggaran" |

## Testing

- `computeBudgetAlerts()`: returns `warning` at 80%, `exceeded` at 100%, nothing at 79%, excludes budget=0
- `BudgetAlertBanner`: renders amber for warnings only, red when any exceeded, hides when empty
- `useBudgetAlertToasts()`: shows toast on first exceeded, doesn't repeat in same session
- sessionStorage mock: verify dedup key read/write

## Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| Category with `budget = 0` or `null` | Exclude from alerts (no budget set = not tracked) |
| Category with 0 spending | spentPct = 0, no alert |
| Multiple categories exceeded at once | Single toast: "N categories are over budget" |
| Budget edited mid-month (budget raised) | `computeBudgetAlerts()` runs on next render — alert level auto-recalculates |
| Deleted category | Already filtered out by existing hook data — won't appear in alerts |
| Dark mode | Badge colors use semantic Tailwind classes (amber-100/700, red) — test both modes |
| Indonesian text overflow | Alert banner badge text is short; test at 320px width |
