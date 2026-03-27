---
feature: Yearly Budget Planning
type: spec
date: 2026-03-27
status: draft
tier: 3
---

# Feature 14 — Yearly Budget Planning

**Date:** 2026-03-27
**Status:** Draft
**Author:** Agent spec pass

---

## 1. Overview

### The Problem with the Current Budget System

The existing budget system stores a single `budget REAL` value per category on the `categories` table. This works well for predictable recurring monthly expenses — Food at Rp 2.000.000/month is always Rp 2.000.000 regardless of the month. However, it breaks down for the most common real-world budgeting challenge: **irregular annual expenses**.

Consider the following realistic Indonesian personal-finance scenarios:

| Category | Month | Amount | Fits current system? |
|----------|-------|--------|---------------------|
| Vacation | June only | Rp 10.000.000 | No — sets monthly budget for all 12 months |
| Insurance | January only | Rp 5.000.000 | No |
| School fees | July & December | Rp 3.000.000 each | No |
| Lebaran gifts | March/April | Rp 2.500.000 | No |
| Groceries | Every month | Rp 1.800.000 | Yes |

If a user sets Vacation budget to Rp 10.000.000 to handle a June holiday, the budget page shows a Rp 10.000.000 "gap" every other month of the year. There is no way to say "budget Rp 0 for Vacation in January through May, Rp 10.000.000 in June, Rp 0 for the rest."

Yearly Budget Planning solves this by allowing per-month budget amounts per category for a given calendar year.

### What This Feature Adds

- A 12-column budget grid view: categories as rows, months Jan–Dec as columns
- Per-cell budget editing (click a cell → type amount → confirm)
- Automatic fallback to the existing `categories.budget` when no monthly override is set
- Year-to-date KPI cards: total planned annual budget, total spent YTD, remaining
- Column totals (monthly planned spend) and row totals (annual budget per category)
- Year navigation controls (previous/next year)
- Color-coded cells: gray = no explicit budget (using default), green = within budget, amber = 80–99% used, red = over budget, empty/zero = intentionally zero

---

## 2. Goals

1. Allow users to assign different budget amounts to a category for each month of a calendar year.
2. Support zero-budget months explicitly (Vacation in January = Rp 0, not "use default").
3. Show a full-year at-a-glance grid so users can spot months with no budgets planned.
4. Provide year-to-date summary KPIs so users can track annual budget health without switching between months.
5. Integrate naturally with the existing monthly budget page — no UX regression.
6. Work on mobile with a horizontally-scrollable grid; full desktop grid visible without scroll.
7. Maintain data integrity: deleting a category removes all its monthly budget rows (cascade).
8. Full i18n support (EN/ID) for all new strings.

---

## 3. Non-Goals

- **Do not remove or alter the existing monthly budget page.** `categories.budget` continues to power `/budget` (the default monthly view). This feature is additive.
- **No multi-year planning.** The grid shows one calendar year at a time. Historical years are readable but planning intent is year-scoped.
- **No income category budgets.** The grid shows expense categories only. Income planning is out of scope.
- **No budget templates or copy-year functionality** in this initial tier. A user cannot copy 2025's plan into 2026 automatically.
- **No notifications or budget alerts** triggered by annual budget thresholds (those belong to a future notifications feature).
- **No budget locking or approval workflows.**
- **No CSV/XLSX export of the budget grid** in this tier (export feature is separate).

---

## 4. Approaches

Three data model options were considered. Each has different trade-offs in flexibility, query complexity, and migration effort.

### Option A — New `monthly_budgets` table (Recommended)

Add a dedicated normalized table:

```sql
monthly_budgets (
  id, category_id, month, year, budget_amount,
  UNIQUE(category_id, month, year)
)
```

Each row represents one category's budget for one specific month in one year.

**Pros:**
- Cleanest relational model; each combination is one row
- Simple upsert: `INSERT ... ON CONFLICT DO UPDATE SET budget_amount = ?`
- Easy to query: `WHERE year = ? AND month BETWEEN 1 AND 12`
- `ON DELETE CASCADE` on `category_id` handles cleanup automatically
- Distinguishes explicitly-zero months from not-set months (a row with `budget_amount = 0` vs no row)
- Scales effortlessly to any number of categories and years
- No changes to the `categories` table schema
- Consistent with existing table conventions (bill.repository.ts, same `month`/`year` integer pattern)

**Cons:**
- Maximum 240 rows per year for 20 categories (trivial in practice)
- Requires a new repository, service, and API routes

### Option B — Keep `categories.budget` + `annual_budget_overrides` table

Use `categories.budget` as the 12-month default and add an override table for exceptional months.

```sql
annual_budget_overrides (
  id, category_id, month, year, budget_amount,
  UNIQUE(category_id, month, year)
)
```

**Pros:**
- Minimal rows stored (only non-default months)
- `categories.budget` default is preserved semantically

**Cons:**
- Two-source logic in every service function: "is there an override? use it; else use `categories.budget`"
- The grid must merge two data sources per cell, complicating the UI layer
- Users editing from the grid might be confused about when they're setting a "default" vs an "override"
- The concept of a "default monthly budget" blurs with "annual budget planning" — philosophically confusing

### Option C — JSON array per category per year

Store a 12-element JSON array as a single row per category per year:

```sql
annual_budget_plan (
  id, category_id, year, months TEXT,  -- JSON: [0,0,10000000,0,0,0,0,0,0,0,0,0]
  UNIQUE(category_id, year)
)
```

**Pros:**
- One row per category per year — compact
- No join needed to fetch all months for a category

**Cons:**
- Cannot use SQL to query "all categories where month 6 budget > 0" without JSON parsing
- Updating one month requires reading, deserializing, modifying, re-serializing, writing
- JSON in SQLite is possible but awkward; Postgres has `jsonb` but that's a type mismatch
- Makes sum/aggregate queries across months impossible in SQL
- Cannot enforce per-element constraints at the DB level
- Anti-pattern for normalized relational data

### Recommendation: Option A

Option A is the cleanest, most flexible, and most consistent with the existing codebase patterns. The bills table already uses `month INTEGER` and `year INTEGER` columns in exactly this pattern. All repository code uses `nanoid()` for IDs and follows the same create/find/update/delete shape. Option A requires no changes to existing tables and has no ambiguity in the fallback logic.

---

## 5. Detailed Design

### 5.1 Database Schema

Add one new table to `initializeSchema()` in `src/server/db/client.ts`:

```sql
CREATE TABLE IF NOT EXISTS monthly_budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  budget_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE(category_id, month, year)
)
```

Column notes:
- `month` is 1-based (1 = January, 12 = December), matching the JavaScript `Date.getMonth() + 1` convention
- `budget_amount = 0` is a valid explicit state (user wants zero budget for that month)
- The absence of a row means "no monthly override — fall back to `categories.budget`"
- `ON DELETE CASCADE` ensures no orphaned rows when a category is deleted

No column migrations are needed for existing tables. The new table is additive.

For Neon Postgres compatibility, the `REFERENCES ... ON DELETE CASCADE` constraint uses standard SQL syntax supported by both SQLite (with `PRAGMA foreign_keys = ON`, already set in `sqlite-client.ts`) and Postgres.

### 5.2 TypeScript Types

Add to `src/lib/types.ts`:

```typescript
export interface MonthlyBudget {
  id: string;
  categoryId: string;
  month: number;   // 1–12
  year: number;
  budgetAmount: number;
  createdAt?: string;
}

// Shape returned by GET /api/budget/annual?year=YYYY
export interface AnnualBudgetCategory {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  defaultBudget: number;           // categories.budget (monthly fallback)
  months: AnnualBudgetMonth[];     // array of 12, index 0 = January
}

export interface AnnualBudgetMonth {
  month: number;                   // 1–12
  budgetAmount: number | null;     // null = no override (use defaultBudget); 0 = explicit zero
  spent: number;                   // actual spending for this month/year
  hasOverride: boolean;            // true if a monthly_budgets row exists for this cell
}

// Shape returned by GET /api/budget/annual/summary?year=YYYY
export interface AnnualBudgetSummary {
  year: number;
  totalPlannedBudget: number;      // sum of effective budget across all months × all categories
  totalSpentYtd: number;           // sum of all expense transactions for the year
  remainingBudget: number;         // totalPlannedBudget − totalSpentYtd
  categoryBreakdown: AnnualCategoryBreakdown[];
}

export interface AnnualCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  annualBudget: number;            // sum of effective budgets across 12 months
  annualSpent: number;             // total spent for year in this category
  monthlyBreakdown: {
    month: number;
    effectiveBudget: number;       // override if exists, else defaultBudget
    spent: number;
  }[];
}
```

### 5.3 Zod Validation Schemas

Add to `src/lib/api/validation.ts`:

```typescript
// POST /api/budget/annual — upsert one cell
export const upsertMonthlyBudgetSchema = z.object({
  categoryId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  budgetAmount: z.number().min(0),
});

// DELETE /api/budget/annual — clear override for one cell
export const deleteMonthlyBudgetSchema = z.object({
  categoryId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});
```

### 5.4 Repository

New file: `src/server/repositories/monthly-budget.repository.ts`

```typescript
interface MonthlyBudgetRow {
  id: string;
  category_id: string;
  month: number;
  year: number;
  budget_amount: number;
  created_at: string;
}
```

Methods:
- `findByYear(year: number): Promise<MonthlyBudget[]>` — all rows for the year, used to build the full grid
- `findByCategoryAndYear(categoryId: string, year: number): Promise<MonthlyBudget[]>` — 12 rows max
- `findByMonth(month: number, year: number): Promise<MonthlyBudget[]>` — all categories for a single month (used by fallback logic in existing budget page service if needed in future)
- `upsert(data: Omit<MonthlyBudget, 'id' | 'createdAt'>): Promise<MonthlyBudget>` — INSERT ON CONFLICT DO UPDATE
- `delete(categoryId: string, month: number, year: number): Promise<boolean>` — removes the override row; falls back to default budget
- `deleteByCategoryId(categoryId: string): Promise<void>` — used by category delete service (cascade covers DB, but may be useful for explicit cleanup)

The `upsert` uses:
```sql
INSERT INTO monthly_budgets (id, category_id, month, year, budget_amount, created_at)
VALUES (?, ?, ?, ?, ?, datetime('now'))
ON CONFLICT(category_id, month, year)
DO UPDATE SET budget_amount = excluded.budget_amount
```

For Postgres compatibility, the same `ON CONFLICT ... DO UPDATE` syntax works with Neon. `datetime('now')` is only used in SQLite; the Neon client will use `CURRENT_TIMESTAMP` via the default column, or use `NOW()` in the insert.

Note: Since the codebase already handles this dual-database issue by using `CURRENT_TIMESTAMP` as a column default, the insert can omit `created_at` and rely on the table default.

### 5.5 Service

New file: `src/server/services/annual-budget.service.ts`

This service follows the `ServiceResult<T>` pattern already established across all other services.

Functions:

**`getAnnualBudgetGrid(year: number): Promise<ServiceResult<AnnualBudgetCategory[]>>`**
- Fetches all expense categories
- Fetches all `monthly_budgets` rows for the year
- Fetches spending totals per category per month for the year (SQL: `SELECT category_id, strftime('%m', date) as month, SUM(amount) as spent FROM transactions WHERE type='expense' AND strftime('%Y', date)=? GROUP BY category_id, month`)
- Merges into `AnnualBudgetCategory[]`: for each category, build a 12-element `months` array. Each element: if a `monthly_budgets` row exists → `hasOverride: true`, `budgetAmount: row.budget_amount`; else → `hasOverride: false`, `budgetAmount: null`. Attach `spent` from the transaction aggregation (0 if no transactions that month).

**`getAnnualBudgetSummary(year: number): Promise<ServiceResult<AnnualBudgetSummary>>`**
- Reuses the merged data from `getAnnualBudgetGrid`
- Computes `effectiveBudget` for each cell: if `hasOverride` → use `budgetAmount`; else use `category.defaultBudget`
- Sums across all categories and all 12 months for `totalPlannedBudget`
- Sums all expense transactions for the year for `totalSpentYtd`

**`upsertMonthlyBudget(body: unknown): Promise<ServiceResult<MonthlyBudget>>`**
- Validates with `upsertMonthlyBudgetSchema`
- Calls repository upsert
- Returns the saved `MonthlyBudget`

**`deleteMonthlyBudget(body: unknown): Promise<ServiceResult<{ success: boolean }>>`**
- Validates with `deleteMonthlyBudgetSchema`
- Calls repository delete
- Returns `{ success: true }` (idempotent — no error if row did not exist)

### 5.6 API Routes

#### `GET /api/budget/annual?year=YYYY`

File: `src/app/api/budget/annual/route.ts`

Query param: `year` (integer, required, 2020–2100). Returns `AnnualBudgetCategory[]`.

Response shape:
```json
{
  "categories": [
    {
      "categoryId": "abc123",
      "categoryName": "Vacation",
      "categoryColor": "#EC4899",
      "categoryIcon": "plane",
      "defaultBudget": 0,
      "months": [
        { "month": 1, "budgetAmount": null, "spent": 0, "hasOverride": false },
        { "month": 6, "budgetAmount": 10000000, "spent": 9500000, "hasOverride": true },
        ...
      ]
    }
  ]
}
```

Error responses: `400` if `year` param is missing or out of range; `500` on DB error.

#### `POST /api/budget/annual`

File: same `route.ts` (POST handler)

Body: `{ categoryId, month, year, budgetAmount }`

Validates with `upsertMonthlyBudgetSchema`. Returns `201` with the saved `MonthlyBudget` row or `400`/`500`.

#### `DELETE /api/budget/annual`

File: same `route.ts` (DELETE handler)

Body: `{ categoryId, month, year }`

Removes the monthly override. The cell will revert to showing `defaultBudget`. Returns `200 { success: true }` or `400`/`500`.

#### `GET /api/budget/annual/summary?year=YYYY`

File: `src/app/api/budget/annual/summary/route.ts`

Returns `AnnualBudgetSummary`. Same year validation. Used by the KPI cards at the top of the page.

### 5.7 API Client Contract

Add to `src/lib/api/contracts.ts`:

```typescript
export interface AnnualBudgetResponse {
  categories: AnnualBudgetCategory[];
}

export interface AnnualBudgetSummaryResponse extends AnnualBudgetSummary {}
```

Add to `src/lib/api/client.ts` under an `annualBudget` namespace:

```typescript
annualBudget: {
  getGrid: (year: number) => fetchApi<AnnualBudgetResponse>(`/api/budget/annual?year=${year}`),
  getSummary: (year: number) => fetchApi<AnnualBudgetSummaryResponse>(`/api/budget/annual/summary?year=${year}`),
  upsert: (body: { categoryId: string; month: number; year: number; budgetAmount: number }) =>
    fetchApi<MonthlyBudget>('/api/budget/annual', { method: 'POST', body: JSON.stringify(body) }),
  delete: (body: { categoryId: string; month: number; year: number }) =>
    fetchApi<{ success: boolean }>('/api/budget/annual', { method: 'DELETE', body: JSON.stringify(body) }),
},
```

---

## 6. UI Design

### 6.1 Navigation & Entry Points

**Option 1 (Recommended): Tab toggle on the existing `/budget` page**

Add a "Monthly / Annual" tab toggle near the `PageHeader` on `/budget`. Switching to "Annual" renders the `AnnualBudgetGrid` in place of the current `BudgetCategoryCard` grid. The tab state is local (not persisted) — users return to Monthly view on next visit.

This keeps everything under `/budget` and avoids a new nav item, which aligns with the feature's role as an extension of budgeting rather than a wholly new tool.

**Option 2: Sub-route `/budget/annual`**

Add a distinct page at `/budget/annual`. The existing `/budget` page gains a persistent link "Annual Budget Plan →" near the `BudgetOverview` cards. No nav changes required since the annual page is accessible from the monthly page.

**Chosen approach: Option 1 (tab toggle)** — keeps `/budget` as the single entry point for all budget-related work. The tab toggle is a common pattern on the export page and is familiar to users.

**Bottom nav (mobile):** No change. The existing Budget tab already navigates to `/budget`.

**Sidebar nav:** No change. `{ href: '/budget', labelKey: 'budgetPage', icon: Target }` already exists in the Finance group in `src/features/navigation/nav-config.ts`.

### 6.2 Page Layout: `/budget` with Annual tab active

```
┌──────────────────────────────────────────────────────────────┐
│  PageHeader: "Budget"                                         │
│  [Monthly]  [Annual]   ←── tab toggle                        │
├──────────────────────────────────────────────────────────────┤
│  AnnualBudgetSummary (3 KPI cards)                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────┐  │
│  │ Total Planned   │ │ Spent YTD       │ │ Remaining      │  │
│  │ Rp 82.000.000   │ │ Rp 44.500.000   │ │ Rp 37.500.000  │  │
│  └─────────────────┘ └─────────────────┘ └────────────────┘  │
│                                          ← 2025 → 2026 →     │
├──────────────────────────────────────────────────────────────┤
│  AnnualBudgetGrid (horizontally scrollable on mobile)         │
│  ┌──────────────┬─────┬─────┬─────┬─────┬─────┬── ... ──┬──┐ │
│  │ Category     │ Jan │ Feb │ Mar │ Apr │ May │         │Σ │ │
│  ├──────────────┼─────┼─────┼─────┼─────┼─────┼── ... ──┼──┤ │
│  │ 🟡 Food      │ 1.8M│ 1.8M│ 1.8M│ 1.8M│ 1.8M│         │22M│ │
│  │ 🔵 Transport │ 800K│ 800K│ 800K│ 800K│ 800K│         │10M│ │
│  │ 🩷 Vacation  │  -  │  -  │  -  │  -  │  -  │[+10M Jun]│10M│ │
│  │ ...          │     │     │     │     │     │         │   │ │
│  ├──────────────┼─────┼─────┼─────┼─────┼─────┼── ... ──┼──┤ │
│  │ Monthly Total│ 7.6M│ 7.6M│ 7.6M│ 7.6M│ 7.6M│         │   │ │
│  └──────────────┴─────┴─────┴─────┴─────┴─────┴── ... ──┴──┘ │
└──────────────────────────────────────────────────────────────┘
```

Legend for cells:
- Gray background + dash (`—`): no override set, cell uses `defaultBudget` (which may itself be 0)
- White/card background: override set with `budgetAmount > 0`
- Emerald ring/tint: override set, spending < 80% of budget
- Amber ring/tint: override set, spending 80–99% of budget
- Red ring/tint: override set, spending ≥ 100% of budget
- Italicized gray text: no override, showing inherited `defaultBudget` as a hint

Current month column: subtle blue left border to orient the user in the current year.

Past months: slightly dimmer cell backgrounds (opacity-75) to visually indicate they are history.

### 6.3 Components

#### `AnnualBudgetGrid`

File: `src/components/budget/AnnualBudgetGrid.tsx`

Props:
```typescript
interface AnnualBudgetGridProps {
  categories: AnnualBudgetCategory[];
  year: number;
  onUpsert: (categoryId: string, month: number, budgetAmount: number) => Promise<void>;
  onDelete: (categoryId: string, month: number) => Promise<void>;
  isLoading: boolean;
}
```

Responsibilities:
- Renders a `<table>` with `table-fixed` layout on desktop, `overflow-x-auto` wrapper for mobile scroll
- Header row: Category name column (sticky left, `min-w-32`) + 12 month columns + Total column
- One `BudgetCell` per `(category, month)` intersection
- Footer row: column totals (sum of effective budgets per month)
- Row-end column: annual total per category
- Skeleton loading state: 5 rows × 14 columns of `animate-pulse` cells when `isLoading`

The table must NOT look like a spreadsheet (per CLAUDE.md anti-patterns). Achieve this through:
- Soft cell borders (`border-border/40` at low opacity), not hard grid lines
- Category rows use `rounded-2xl` conceptually via card-style row backgrounds
- No column-header letters (A, B, C) or row numbers
- No formula bar or cell address display

#### `BudgetCell`

File: `src/components/budget/BudgetCell.tsx`

Props:
```typescript
interface BudgetCellProps {
  month: number;            // 1–12
  budgetAmount: number | null;
  spent: number;
  hasOverride: boolean;
  defaultBudget: number;
  isPast: boolean;          // month is before current month in current year
  isCurrent: boolean;       // month is the current month
  onSave: (amount: number) => Promise<void>;
  onClear: () => Promise<void>;
}
```

Behavior:
- Default state: shows formatted amount (override) or italicized default hint (no override)
- Click → enters edit mode: shows `<Input>` with current value pre-filled, formatted as currency integer (e.g., `"10000000"` or using `formatCurrencyInput`)
- `Enter` or blur → save; `Escape` → cancel
- Long-press or right-click on a cell with override → shows "Clear override" option via a small dropdown or `DropdownMenu`
- Saving `budgetAmount = 0` explicitly is allowed (sets an override of zero)
- Clearing removes the `monthly_budgets` row entirely, reverting to the default
- Progress ring: a compact `<div>` arc or thin horizontal fill bar at the bottom of the cell showing `spent / effectiveBudget` percentage
- Color coding applied via `cn()` to the cell container class

Uses `formatCurrency` from `@/lib/formatters` for display and `parseCurrencyInput` for parsing typed input. These already exist — no new formatters needed.

Animation: `tapScale` preset from `src/lib/motion.ts` on click; no new animation configs.

#### `AnnualBudgetSummary`

File: `src/components/budget/AnnualBudgetSummary.tsx`

Props:
```typescript
interface AnnualBudgetSummaryProps {
  summary: AnnualBudgetSummary | null;
  year: number;
  onYearChange: (year: number) => void;
  isLoading: boolean;
}
```

Layout: 3 `SummaryCard` components (reusing the existing shared component) + year navigator.

KPI cards:
1. Total Planned (annual) — icon: `Target`, color: `"default"`
2. Spent YTD — icon: `TrendingDown`, color: `"danger"`
3. Remaining — icon: `Wallet`, color: `"success"` (or `"danger"` if overspent)

Year navigator: `← 2025 → 2026 →` placed to the right of the KPI row (or below on mobile). Uses `Button` variant `"ghost"` with `ChevronLeft` and `ChevronRight` icons. Current year displayed as plain text with `font-mono` styling.

Loading state: `animate-pulse` placeholder cards.

### 6.4 Custom Hook: `useAnnualBudget`

File: `src/hooks/useAnnualBudget.ts`

```typescript
export function useAnnualBudget(year: number) {
  // State
  const [categories, setCategories] = useState<AnnualBudgetCategory[]>([]);
  const [summary, setSummary] = useState<AnnualBudgetSummary | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  // Derived loading key pattern (matches existing hooks — React 19 compliant)
  const [loadedKey, setLoadedKey] = useState('');
  const targetKey = `${year}-${fetchKey}`;
  const isLoading = loadedKey !== targetKey;

  // Data fetch
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.annualBudget.getGrid(year),
      api.annualBudget.getSummary(year),
    ]).then(([gridResult, summaryResult]) => {
      if (cancelled) return;
      if (gridResult.data) setCategories(gridResult.data.categories);
      if (summaryResult.data) setSummary(summaryResult.data);
      setLoadedKey(targetKey);
    });
    return () => { cancelled = true; };
  }, [year, fetchKey]);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  // Optimistic upsert
  const upsertBudget = useCallback(
    async (categoryId: string, month: number, budgetAmount: number) => {
      // Optimistic update to categories state
      setCategories(prev => prev.map(cat => {
        if (cat.categoryId !== categoryId) return cat;
        return {
          ...cat,
          months: cat.months.map(m =>
            m.month === month
              ? { ...m, budgetAmount, hasOverride: true }
              : m
          ),
        };
      }));
      const result = await api.annualBudget.upsert({ categoryId, month, year, budgetAmount });
      if (result.error) {
        refetch(); // revert on failure
        toast.error(t(locale, 'failedSave'));
        return false;
      }
      toast.success(t(locale, 'budgetUpdated'));
      refetch(); // sync summary totals
      return true;
    },
    [year, refetch]
  );

  // Delete override
  const deleteBudget = useCallback(
    async (categoryId: string, month: number) => {
      // Optimistic update
      setCategories(prev => prev.map(cat => {
        if (cat.categoryId !== categoryId) return cat;
        return {
          ...cat,
          months: cat.months.map(m =>
            m.month === month
              ? { ...m, budgetAmount: null, hasOverride: false }
              : m
          ),
        };
      }));
      const result = await api.annualBudget.delete({ categoryId, month, year });
      if (result.error) {
        refetch();
        return false;
      }
      refetch();
      return true;
    },
    [year, refetch]
  );

  return { categories, summary, isLoading, upsertBudget, deleteBudget, refetch };
}
```

Note: `locale` is obtained inside the hook via `useLocale()` to pass to toast messages. The hook uses the same `loadedKey`/`targetKey` derived-loading pattern from `useBudgetData.ts` to comply with the React 19 `react-hooks/set-state-in-effect` lint rule.

### 6.5 Page Integration

File: `src/app/budget/page.tsx` (modified, not replaced)

Add a `viewMode: 'monthly' | 'annual'` local state variable. Render a tab toggle below the `PageHeader`:

```tsx
<div className="flex gap-1 rounded-lg border border-border p-1 bg-card w-fit">
  <Button
    variant={viewMode === 'monthly' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setViewMode('monthly')}
  >
    {t(locale, 'monthlyView')}
  </Button>
  <Button
    variant={viewMode === 'annual' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setViewMode('annual')}
  >
    {t(locale, 'annualView')}
  </Button>
</div>
```

When `viewMode === 'annual'`, render `<AnnualBudgetSummary>` and `<AnnualBudgetGrid>` (fetched via `useAnnualBudget(selectedYear)`).

When `viewMode === 'monthly'`, render the existing `BudgetOverview`, `BudgetCategoryCard` grid, and `UnbudgetedCategories` (unchanged).

The `selectedYear` comes from `useStore(s => s.ui.selectedYear)` — same store value already used by the monthly budget hook.

---

## 7. Relationship with the Existing Budget System

The existing monthly budget page (`/budget`, Monthly tab) continues to use `categories.budget` as the authoritative budget amount per category for the selected month. No changes to `useBudgetData.ts`, `BudgetCategoryCard.tsx`, or `BudgetOverview.tsx`.

The annual budget grid uses `monthly_budgets` entries where they exist, and falls back to `categories.budget` for display purposes (showing the default as a greyed hint in cells with no override). This fall-back is visual only in the grid — the actual budget enforcement in the monthly view still reads directly from `categories.budget`.

This means:
- If a user edits a category's monthly budget from the Monthly tab (e.g., sets Food to Rp 2.000.000), that change appears as the "inherited default" in all Annual grid cells that have no override.
- If a user sets an override for Food in June via the Annual grid (Rp 3.500.000 for a special month), the Monthly tab for June will still show Rp 2.000.000 (from `categories.budget`) unless the monthly budget page is also updated to read from `monthly_budgets` as a priority.

**Future enhancement (not in this spec):** Update `useBudgetData.ts` to prefer `monthly_budgets` entries when available. This would make the two views fully consistent. That change is deferred to avoid scope creep on this feature; the annual grid is primarily a planning tool, not a real-time tracking replacement.

---

## 8. i18n Keys

Add to both EN and ID sections of `src/lib/i18n.ts`:

| Key | EN | ID |
|-----|----|----|
| `annualBudget` | Annual Budget | Anggaran Tahunan |
| `annualPlan` | Annual Plan | Rencana Tahunan |
| `monthlyView` | Monthly | Bulanan |
| `annualView` | Annual | Tahunan |
| `budgetYear` | Budget Year | Tahun Anggaran |
| `ytdBudget` | YTD Budget | Anggaran s.d. Sekarang |
| `ytdSpent` | Spent YTD | Pengeluaran s.d. Sekarang |
| `plannedAnnual` | Total Planned | Total Direncanakan |
| `noMonthlyBudget` | No budget set | Belum ada anggaran |
| `clearOverride` | Clear override | Hapus pengaturan |
| `monthlyBreakdown` | Monthly Breakdown | Rincian Per Bulan |
| `annualTotal` | Annual Total | Total Tahunan |
| `monthlyTotal` | Monthly Total | Total Bulanan |
| `inheritedDefault` | Inherited default | Default diwarisi |
| `budgetCellHint` | Click to set budget | Klik untuk mengatur anggaran |

Notes:
- Indonesian text for `ytdBudget` ("s.d. Sekarang" = "sampai dengan sekarang" = "up to now") is standard in Indonesian financial reporting
- `plannedAnnual` maps to existing `totalBudget` key for the monthly context but gets its own key to avoid meaning collision in the annual context
- Keep `budgetCellHint` short — it appears as a tooltip on small cells

---

## 9. File Map

### New files

| Path | Purpose |
|------|---------|
| `src/server/repositories/monthly-budget.repository.ts` | DB access for `monthly_budgets` table |
| `src/server/services/annual-budget.service.ts` | Business logic: grid assembly, summary, upsert, delete |
| `src/app/api/budget/annual/route.ts` | GET (grid) + POST (upsert) + DELETE (clear override) |
| `src/app/api/budget/annual/summary/route.ts` | GET (KPI summary) |
| `src/hooks/useAnnualBudget.ts` | Client data hook for annual budget grid |
| `src/components/budget/AnnualBudgetGrid.tsx` | 12-column category×month grid |
| `src/components/budget/BudgetCell.tsx` | Individual editable grid cell |
| `src/components/budget/AnnualBudgetSummary.tsx` | 3 KPI cards + year navigator |

### Modified files

| Path | Change |
|------|--------|
| `src/server/db/client.ts` | Add `monthly_budgets` CREATE TABLE to `initializeSchema()` |
| `src/lib/types.ts` | Add `MonthlyBudget`, `AnnualBudgetCategory`, `AnnualBudgetMonth`, `AnnualBudgetSummary`, `AnnualCategoryBreakdown` |
| `src/lib/api/contracts.ts` | Add `AnnualBudgetResponse`, `AnnualBudgetSummaryResponse` |
| `src/lib/api/client.ts` | Add `annualBudget` namespace with 4 methods |
| `src/lib/api/validation.ts` | Add `upsertMonthlyBudgetSchema`, `deleteMonthlyBudgetSchema` |
| `src/lib/i18n.ts` | Add 15 new i18n keys (EN + ID) |
| `src/app/budget/page.tsx` | Add tab toggle; conditionally render annual vs monthly view |

---

## 10. Testing

Add to the Vitest test suite under `src/server/services/__tests__/annual-budget.service.test.ts`.

### Test cases

**Repository — upsert:**
- Upserting a new `(categoryId, month, year)` combination creates a new row
- Upserting an existing `(categoryId, month, year)` combination updates `budget_amount` without creating a duplicate
- `budget_amount = 0` is stored correctly (not treated as falsy/missing)

**Repository — delete:**
- Deleting an existing override removes the row
- Deleting a non-existent override is idempotent (no error)

**Service — grid assembly:**
- Categories with no `monthly_budgets` rows appear in the grid with `hasOverride: false` and `budgetAmount: null` for all months
- Categories with some overrides show correct `hasOverride: true` for those months and `false` for unset months
- `spent` values are correctly attached to the correct month from the transaction aggregation
- Only expense categories appear in the grid (income categories excluded)

**Service — summary computation:**
- `totalPlannedBudget` uses `budgetAmount` (override) when `hasOverride: true`, and `defaultBudget` when `hasOverride: false`
- `totalSpentYtd` correctly sums all expense transactions for the given year
- `remainingBudget` = `totalPlannedBudget` − `totalSpentYtd` (can be negative)

**Service — upsert:**
- Valid body creates a row and returns `MonthlyBudget`
- Invalid body (month = 13, year = 2015) returns `{ error: { code: 'VALIDATION_ERROR' } }`

**Service — delete:**
- Valid body returns `{ data: { success: true } }`
- Deleting a non-existent row returns `{ data: { success: true } }` (idempotent)

**Cascade delete:**
- Deleting a category via `deleteCategory(id)` also removes all `monthly_budgets` rows for that category (relying on DB `ON DELETE CASCADE` — verified by querying `monthly_budgets` after category delete and asserting row count = 0)

**Zod schema validation:**
- `month = 0` → invalid
- `month = 13` → invalid
- `month = 6` → valid
- `year = 2019` → invalid (below minimum 2020)
- `budgetAmount = -1` → invalid (negative budget not allowed)
- `budgetAmount = 0` → valid (explicit zero is permitted)

---

## 11. Edge Cases and Risks

### Zero vs. absent budget

A `monthly_budgets` row with `budget_amount = 0` means the user has **intentionally set a zero budget** for that month (e.g., "I will not spend on Vacation in January"). The absence of a row means "no planning decision made yet; use the default."

These two states must be visually distinct in the grid:
- No row → gray cell with dash or inherited default hint
- Row with `budget_amount = 0` → white cell with "Rp 0" displayed in the override color

The `BudgetCell.onClear()` function deletes the row (reverting to default). Setting a cell to Rp 0 via edit mode creates/updates the row with `budget_amount = 0`.

### Category deleted while having monthly budgets

The `ON DELETE CASCADE` constraint on `monthly_budgets.category_id` handles this at the DB level. No orphaned rows can exist. No additional service-level logic is required.

### Grid performance with many categories

The grid renders `N × 12` cells where N = number of expense categories. A typical user has 5–15 expense categories (60–180 cells). Even at 30 categories (360 cells), this is well within React's rendering capacity with no virtualization needed. The data fetch is a single SQL query returning at most `30 × 12 = 360` rows.

If performance issues arise in future, `react-virtuoso` (already available as a dependency pattern in the codebase) can virtualize the row axis. Defer until observed.

### Mobile layout

12 months × minimum cell width of 64px = 768px minimum grid width. On a 375px mobile viewport, this requires horizontal scroll. The `AnnualBudgetGrid` outer container must use `overflow-x-auto` with `-webkit-overflow-scrolling: touch` behavior (standard Tailwind `overflow-x-auto`). The category name column must be `position: sticky; left: 0` to remain visible while scrolling.

Sticky column in Tailwind: `sticky left-0 z-10 bg-card` on the category cell `<td>`. This requires the table to use `border-collapse: separate` (Tailwind `border-separate`) to avoid z-index conflicts with sticky positioning.

### Year navigation boundary

Minimum navigable year: 2020 (matches Zod schema minimum). Maximum navigable year: 2100 (same). The year navigator's Back button is disabled when `year <= 2020`. Future years can be planned (forward navigation is unrestricted within the max).

### Past year data

Historical years are readable and the grid shows actual spending vs planned budget. Cells in historical years that are clicked for editing should still allow edits (budget planning can be retroactively adjusted for reporting purposes). No read-only enforcement on past years in this spec.

### Concurrent edits

SQLite in WAL mode handles concurrent reads safely. The upsert operation (`ON CONFLICT DO UPDATE`) is atomic. No optimistic lock or ETag mechanism is required for this feature.

### New category with no budgets

When a new expense category is created, it has no rows in `monthly_budgets`. The grid will show all 12 cells as "no override" (gray) with the category's `defaultBudget` (from `categories.budget`, initially 0 for new categories) as the inherited hint. This is correct behavior.

---

## 12. Accessibility

- Grid `<table>` uses `<th scope="col">` for month headers and `<th scope="row">` for category name cells
- `BudgetCell` edit input has `aria-label={t(locale, 'budgetCellHint')}` and associates with the cell via `aria-describedby`
- Color coding is not the only indicator of status — `BudgetCell` also shows numeric amounts; users with color vision deficiency can still read values
- Year navigation buttons have `aria-label={t(locale, 'previousYear')}` / `aria-label={t(locale, 'nextYear')}`
- Tab order through the grid: left-to-right, top-to-bottom (natural DOM order)
- `Escape` closes edit mode and returns focus to the cell trigger

---

## 13. Implementation Order

Recommended sequence to enable incremental testing and review:

1. **DB + types** — Add `monthly_budgets` table to `client.ts`; add TypeScript types to `types.ts`
2. **Repository** — `monthly-budget.repository.ts` with upsert, findByYear, delete
3. **Service** — `annual-budget.service.ts` with grid, summary, upsert, delete functions
4. **API routes** — `api/budget/annual/route.ts` and `api/budget/annual/summary/route.ts`
5. **API client** — Add `annualBudget` to `client.ts` contracts
6. **Validation** — Add Zod schemas to `validation.ts`
7. **i18n** — Add all keys to `i18n.ts`
8. **Components** — `AnnualBudgetSummary`, `BudgetCell`, `AnnualBudgetGrid`
9. **Hook** — `useAnnualBudget.ts`
10. **Page integration** — Tab toggle on `budget/page.tsx`
11. **Tests** — Service + repository test file
12. **Preflight** — `npm run preflight` must pass before PR

---

## 14. Out-of-Scope Follow-Ups

These are acknowledged future enhancements that are explicitly excluded from this feature tier:

- **Monthly budget page respects `monthly_budgets` overrides** — update `useBudgetData.ts` to prefer `monthly_budgets` entries for the selected month when present
- **Copy previous year plan** — duplicate a year's `monthly_budgets` rows into a new year
- **Bulk fill row** — fill all 12 months of a category with the same amount in one action
- **Annual budget export** — include the 12-month grid in XLSX/PDF report exports
- **Budget alerts** — notify when YTD spending crosses a percentage of annual plan
- **Budget history chart** — line chart of monthly budget vs actual for a selected category across the year

---

*Self-review checklist:*
- [x] All three approaches described with trade-offs; recommendation clearly justified
- [x] DB schema is compatible with both SQLite and Neon Postgres
- [x] ID generation uses `nanoid()` (matches all other repositories)
- [x] `ServiceResult<T>` pattern followed
- [x] Zod schemas defined for all new endpoints
- [x] API client namespace added
- [x] All new components have typed props interfaces
- [x] No inline animation configs — uses `tapScale` from `src/lib/motion.ts`
- [x] No spreadsheet UX — sticky category column, no cell addresses, soft borders
- [x] Mobile scroll via `overflow-x-auto` with sticky first column addressed
- [x] i18n keys added for all user-facing strings (EN + ID)
- [x] Test cases cover upsert, delete, cascade, fallback logic, Zod validation
- [x] Edge cases: zero vs absent, cascade delete, year boundaries, mobile layout, concurrent edits
- [x] Non-goals explicitly listed; no scope creep
- [x] File map covers all new and modified files
- [x] Implementation order defined for incremental delivery
