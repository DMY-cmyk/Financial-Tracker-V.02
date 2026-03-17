# Design: Balance Fix, Report Module Fix, Clickable Balance Cards + Folder Restructure

**Date:** 2026-03-17
**Status:** Approved
**Approach:** A — Single API pass (extend existing endpoints)

---

## Summary

Three user-facing fixes and one structural refactor:

1. **Balance cards** — show both all-time balance (headline) and selected-month net flow (secondary) per payment method
2. **Clickable balance cards** — clicking a card navigates to `/transactions` pre-filtered by that account and the currently selected month/year
3. **Annual report fix** — extend the service to return the richer shape `AnnualSummary.tsx` already expects, and flatten the API response wrapper that currently causes a crash
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
│   ├── types.ts
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

### `src/hooks/` After Restructure

```
src/hooks/
└── useKeyboardShortcuts.ts   (only truly global hook — stays here)
```

### Implementation Notes

- All import paths updated after each move; `npm run typecheck` must pass after each batch
- No functional changes during the restructure — pure relocation
- `src/features/reports/types.ts` currently re-exports from `@/lib/api/contracts` and `src/features/balances/types.ts` does the same — both files stay as re-export barrels and need no content change (the contracts file is the single source of truth)

### Skipped for Later

`src/components/budget/`, `src/components/folders/`, `src/components/home/`, `src/components/settings/` follow the same pattern but are not in scope for this iteration.

---

## Section 2 — Balance Cards

### Root Cause

`useBalances.ts` calls `GET /api/payment-methods/balances` with no params. The service returns all-time income/expense per payment method. There is no month-scoped figure. The `BalanceCard` component has no `onClick` handler.

### 2a. `contracts.ts` — Extend `PaymentMethodBalance`

Add `monthlyFlow` to the existing `PaymentMethodBalance` interface (do not create a new type):

```typescript
export interface PaymentMethodBalance {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'ewallet';
  icon: string;
  income: number;
  expense: number;
  balance: number;
  monthlyFlow: number;  // ← NEW: income − expense for the queried month/year; 0 when no params given
}
```

`BalanceListResponse` is unchanged (it already wraps `PaymentMethodBalance[]`).

### 2b. `api/client.ts` — Update `balances.list()`

Add optional `month` and `year` params:

```typescript
balances: {
  list(params?: { month?: number; year?: number }) {
    const query = new URLSearchParams();
    if (params?.month !== undefined) query.set('month', String(params.month));
    if (params?.year !== undefined) query.set('year', String(params.year));
    const qs = query.toString();
    return fetchApi<BalanceListResponse>(`/payment-methods/balances${qs ? `?${qs}` : ''}`);
  },
},
```

### 2c. `balance.service.ts` — Add Monthly Flow Query

`listPaymentMethodBalances(month?: number, year?: number): ServiceResult<PaymentMethodBalance[]>`

The service runs two SQL queries and merges by `pm.name`:

**Query 1 (unchanged):** All-time `income`, `expense`, `balance` per payment method:
```sql
SELECT pm.id, pm.name, pm.type, pm.icon,
       COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END), 0) AS expense,
       COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount
                         WHEN t.type='expense' THEN -t.amount ELSE 0 END), 0) AS balance
FROM payment_methods pm
LEFT JOIN transactions t ON t.payment_method = pm.name
GROUP BY pm.id
```

**Query 2 (new, conditional):** Monthly net flow — only run when `month` and `year` are provided:
```sql
SELECT t.payment_method AS name,
       COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount
                         WHEN t.type='expense' THEN -t.amount ELSE 0 END), 0) AS monthlyFlow
FROM transactions t
WHERE CAST(SUBSTR(t.date, 6, 2) AS INTEGER) - 1 = ?   -- month (0-based)
  AND CAST(SUBSTR(t.date, 1, 4) AS INTEGER) = ?        -- year
GROUP BY t.payment_method
```

Merge: for each row from Query 1, look up `monthlyFlow` from Query 2 by `name`; default to `0` if not found.

When `month`/`year` are absent, `monthlyFlow` is `0` for all rows.

### 2d. `GET /api/payment-methods/balances` Route

Read optional `month` and `year` from `searchParams`, validate (0–11 / 2000–2100), pass to service:

```typescript
const month = searchParams.get('month') !== null ? parseInt(...) : undefined;
const year  = searchParams.get('year')  !== null ? parseInt(...) : undefined;
const result = await listPaymentMethodBalances(month, year);
```

### 2e. `useBalances.ts` — Add Month/Year to Query

```typescript
const month = useStore(s => s.ui.selectedMonth);
const year  = useStore(s => s.ui.selectedYear);

const { data, isLoading } = useQuery({
  queryKey: ['payment-method-balances', month, year],   // ← include month+year so React Query refetches on change
  queryFn: () => api.balances.list({ month, year }),
  enabled: initialized,
  staleTime: 30_000,
});
```

### 2f. `BalanceCard.tsx` — Monthly Flow Secondary Line + Click

Add `monthlyFlow` display and `onClick` prop:

```typescript
interface BalanceCardProps {
  balance: PaymentMethodBalance;
  locale: 'en' | 'id';
  onClick?: () => void;    // ← NEW
}
```

Below the existing income/expense breakdown, add a secondary line:

```tsx
{balance.monthlyFlow !== 0 && (
  <p className={cn(
    'font-mono text-xs mt-1',
    balance.monthlyFlow > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
  )}>
    {balance.monthlyFlow > 0 ? '↑' : '↓'} {formatCurrency(Math.abs(balance.monthlyFlow))} {t(locale, 'thisMonth')}
  </p>
)}
```

Make the card clickable with keyboard accessibility:

```tsx
<motion.div
  variants={staggerGridItem}
  whileTap={onClick ? tapScale : undefined}
  onClick={onClick}
  role={onClick ? 'button' : undefined}
  tabIndex={onClick ? 0 : undefined}
  onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
  className={cn(
    'bg-card border-border rounded-2xl border p-4 shadow-sm',
    onClick && 'cursor-pointer hover:border-primary/50 transition-colors'
  )}
>
```

**i18n:** Add `thisMonth` key to `src/lib/i18n.ts`:
- EN: `'This month'`
- ID: `'Bulan ini'`

### 2g. `BalanceGrid.tsx` and `AccountBalancesWidget.tsx` — Wire Up Navigation

**`BalanceGrid.tsx`:** Accept and pass through `onCardClick`:
```typescript
interface BalanceGridProps {
  balances: PaymentMethodBalance[];
  locale: 'en' | 'id';
  onCardClick?: (paymentMethod: string) => void;
}
```

**`AccountBalancesWidget.tsx`:** Provide `onCardClick` using router + store:
```typescript
const router = useRouter();
const month  = useStore(s => s.ui.selectedMonth);
const year   = useStore(s => s.ui.selectedYear);

const handleCardClick = (paymentMethod: string) => {
  router.push(
    `/transactions?paymentMethod=${encodeURIComponent(paymentMethod)}&month=${month}&year=${year}`
  );
};
```

### 2h. Transactions Page — URL Param Seeding

The transactions page (`src/app/transactions/page.tsx`) is a Next.js page component. It reads `searchParams` (passed as a prop in App Router) and passes initial filter values to the client component that wraps `useAllTransactions`:

```typescript
// page.tsx (server component or client component using useSearchParams)
// Reads: paymentMethod, month, year from URL
// Passes as initialFilters prop to AllTransactionsView
```

**`AllTransactionsView.tsx`** accepts an optional `initialFilters` prop:
```typescript
interface InitialFilters {
  paymentMethod?: string;
  month?: number;
  year?: number;
}
```

**`useAllTransactions.ts`** accepts `initialFilters` as an argument and seeds filter state from it on first render using a `useRef` guard (so the seed only runs once, then filter state is owned locally):

```typescript
export function useAllTransactions(initialFilters?: InitialFilters) {
  const seeded = useRef(false);
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    ...(initialFilters ?? {}),   // seed from URL params on first render
  }));
  // ... rest of hook unchanged
}
```

The URL is not kept in sync after the user changes filters — this is a one-time seed on page load.

---

## Section 3 — Annual Report Fix

### Root Cause

`AnnualSummary.tsx` does:
```typescript
const json = await res.json();
return json.data ?? null;
```

The API route returns `{ data: { report: AnnualReportData } }`, so `json.data` is `{ report: AnnualReportData }`. The component then reads `data.topExpenseCategories` which is `undefined` → TypeError crash on `.length`.

The component's `AnnualData` interface already defines the correct rich shape for display. The fix is:
1. Extend the service to compute the missing fields
2. Change the API route to return `{ data: AnnualReportData }` flat (remove the `{ report: ... }` nesting)
3. Update `contracts.ts` to match

### 3a. `contracts.ts` — Extend `AnnualReportData`

Add new fields to `AnnualReportData`. Keep all existing fields (they are consumed by `report-generator.ts` which imports this type via `src/features/reports/types.ts`).

```typescript
export interface AnnualReportData {
  // Existing fields (keep — used by report-generator.ts)
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;           // sum of all payment method all-time balances
  monthlyBreakdown: {
    month: number;               // 0-based
    income: number;
    expense: number;
    net: number;                 // keep for generator
    // New fields:
    monthKey: string;            // 'YYYY-MM', e.g. '2026-03'
    balance: number;             // alias for net; used by AnnualSummary.tsx
  }[];
  topCategories: { category: string; type: 'income' | 'expense'; total: number }[];  // keep for generator
  paymentMethodBalances: PaymentMethodBalance[];  // keep for generator
  transactions: Transaction[];   // keep for generator (Detail Transaksi sheet)

  // New fields (consumed by AnnualSummary.tsx)
  totalBalance: number;          // totalIncome − totalExpense for the year
  transactionCount: number;
  savingsRate: number;           // Math.max(0, totalBalance / totalIncome * 100) rounded; 0 if totalIncome = 0
  topExpenseCategories: { category: string; amount: number }[];  // expense-only, top 5, desc
  previousYear: {
    year: number;              // year - 1
    totalIncome: number;
    totalExpense: number;
    totalBalance: number;
    transactionCount: number;
    savingsRate: number;
  } | null;
  comparison: {
    incomeChange: number | null;    // % change vs previousYear; null if previousYear is null or prev = 0
    expenseChange: number | null;
    balanceChange: number | null;
    savingsRateChange: number | null;
  } | null;
}
```

Also update `AnnualReportResponse` to remove the `report` nesting:

```typescript
// Before:
export interface AnnualReportResponse {
  report: AnnualReportData;
}

// After:
export type AnnualReportResponse = AnnualReportData;
```

Update `api/client.ts` `reports.annual()` return type:
```typescript
annual(year: number) {
  return fetchApi<AnnualReportData>(`/reports/annual?year=${year}`);
}
```

(`AnnualReportData` is already imported; `AnnualReportResponse` import can be removed from client.ts.)

### 3b. `report.service.ts` — Add New Computed Fields

`getAnnualReportData(year: number)` adds:

**`transactionCount`:**
```sql
SELECT COUNT(*) FROM transactions
WHERE CAST(SUBSTR(date, 1, 4) AS INTEGER) = ?
```

**`topExpenseCategories`:** Built from the already-fetched `allYearResult.rows` (no new query):
```typescript
const expenseCatMap = new Map<string, number>();
for (const tx of allYearResult.rows) {
  if (tx.type === 'expense') {
    expenseCatMap.set(tx.category, (expenseCatMap.get(tx.category) ?? 0) + tx.amount);
  }
}
const topExpenseCategories = Array.from(expenseCatMap.entries())
  .map(([category, amount]) => ({ category, amount }))
  .sort((a, b) => b.amount - a.amount)
  .slice(0, 5);
```

**`totalBalance`:**
```typescript
const totalBalance = totalIncome - totalExpense;
```

**`savingsRate`:**
```typescript
const savingsRate = totalIncome > 0
  ? Math.round(Math.max(0, (totalBalance / totalIncome) * 100))
  : 0;
```

**`previousYear`:** Re-run the same summary query for `year - 1`:
```typescript
const [prevMonthSummaries, prevYearResult] = await Promise.all([
  txRepo.getMonthSummaries(year - 1),
  txRepo.findFiltered({ year: year - 1, yearOnly: true, page: 1, pageSize: 10000 }),
]);
const prevTotalIncome = prevMonthSummaries.reduce((s, m) => s + m.income, 0);
const prevTotalExpense = prevMonthSummaries.reduce((s, m) => s + m.expense, 0);
const prevTotalBalance = prevTotalIncome - prevTotalExpense;
const prevCount = prevYearResult.rows.length;
const prevSavingsRate = prevTotalIncome > 0
  ? Math.round(Math.max(0, (prevTotalBalance / prevTotalIncome) * 100))
  : 0;
const previousYear = prevCount > 0
  ? { year: year - 1, totalIncome: prevTotalIncome, totalExpense: prevTotalExpense,
      totalBalance: prevTotalBalance, transactionCount: prevCount, savingsRate: prevSavingsRate }
  : null;
```

**`comparison`:** Computed from `previousYear`:
```typescript
const pctChange = (curr: number, prev: number): number | null => {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
};
const comparison = previousYear ? {
  incomeChange:      pctChange(totalIncome,    previousYear.totalIncome),
  expenseChange:     pctChange(totalExpense,   previousYear.totalExpense),
  balanceChange:     pctChange(totalBalance,   previousYear.totalBalance),
  savingsRateChange: pctChange(savingsRate,    previousYear.savingsRate),
} : null;
```

**`monthlyBreakdown`** gains `monthKey` and `balance`:
```typescript
const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
  const s = summaryMap.get(i);
  const income  = s?.income  ?? 0;
  const expense = s?.expense ?? 0;
  const net     = income - expense;
  return {
    month:    i,
    income,
    expense,
    net,
    balance:  net,          // alias — same value, used by AnnualSummary.tsx
    monthKey: `${year}-${String(i + 1).padStart(2, '0')}`,
  };
});
```

### 3c. API Route — Flatten Response

Change `src/app/api/reports/annual/route.ts` line 21:

```typescript
// Before:
return NextResponse.json({ data: { report: result.data } });

// After:
return NextResponse.json({ data: result.data });
```

### 3d. `AnnualSummary.tsx` — Minimal Fix

The component's `AnnualData` interface already matches the new `AnnualReportData` shape. Only two field names differ:

| `AnnualData` (component) | `AnnualReportData` (service) |
|--------------------------|------------------------------|
| `totalBalance` | `totalBalance` ✓ (new field) |
| `monthlyBreakdown[].balance` | `monthlyBreakdown[].balance` ✓ (new alias) |
| `monthlyBreakdown[].monthKey` | `monthlyBreakdown[].monthKey` ✓ (new field) |

The component needs no structural rewrite. The only required change is removing the local `AnnualData` interface and importing `AnnualReportData` from `@/lib/api/contracts` instead (they are now equivalent).

`TrendChart.tsx`: Update its props interface to accept `monthKey` and `balance` fields on breakdown items if it currently expects different field names.

### 3e. Error Handling

- `savingsRate` is `0` when `totalIncome = 0` — no divide-by-zero
- `previousYear` is `null` when no prior-year data — `comparison` is `null` too, `hasPrevData` guard in component handles it correctly (already present)
- `topExpenseCategories` is `[]` when no expense transactions — `data.topExpenseCategories.length > 0` guard in component handles this correctly

---

## Section 4 — Testing (TDD)

New failing tests written first before any implementation. All 312 existing tests must pass throughout.

### `balance.service` additions (in existing or new test file)

- `monthlyFlow` is `0` for all accounts when no month/year params provided
- `monthlyFlow` is `0` when account has no transactions in the queried month
- `monthlyFlow` is positive when month has only income transactions for that account
- `monthlyFlow` is negative when month has only expense transactions for that account
- `monthlyFlow` is independent of all-time `balance` value
- `balance` (all-time) is unaffected by the month/year params

### `report.service` additions (in existing or new test file)

- `transactionCount` equals the number of transactions created for that year
- `transactionCount` is `0` when no transactions exist for the year
- `totalBalance` equals `totalIncome − totalExpense`
- `savingsRate` is `Math.round((totalBalance / totalIncome) * 100)` when `totalIncome > 0`
- `savingsRate` is `0` when `totalIncome = 0`
- `savingsRate` is `0` when `totalBalance < 0` (negative savings rate floor)
- `topExpenseCategories` contains only expense transactions, sorted by amount descending, max 5
- `topExpenseCategories` is `[]` when no expense transactions exist
- `previousYear` is `null` when no transactions exist for `year - 1`
- `previousYear` returns correct totals when prior-year data exists
- `comparison` is `null` when `previousYear` is `null`
- `comparison.incomeChange` is `null` when previous year income is `0`
- `monthlyBreakdown[0].monthKey` is `'YYYY-01'` format for January
- `monthlyBreakdown[0].balance` equals `monthlyBreakdown[0].net`

---

## Out of Scope

- `src/components/budget/`, `src/components/folders/`, `src/components/home/`, `src/components/settings/` — folder restructure deferred to a future pass
- Monthly report format changes — `generateMonthlyReport()` in `report-generator.ts` unchanged
- Bills and savings goals Zustand → API migration — separate future initiative
- Upload and export page API wiring — separate future initiative
- Settings page API wiring — separate future initiative
- `src/lib/services.ts` old stubs — cleanup deferred
