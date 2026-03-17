# Design: Balance Fix, Report Module Fix, Clickable Balance Cards + Folder Restructure

**Date:** 2026-03-17
**Status:** Approved
**Approach:** A — Single API pass (extend existing endpoints)

---

## Summary

Three user-facing fixes and one structural refactor:

1. **Balance cards** — show both all-time balance (headline) and selected-month net flow (secondary) per payment method
2. **Clickable balance cards** — clicking a card navigates to `/transactions` pre-filtered by that account and the currently selected month/year
3. **Annual report fix** — rewrite `AnnualSummary.tsx` and extend the annual report API to return a richer, correctly-shaped response (fixes a crash caused by data shape mismatch)
4. **Folder restructure** — consolidate scattered components and hooks into feature-based modules under `src/features/`

---

## Architecture Overview

```
src/features/<domain>/     ← owns components + hooks + types for that domain
src/components/layout/     ← AppShell, Sidebar, Topbar, BottomNav, etc.
src/components/shared/     ← EmptyState, ConfirmDialog, Skeletons, SummaryCard, etc.
src/components/providers/  ← QueryProvider, StoreProvider
src/components/ui/         ← shadcn/ui primitives (never modified)
src/hooks/                 ← useKeyboardShortcuts.ts only (truly global)
src/server/services/       ← all server-side service files (unchanged location)
```

Data flow: Zustand (UI state: month, year, theme, locale) → hooks → REST API → service → SQLite/Postgres

---

## Section 1 — Folder Restructure

### File Moves

| From | To |
|------|----|
| `src/components/reports/*.tsx` | `src/features/reports/` |
| `src/components/transactions/*.tsx` | `src/features/transactions/` |
| `src/components/dashboard/*.tsx` | `src/features/dashboard/` |
| `src/components/export/*.tsx` | `src/features/export/` |
| `src/components/upload/*.tsx` | `src/features/upload/` |
| `src/hooks/useTransactions.ts` | `src/features/transactions/` |
| `src/hooks/useReportsData.ts` | `src/features/reports/` |
| `src/hooks/useDashboardData.ts` | `src/features/dashboard/` |
| `src/hooks/useExport.ts` | `src/features/export/` |
| `src/hooks/useUpload.ts` | `src/features/upload/` |
| `src/hooks/useBulkImport.ts` | `src/features/upload/` |
| `src/hooks/useImport.ts` | `src/features/upload/` |

### Final `src/features/` Structure

```
src/features/
├── balances/          (no change — already complete)
│   ├── AccountBalancesWidget.tsx
│   ├── BalanceCard.tsx
│   ├── BalanceGrid.tsx
│   ├── types.ts
│   └── useBalances.ts
├── dashboard/         (NEW — from src/components/dashboard/ + src/hooks/)
│   ├── BillsChecklist.tsx
│   ├── BudgetProgress.tsx
│   ├── CashFlowChart.tsx
│   ├── CategoryBreakdown.tsx
│   ├── DashboardContent.tsx
│   ├── MonthSelector.tsx
│   ├── PaymentMethods.tsx
│   ├── RecentTransactions.tsx
│   ├── SavingsGoals.tsx
│   └── useDashboardData.ts
├── export/            (NEW — from src/components/export/ + src/hooks/)
│   ├── ExportActionBar.tsx
│   ├── ExportOptions.tsx
│   ├── ExportPreview.tsx
│   ├── FormatCard.tsx
│   ├── ScopeSelector.tsx
│   └── useExport.ts
├── navigation/        (no change — already complete)
│   ├── nav-config.ts
│   ├── SidebarGroup.tsx
│   └── useNavGroups.ts
├── reports/           (MERGE — add from src/components/reports/ + src/hooks/)
│   ├── AnnualSummary.tsx
│   ├── ReportDownloader.tsx
│   ├── TrendChart.tsx
│   ├── report-generator.ts
│   ├── useReportData.ts
│   └── useReportsData.ts
├── transactions/      (MERGE — add from src/components/transactions/ + src/hooks/)
│   ├── AllTransactionsView.tsx
│   ├── BulkActionBar.tsx
│   ├── CategoryChip.tsx
│   ├── LoadMoreButton.tsx
│   ├── RecurringTransactionForm.tsx
│   ├── TransactionFilters.tsx
│   ├── TransactionForm.tsx
│   ├── TransactionSummary.tsx
│   ├── TransactionTable.tsx
│   ├── useAllTransactions.ts
│   └── useTransactions.ts
└── upload/            (NEW — from src/components/upload/ + src/hooks/)
    ├── BulkImportTabs.tsx
    ├── ConfidenceBar.tsx
    ├── DropZone.tsx
    ├── ExtractionStatusBadge.tsx
    ├── ImportPreview.tsx
    ├── ImportProgress.tsx
    ├── ImportSummary.tsx
    ├── OcrPreview.tsx
    ├── ProcessingOverlay.tsx
    ├── UploadedFileCard.tsx
    ├── useBulkImport.ts
    ├── useImport.ts
    └── useUpload.ts
```

### Final `src/components/` Structure

```
src/components/
├── layout/     (AppShell, Sidebar, Topbar, BottomNav, MobileNav, PageHeader)
├── shared/     (AnimatedCounter, ConfirmDialog, EmptyState, PageTransition,
│               ProgressRing, QuickActionButton, Skeletons, SummaryCard)
├── providers/  (QueryProvider, StoreProvider)
└── ui/         (shadcn/ui primitives — never modified)
```

### Skipped for Later

`src/components/budget/`, `src/components/folders/`, `src/components/home/`, `src/components/settings/` follow the same pattern but are not in scope for this iteration.

### Implementation Notes

- All import paths updated after each move
- No functional changes — pure relocation
- `npm run typecheck` must pass after each batch of moves

---

## Section 2 — Balance Cards

### 2a. API Change

**Endpoint:** `GET /api/payment-methods/balances?month=M&year=Y`

- `month` (0–11) and `year` (YYYY) are optional query params
- When provided, returns both all-time balance and the net flow for that specific month
- When omitted, `monthlyFlow` defaults to `0`

**Response shape:**

```typescript
type BalanceItem = {
  paymentMethod: string
  balance: number       // all-time income − expense
  monthlyFlow: number   // income − expense for the given month/year
}
```

### 2b. Service Change — `balance.service.ts`

`getBalances(month?: number, year?: number): ServiceResult<BalanceItem[]>`

Two SQL queries (or one with conditional aggregation):
1. All-time: existing `SUM(CASE WHEN type='income' ...) - SUM(CASE WHEN type='expense' ...)` grouped by `payment_method`
2. Monthly: same aggregation but `WHERE CAST(strftime('%m', date) AS INTEGER) - 1 = ? AND CAST(strftime('%Y', date) AS INTEGER) = ?`

Results are merged by `paymentMethod`.

### 2c. Hook Change — `useBalances.ts`

Reads `selectedMonth` and `selectedYear` from Zustand store and passes them to the API call:

```typescript
const month = useStore(s => s.ui.selectedMonth)
const year = useStore(s => s.ui.selectedYear)
// fetch /api/payment-methods/balances?month={month}&year={year}
```

### 2d. Component Changes

**`BalanceCard.tsx`**
- Existing headline: all-time `balance` in JetBrains Mono (unchanged)
- New secondary line: `monthlyFlow` formatted as currency with `↑` prefix (emerald) if positive, `↓` prefix (red) if negative, `—` if zero
- New `onClick?: () => void` prop
- `whileTap={tapScale}` already present — no animation changes needed

**`BalanceGrid.tsx`**
- Passes `onClick` callback down to each `BalanceCard`

**`AccountBalancesWidget.tsx`**
- Uses `useRouter` and `useStore` to construct the navigation URL
- `onClick` for card: `router.push('/transactions?paymentMethod=NAME&month=M&year=Y')`

### 2e. Transactions Page — URL Param Seeding

**`useAllTransactions.ts`** (or a new `useTransactionFilters.ts` initializer):
- On mount, reads `searchParams.get('paymentMethod')`, `searchParams.get('month')`, `searchParams.get('year')`
- Seeds initial filter state if params are present
- After initial read, filter state is owned locally (URL not kept in sync after user changes filters)

---

## Section 3 — Annual Report Fix

### 3a. Updated `AnnualReportData` Type

```typescript
interface AnnualReportData {
  year: number
  totalIncome: number
  totalExpense: number
  totalNet: number
  transactionCount: number
  savingsRate: number                    // totalNet / totalIncome × 100, clamped to 0–100; 0 if totalIncome = 0
  topExpenseCategories: {
    category: string
    amount: number
  }[]
  monthlyBreakdown: {
    month: number                        // 0–11
    monthKey: string                     // e.g. "2026-03"
    income: number
    expense: number
    net: number
  }[]
  previousYear: {
    totalIncome: number
    totalExpense: number
    totalNet: number
  } | null                               // null if no data exists for year - 1
}
```

### 3b. Service Change — `report.service.ts`

`getAnnualReportData(year: number): ServiceResult<AnnualReportData>`

New queries added:
- `transactionCount`: `SELECT COUNT(*) FROM transactions WHERE year = ?`
- `topExpenseCategories`: `SELECT category, SUM(amount) AS amount FROM transactions WHERE year = ? AND type = 'expense' GROUP BY category ORDER BY amount DESC LIMIT 5`
- `previousYear`: same aggregation query as current year but for `year - 1`; returns `null` if no rows
- `savingsRate`: computed in service as `totalNet > 0 && totalIncome > 0 ? Math.min(100, (totalNet / totalIncome) * 100) : 0`
- `monthKey` added to `monthlyBreakdown` rows: `String(year) + '-' + String(month + 1).padStart(2, '0')`

### 3c. API Route Change — `GET /api/reports/annual?year=YYYY`

Response flattened from `{ data: { report: AnnualReportData } }` to `{ data: AnnualReportData }`.

This fixes the root crash: `AnnualSummary.tsx` was reading `json.data` and getting `{ report: ... }` instead of the actual data.

### 3d. Component Rewrite — `AnnualSummary.tsx`

Complete rewrite to consume `AnnualReportData` correctly. Sections:

1. **Stats row** — income, expense, net, savings rate %, transaction count (5 `SummaryCard` components)
2. **YoY comparison strip** — shown only when `previousYear !== null`; displays income/expense/net delta with ↑/↓ and % change
3. **Monthly bar chart** — `TrendChart` receiving corrected `monthlyBreakdown` array
4. **Top expense categories** — ranked list with amount and proportion bar

**`TrendChart.tsx`** — updated props interface to accept corrected `monthlyBreakdown` shape (adds `monthKey`, renames `net` field if needed).

### 3e. Error Handling

- If `totalIncome === 0`, `savingsRate` returns `0` (no divide-by-zero)
- If `previousYear` query returns no rows, service returns `previousYear: null` (YoY section hidden)
- Component retains existing loading skeleton and empty state

---

## Section 4 — Testing

All new service logic is covered with tests written first (TDD red → green).

### New Tests

**`balance.service.test.ts`** (additions):
- Returns `monthlyFlow: 0` when no transactions exist for that month
- Returns correct `monthlyFlow` for income-only month
- Returns correct `monthlyFlow` for expense-only month
- `monthlyFlow` is independent of all-time `balance`

**`report.service.test.ts`** (additions):
- `transactionCount` matches number of created transactions
- `savingsRate` is correctly calculated (net / income × 100)
- `savingsRate` is `0` when `totalIncome === 0`
- `topExpenseCategories` contains only expense transactions, sorted by amount descending
- `previousYear` is `null` when no prior-year data exists
- `previousYear` returns correct totals when data exists
- `monthlyBreakdown` entries include `monthKey` in `YYYY-MM` format

### Regression

All 312 existing tests must pass after each change. `npm run test` is run after every logical change batch.

---

## Out of Scope

- `src/components/budget/`, `src/components/folders/`, `src/components/home/`, `src/components/settings/` — folder restructure deferred to a future pass
- Monthly report format changes — existing `generateMonthlyReport()` unchanged
- Bills and savings goals Zustand → API migration — separate future initiative
- Upload and export page API wiring — separate future initiative
