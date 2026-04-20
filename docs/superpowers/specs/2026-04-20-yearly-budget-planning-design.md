---
feature: Yearly Budget Planning
type: spec
date: 2026-04-20
status: approved
tier: 3
---

# Feature — Yearly Budget Planning

**Date:** 2026-04-20
**Status:** Approved
**Branch:** feature/yearly-budget-planning

---

## 1. Overview

### The Problem

The current budget system stores one `budget REAL` value per category on the `categories` table. This works for flat recurring expenses but breaks for irregular annual spending:

| Category | Pattern | Fits current system? |
|----------|---------|---------------------|
| Vacation | June only — Rp 10.000.000 | No |
| Insurance | January only — Rp 5.000.000 | No |
| School fees | July & December — Rp 3.000.000 each | No |
| Lebaran gifts | March/April — Rp 2.500.000 | No |
| Groceries | Every month — Rp 1.800.000 | Yes |

Setting Vacation to Rp 10M creates a Rp 10M "gap" every other month. There is no way to say "Rp 0 in January–May, Rp 10M in June, Rp 0 for the rest."

### What This Feature Adds

- A `monthly_budgets` table: one row per `(category, month, year)`
- A 12-column planning grid on the `/budget` page (Annual tab)
- Per-cell editing via click → input → Save/Clear in edit mode
- Color-coded cells for all cells with a non-zero effective budget
- KPI cards (Total Planned, Spent YTD, Remaining) computed client-side
- Year navigation via the global Zustand store (`setYear`) — consistent with the rest of the app
- Monthly budget page updated to prefer `monthly_budgets` overrides — no more inconsistency between views

---

## 2. Goals

1. Allow per-month budget amounts per category per calendar year.
2. Support explicit zero-budget months (distinct from "no planning decision made").
3. Show a full-year at-a-glance grid with column totals and row totals.
4. Show 3 KPI cards computed client-side from grid data — no second API call.
5. Make the monthly budget page consistent: `budget.service.ts` prefers `monthly_budgets` for the selected month when a row exists.
6. Year navigation uses `useStore(s => s.ui.selectedYear)` / `setYear()` — global, affects the whole app.
7. Horizontally scrollable grid on mobile with sticky category column.
8. Full i18n (EN/ID) for all new strings.

---

## 3. Non-Goals

- No multi-year planning (one year at a time)
- No income category budgets (expense categories only)
- No copy-year / bulk fill row in this tier
- No annual grid export (export feature is separate)
- No budget alerts triggered by annual thresholds
- No budget locking or approval workflows

---

## 4. Data Model

### 4.1 Database Schema

Added to `initializeSchema()` in `src/server/db/client.ts`:

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

- `month` is 1-based (1 = January, 12 = December)
- A row with `budget_amount = 0` = intentional zero (user planned no spending)
- No row = no planning decision — inherit `categories.budget`
- `ON DELETE CASCADE` on `category_id` handles cleanup automatically
- `DOUBLE PRECISION` matches existing conventions (`transactions.amount`, `categories.budget`)
- No changes to any existing table

### 4.2 TypeScript Types

Added to `src/lib/types.ts`:

```typescript
export interface MonthlyBudget {
  id: string;
  categoryId: string;
  month: number;        // 1–12
  year: number;
  budgetAmount: number;
  createdAt?: string;
}

export interface AnnualBudgetMonth {
  month: number;
  budgetAmount: number | null;  // null = no override; 0 = explicit zero
  spent: number;
  hasOverride: boolean;
}

export interface AnnualBudgetCategory {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  defaultBudget: number;        // from categories.budget (fallback)
  months: AnnualBudgetMonth[];  // 12 elements, index 0 = January
}

// Computed client-side — not returned by any API endpoint
export interface AnnualBudgetSummary {
  year: number;
  totalPlannedBudget: number;
  totalSpentYtd: number;
  remainingBudget: number;      // can be negative
}
```

`effectiveBudget` for a cell = `hasOverride ? (budgetAmount ?? 0) : defaultBudget`.
Used for color coding, column/row totals, and KPI computation — all client-side.

### 4.3 Zod Validation Schemas

Added to `src/lib/api/validation.ts`:

```typescript
export const upsertMonthlyBudgetSchema = z.object({
  categoryId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  budgetAmount: z.number().min(0),  // 0 is valid — explicit zero
});

export const deleteMonthlyBudgetSchema = z.object({
  categoryId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});
```

---

## 5. Backend

### 5.1 Repository — `src/server/repositories/monthly-budget.repository.ts`

```typescript
interface MonthlyBudgetRow {
  id: string; category_id: string; month: number;
  year: number; budget_amount: number; created_at: string;
}
```

| Method | Purpose |
|--------|---------|
| `findByYear(year)` | All rows for a year — used to build the grid |
| `findByCategoryAndYear(categoryId, year)` | Up to 12 rows for one category |
| `upsert(data)` | `INSERT ... ON CONFLICT DO UPDATE SET budget_amount = excluded.budget_amount` |
| `delete(categoryId, month, year)` | Remove override — idempotent, no error if missing |
| `deleteByCategoryId(categoryId)` | Explicit cleanup (DB cascade also covers it) |

The upsert omits `created_at` — the column default handles it for both SQLite and Neon.

### 5.2 Service — `src/server/services/annual-budget.service.ts`

Follows the `ServiceResult<T>` pattern.

**`getAnnualBudgetGrid(year)`** → `ServiceResult<AnnualBudgetCategory[]>`

1. Fetch all expense categories
2. `findByYear(year)` — all monthly budget rows for the year
3. Fetch spending per `(category_id, month)`:
   ```sql
   SELECT category_id,
          CAST(strftime('%m', date) AS INTEGER) AS month,
          SUM(amount) AS spent
   FROM transactions
   WHERE type = 'expense' AND strftime('%Y', date) = ?
   GROUP BY category_id, month
   ```
4. Merge: for each expense category, build 12 `AnnualBudgetMonth` entries. Override row → `hasOverride: true`. No row → `hasOverride: false, budgetAmount: null`. Attach `spent` (0 if no transactions).

**`upsertMonthlyBudget(body)`** → `ServiceResult<MonthlyBudget>`
Validates with `upsertMonthlyBudgetSchema`, calls repository upsert.

**`deleteMonthlyBudget(body)`** → `ServiceResult<{ success: boolean }>`
Validates with `deleteMonthlyBudgetSchema`, calls repository delete. Returns `{ success: true }` whether or not the row existed.

### 5.3 Monthly View Fix — `src/server/services/budget.service.ts` (modified)

Replace the plain category SELECT with a LEFT JOIN to prefer `monthly_budgets` for the requested month:

```sql
SELECT
  c.id, c.name, c.type, c.color, c.icon,
  COALESCE(mb.budget_amount, c.budget) AS effective_budget
FROM categories c
LEFT JOIN monthly_budgets mb
  ON mb.category_id = c.id
  AND mb.month = ?
  AND mb.year = ?
WHERE c.type = 'expense'
```

Map `effective_budget` as the category's budget for that month. No change to the API contract, hook, or components — same data shape, more accurate values.

### 5.4 API Route — `src/app/api/budget/annual/route.ts`

Single file, three handlers. No separate summary endpoint — summary is computed client-side.

**`GET ?year=YYYY`**
- Validates `year` param (integer, 2020–2100); returns `400` if missing or out of range
- Returns `200 { data: { categories: AnnualBudgetCategory[] } }` or `500`

**`POST`** — body: `{ categoryId, month, year, budgetAmount }`
- Returns `201 { data: MonthlyBudget }` or `400`/`500`

**`DELETE`** — body: `{ categoryId, month, year }`
- Returns `200 { data: { success: true } }` or `400`/`500`

### 5.5 API Client — `src/lib/api/client.ts` (addition)

```typescript
annualBudget: {
  getGrid: (year: number) =>
    fetchApi<{ categories: AnnualBudgetCategory[] }>(`/budget/annual?year=${year}`),
  upsert: (body: { categoryId: string; month: number; year: number; budgetAmount: number }) =>
    fetchApi<MonthlyBudget>('/budget/annual', { method: 'POST', body: JSON.stringify(body) }),
  delete: (body: { categoryId: string; month: number; year: number }) =>
    fetchApi<{ success: boolean }>('/budget/annual', { method: 'DELETE', body: JSON.stringify(body) }),
},
```

---

## 6. Frontend

### 6.1 Hook — `src/hooks/useAnnualBudget.ts`

Single fetch. Summary computed via `useMemo`. Optimistic updates on upsert and delete — `refetch()` only called on error to revert.

```typescript
export function useAnnualBudget(year: number) {
  const locale = useLocale();
  const [categories, setCategories] = useState<AnnualBudgetCategory[]>([]);
  const [fetchKey, setFetchKey] = useState(0);

  // React 19 compliant derived-loading pattern
  const [loadedKey, setLoadedKey] = useState('');
  const targetKey = `${year}-${fetchKey}`;
  const isLoading = loadedKey !== targetKey;

  useEffect(() => {
    let cancelled = false;
    api.annualBudget.getGrid(year).then((result) => {
      if (cancelled) return;
      if (result.data) setCategories(result.data.categories);
      setLoadedKey(targetKey);
    });
    return () => { cancelled = true; };
  }, [year, fetchKey]);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  // Client-side summary — recomputes instantly on optimistic updates
  const summary: AnnualBudgetSummary = useMemo(() => {
    let totalPlanned = 0;
    let totalSpent = 0;
    for (const cat of categories) {
      for (const m of cat.months) {
        const effective = m.hasOverride ? (m.budgetAmount ?? 0) : cat.defaultBudget;
        totalPlanned += effective;
        totalSpent += m.spent;
      }
    }
    return { year, totalPlannedBudget: totalPlanned, totalSpentYtd: totalSpent,
             remainingBudget: totalPlanned - totalSpent };
  }, [categories, year]);

  const upsertBudget = useCallback(
    async (categoryId: string, month: number, budgetAmount: number) => {
      setCategories((prev) => prev.map((cat) =>
        cat.categoryId !== categoryId ? cat : {
          ...cat,
          months: cat.months.map((m) =>
            m.month !== month ? m : { ...m, budgetAmount, hasOverride: true }
          ),
        }
      ));
      const result = await api.annualBudget.upsert({ categoryId, month, year, budgetAmount });
      if (result.error) {
        refetch();
        toast.error(t(locale, 'failedSave'));
        return false;
      }
      toast.success(t(locale, 'budgetUpdated'));
      return true;
    },
    [year, locale, refetch]
  );

  const deleteBudget = useCallback(
    async (categoryId: string, month: number) => {
      setCategories((prev) => prev.map((cat) =>
        cat.categoryId !== categoryId ? cat : {
          ...cat,
          months: cat.months.map((m) =>
            m.month !== month ? m : { ...m, budgetAmount: null, hasOverride: false }
          ),
        }
      ));
      const result = await api.annualBudget.delete({ categoryId, month, year });
      if (result.error) { refetch(); return false; }
      return true;
    },
    [year, refetch]
  );

  return { categories, summary, isLoading, upsertBudget, deleteBudget, refetch };
}
```

### 6.2 Components

#### `BudgetCell` — `src/components/budget/BudgetCell.tsx`

```typescript
interface BudgetCellProps {
  month: number;
  budgetAmount: number | null;
  spent: number;
  hasOverride: boolean;
  defaultBudget: number;
  isPast: boolean;
  isCurrent: boolean;
  onSave: (amount: number) => Promise<void>;
  onClear: () => Promise<void>;
}
```

**Display mode:**
- `effectiveBudget = hasOverride ? (budgetAmount ?? 0) : defaultBudget`
- If `hasOverride`: bold formatted amount
- If `!hasOverride && effectiveBudget > 0`: italic formatted amount with "inherited" label
- If `effectiveBudget === 0`: dash `—`, dashed border, muted
- Thin 3px fill bar at cell bottom: `spent / effectiveBudget` %, capped at 100% width
- Color coding (border + fill bar) when `effectiveBudget > 0`: green < 80%, amber 80–99%, red ≥ 100%
- `opacity-75` on past month cells

**Edit mode** (click anywhere on cell):
- Input pre-filled with current value via `formatCurrencyInput`
- Enter or blur → save; Escape → cancel
- **Save** button (green) + **Clear** button (red, only shown when `hasOverride`)
- Saving Rp 0 stores an explicit zero override
- Clear removes the override row — cell reverts to inherited default

#### `AnnualBudgetGrid` — `src/components/budget/AnnualBudgetGrid.tsx`

```typescript
interface AnnualBudgetGridProps {
  categories: AnnualBudgetCategory[];
  year: number;
  onUpsert: (categoryId: string, month: number, budgetAmount: number) => Promise<void>;
  onDelete: (categoryId: string, month: number) => Promise<void>;
  isLoading: boolean;
}
```

- `<table>` with `border-separate` (required for sticky column z-index)
- `overflow-x-auto` wrapper for mobile horizontal scroll
- Category column: `sticky left-0 z-10 bg-card min-w-[130px]`
- Current month column: `border-l-2 border-blue-500` on each `<td>`
- Header: `<th scope="col">` for months; `<th scope="row">` for category names
- Footer row: monthly totals (sum of `effectiveBudget` per column)
- Row-end Σ column: annual total per category
- Skeleton: `animate-pulse` cells when `isLoading` (5 rows × 14 columns)
- No column letters, no row numbers, no formula bar — no spreadsheet UX

#### `AnnualBudgetSummary` — `src/components/budget/AnnualBudgetSummary.tsx`

```typescript
interface AnnualBudgetSummaryProps {
  summary: AnnualBudgetSummary;
  year: number;
  onYearChange: (year: number) => void;
  isLoading: boolean;
}
```

- 3 `SummaryCard` components: Total Planned (`Target`), Spent YTD (`TrendingDown`), Remaining (`Wallet`)
- Remaining card: `"danger"` color variant when `remainingBudget < 0`
- Year navigator: ghost `Button` + `ChevronLeft`/`ChevronRight`, right-aligned
  - Back button disabled when `year <= 2020`
  - `aria-label={t(locale, 'previousYear')}` / `aria-label={t(locale, 'nextYear')}`
  - Calls `onYearChange` → `setYear()` in the page

### 6.3 Page Integration — `src/app/budget/page.tsx`

Add `viewMode: 'monthly' | 'annual'` local state (not persisted; always starts on Monthly).

Tab toggle placed below `PageHeader`, above the action bar:
```tsx
<div className="flex gap-1 rounded-lg border border-border p-1 bg-card w-fit">
  <Button variant={viewMode === 'monthly' ? 'default' : 'ghost'} size="sm"
    onClick={() => setViewMode('monthly')}>
    {t(locale, 'monthlyView')}
  </Button>
  <Button variant={viewMode === 'annual' ? 'default' : 'ghost'} size="sm"
    onClick={() => setViewMode('annual')}>
    {t(locale, 'annualView')}
  </Button>
</div>
```

`PageHeader` description:
```tsx
description={viewMode === 'monthly' ? `${MONTH_NAMES[month]} ${year}` : String(year)}
```

**Monthly view**: existing content unchanged — `BudgetOverview`, `BudgetCategoryCard` grid, `UnbudgetedCategories`, action bar, all dialogs/sheets.

**Annual view**: `<AnnualBudgetSummary>` + `<AnnualBudgetGrid>` via `useAnnualBudget(year)`. Action bar hidden (template/suggestion actions are Monthly-specific). Empty state (`<EmptyState>` with `Target` icon) when no expense categories exist.

---

## 7. Cell Visual Language

| State | Border | Amount text | Fill bar |
|-------|--------|-------------|----------|
| No override, `defaultBudget = 0` | Dashed, muted | `—` | None |
| No override, `defaultBudget > 0`, low spend | Solid, color-coded | Italic, muted | Green |
| No override, `defaultBudget > 0`, near limit | Solid, amber | Italic, muted | Amber |
| Override set, healthy | Solid, green | Bold | Green |
| Override set, near limit | Solid, amber | Bold | Amber |
| Override set, over budget | Solid, red | Bold | Red (full width) |
| Explicit zero override | Solid, muted | `Rp 0`, muted | None |
| Edit mode | Blue ring | Input field | — |

Past months: `opacity-75`. Current month column: `border-l-2 border-blue-500`.

---

## 8. Accessibility

- `<th scope="col">` for month headers; `<th scope="row">` for category name cells
- Edit input: `aria-label={t(locale, 'budgetCellHint')}`
- Year nav buttons: `aria-label={t(locale, 'previousYear')}` / `aria-label={t(locale, 'nextYear')}`
- Color coding is not the sole indicator — numeric amounts always visible
- Tab order: left-to-right, top-to-bottom (natural DOM order)
- Escape returns focus to the cell trigger

---

## 9. i18n Keys

Added to both EN and ID in `src/lib/i18n.ts`:

| Key | EN | ID |
|-----|----|----|
| `annualBudget` | Annual Budget | Anggaran Tahunan |
| `monthlyView` | Monthly | Bulanan |
| `annualView` | Annual | Tahunan |
| `ytdSpent` | Spent YTD | Pengeluaran s.d. Sekarang |
| `plannedAnnual` | Total Planned | Total Direncanakan |
| `clearOverride` | Clear | Hapus |
| `annualTotal` | Annual Total | Total Tahunan |
| `monthlyTotal` | Monthly Total | Total Bulanan |
| `inheritedDefault` | Inherited | Default |
| `budgetCellHint` | Click to set | Klik untuk mengatur |
| `budgetUpdated` | Budget updated | Anggaran diperbarui |
| `previousYear` | Previous year | Tahun sebelumnya |
| `nextYear` | Next year | Tahun berikutnya |

---

## 10. Testing

### New: `src/server/services/__tests__/annual-budget.service.test.ts`

**Repository — upsert:**
- New `(categoryId, month, year)` creates a row
- Same key upserts without duplicate
- `budget_amount = 0` stored correctly

**Repository — delete:**
- Existing override removed; non-existent override is idempotent

**Service — grid:**
- Categories with no rows: all 12 months `hasOverride: false, budgetAmount: null`
- Partial overrides: correct `hasOverride` per month
- `spent` attaches to correct month
- Income categories excluded

**Service — upsert/delete:**
- Valid body returns correct shape
- Invalid body (`month=13`, `year=2019`, `budgetAmount=-1`) → `VALIDATION_ERROR`
- Delete always returns `{ success: true }`

**Cascade:**
- Delete category → query `monthly_budgets` → row count = 0

**Zod schemas:**
- `month=0` invalid; `month=6` valid; `month=13` invalid
- `year=2019` invalid; `year=2026` valid
- `budgetAmount=-1` invalid; `budgetAmount=0` valid

### Modified: `src/server/services/__tests__/budget.service.test.ts`

- `monthly_budgets` row exists for `(categoryId, month, year)` → `getBudgetData` returns override amount
- No row exists → falls back to `categories.budget`

---

## 11. Edge Cases

**Zero vs absent:** `budget_amount = 0` row = intentional zero. No row = inherit default. Visually distinct: "Rp 0" in muted style vs italic inherited amount.

**Category deleted:** `ON DELETE CASCADE` removes all `monthly_budgets` rows. No orphans possible.

**Grid performance:** Typical user has 5–15 expense categories (60–180 cells). No virtualization needed.

**Mobile:** `overflow-x-auto` wrapper + `sticky left-0` category column. `border-separate` required for sticky z-index to work.

**Year navigation boundary:** Back button disabled at `year <= 2020`. Forward unrestricted (max 2100 per Zod schema but no nav cap).

**Past years:** Grid shows history (actual spend vs plan). Cells in past years remain editable for retroactive planning adjustments.

**New category:** All 12 cells show as "no override" — gray if `defaultBudget = 0`, or italic inherited if `defaultBudget > 0`. Correct without any migration.

---

## 12. File Map

### New files

| Path | Purpose |
|------|---------|
| `src/server/repositories/monthly-budget.repository.ts` | DB access for `monthly_budgets` |
| `src/server/services/annual-budget.service.ts` | Grid assembly, upsert, delete |
| `src/app/api/budget/annual/route.ts` | GET + POST + DELETE |
| `src/hooks/useAnnualBudget.ts` | Data hook + client-side summary |
| `src/components/budget/AnnualBudgetGrid.tsx` | 12-column grid table |
| `src/components/budget/BudgetCell.tsx` | Editable cell with fill bar |
| `src/components/budget/AnnualBudgetSummary.tsx` | KPI cards + year navigator |

### Modified files

| Path | Change |
|------|--------|
| `src/server/db/client.ts` | Add `monthly_budgets` table to `initializeSchema()` |
| `src/server/services/budget.service.ts` | LEFT JOIN `monthly_budgets` for `effective_budget` |
| `src/lib/types.ts` | Add `MonthlyBudget`, `AnnualBudgetMonth`, `AnnualBudgetCategory`, `AnnualBudgetSummary` |
| `src/lib/api/client.ts` | Add `annualBudget` namespace (3 methods) |
| `src/lib/api/validation.ts` | Add `upsertMonthlyBudgetSchema`, `deleteMonthlyBudgetSchema` |
| `src/lib/i18n.ts` | Add 13 i18n keys |
| `src/app/budget/page.tsx` | Tab toggle, Annual view render, PageHeader description |
| `src/server/services/__tests__/budget.service.test.ts` | Monthly fix test cases |

---

## 13. Implementation Order

1. DB schema — add `monthly_budgets` table
2. TypeScript types — 4 new interfaces
3. Zod schemas — 2 new schemas
4. Repository — `monthly-budget.repository.ts`
5. Annual budget service — `annual-budget.service.ts`
6. Monthly view fix — update `budget.service.ts` LEFT JOIN
7. API route — `api/budget/annual/route.ts`
8. API client — add `annualBudget` namespace
9. i18n — 13 new keys
10. Components — `AnnualBudgetSummary`, `BudgetCell`, `AnnualBudgetGrid`
11. Hook — `useAnnualBudget.ts`
12. Page integration — tab toggle on `budget/page.tsx`
13. Tests — annual service + budget service monthly-fix cases
14. Preflight — `npm run preflight` must pass before PR

---

## 14. Out-of-Scope Follow-Ups

- **Copy previous year plan** — duplicate a year's `monthly_budgets` rows into a new year
- **Bulk fill row** — fill all 12 months of a category with one amount
- **Annual budget export** — include the 12-month grid in XLSX/PDF reports
- **Budget alerts** — notify when YTD spending crosses a % of annual plan
- **Budget history chart** — monthly budget vs actual line chart per category

---

*Self-review:*
- [x] No placeholders or TBDs
- [x] DB schema compatible with both SQLite and Neon Postgres
- [x] `DOUBLE PRECISION` matches existing codebase convention
- [x] `ServiceResult<T>` pattern followed throughout
- [x] Single API endpoint — no separate summary route
- [x] Summary computed client-side via `useMemo`
- [x] React 19 lint rule: `loadedKey`/`targetKey` derived-loading pattern
- [x] Optimistic updates revert on error via `refetch()`
- [x] Clear override lives in edit mode — no right-click / long-press
- [x] Color coding applies to all non-zero effective budget cells (not just overrides)
- [x] Thin fill bar (not arc ring) — consistent with `BudgetCategoryCard`
- [x] Year navigation uses global store `setYear()` — consistent app behavior
- [x] Monthly view fix included — no inconsistency between Annual grid and Monthly tab
- [x] Mobile: `overflow-x-auto` + `sticky left-0` + `border-separate`
- [x] Accessibility: `scope` attrs, `aria-label` on nav buttons, non-color indicators
- [x] i18n: 13 keys with EN + ID entries
- [x] All new components have typed props interfaces
- [x] No inline animation configs — uses existing presets from `src/lib/motion.ts`
- [x] No spreadsheet UX: no column letters, no row numbers, no formula bar
- [x] Edge cases: zero vs absent, cascade delete, year boundaries, past years, new categories
- [x] Implementation order defined for incremental delivery
- [x] Non-goals explicitly listed; no scope creep
