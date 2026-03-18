# Financial Tracker V.02 — Balance, Report & Export Redesign

**Date:** 2026-03-18
**Status:** Approved
**Scope:** Issues A–E: Balance system, click navigation, report/export merge, date sort, end-of-month reminder

---

## Overview

Five related improvements to the Financial Tracker V.02 dashboard, approved during brainstorming session on 2026-03-18.

---

## Issue A — Balance System Redesign

### Problem

The current system stores a manual `beginning_balance` on each payment method. Users never set it (defaults to 0), so displayed balances are wrong. The real source of truth is the transaction history.

### Approved Design

**Remove the manual `beginning_balance` field from the UI and API entirely.** Replace with transaction-chain derived balances:

- Each month's **beginning balance** = SUM of all transactions (income − expense) with `date < '{year}-{month+1:02}-01'`
- Monthly **income** = SUM of income transactions with `date LIKE '{year}-{month+1:02}-%'`
- Monthly **expense** = SUM of expense transactions with same LIKE pattern
- **Closing balance** = beginningBalance + income − expense

A built-in income category **"Saldo Awal"** lets users record their initial balance as a transaction.

**Balance Card Display (Monthly Ledger View):**

```
BCA Bank
Beginning Balance: Rp 6,000,000   ← all transactions before this month
↑ Income:         Rp 3,000,000   ← this month only
↓ Expense:        Rp 2,000,000   ← this month only
Closing:          Rp 7,000,000   ← beginning + income − expense
```

**Header total in `AccountBalancesWidget`:** After this change, the header total (`totalBalance`) will be the sum of all payment methods' **monthly closing balances** for the selected month — this replaces the previous all-time cumulative total. This is the intended behavior.

### SQL Sketch (for monthly query)

```sql
SELECT
  pm.id, pm.name, pm.type, pm.icon,
  COALESCE(SUM(CASE WHEN t.type = 'income' AND t.date < ? THEN t.amount
                    WHEN t.type = 'expense' AND t.date < ? THEN -t.amount
                    ELSE 0 END), 0) AS beginning_balance,
  COALESCE(SUM(CASE WHEN t.type = 'income' AND t.date LIKE ? THEN t.amount ELSE 0 END), 0) AS income,
  COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.date LIKE ? THEN t.amount ELSE 0 END), 0) AS expense,
  COALESCE(SUM(CASE WHEN t.type = 'income' AND t.date < ? THEN t.amount
                    WHEN t.type = 'expense' AND t.date < ? THEN -t.amount
                    ELSE 0 END), 0) +
  COALESCE(SUM(CASE WHEN t.type = 'income' AND t.date LIKE ? THEN t.amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.date LIKE ? THEN t.amount ELSE 0 END), 0) AS balance
FROM payment_methods pm
LEFT JOIN transactions t ON t.payment_method = pm.name
GROUP BY pm.id, pm.name, pm.type, pm.icon
ORDER BY balance DESC
```

The `balance` alias is computed inline so `ORDER BY balance DESC` is valid on both SQLite and Postgres. Params: `[monthStart, monthStart, monthPattern, monthPattern, monthStart, monthStart, monthPattern, monthPattern]` where:
- `monthStart = '{year}-{(month+1).toString().padStart(2, '0')}-01'` (e.g. `'2026-03-01'`)
- `monthPattern = '{year}-{(month+1).toString().padStart(2, '0')}-%'` (e.g. `'2026-03-%'`)

`month` and `year` parameters become **required** when calling in monthly context. When called without params (annual report context), run the legacy all-time query — see Issue C.

### Data Contract Change

`monthlyFlow` is removed entirely. `income` and `expense` now carry **month-scoped** values when called from a monthly context. In the XLSX monthly report template, `income`/`expense` fields on `PaymentMethodBalance` are not used directly — only `balance` (closing) and `beginningBalance` are displayed. The monthly XLSX body uses category-level summaries (`incomeCategories`/`expenseCategories`), not the balance object's income/expense fields.

```typescript
// After — remove monthlyFlow, add beginningBalance
interface PaymentMethodBalance {
  id: string; name: string; type: 'bank' | 'cash' | 'ewallet'; icon: string;
  beginningBalance: number;  // all transactions before selected month
  income: number;            // selected month only
  expense: number;           // selected month only
  balance: number;           // closing = beginningBalance + income − expense
}
```

### Files to Change

- **`src/server/services/balance.service.ts`** — Rewrite SQL using the sketch above; make `month`/`year` required; retain all-time fallback query when no params (see Issue C for annual report handling)

- **`src/lib/api/contracts.ts`** — Update `PaymentMethodBalance` per contract above

- **`src/lib/types.ts`** — Remove `beginningBalance: number` from the `PaymentMethod` interface (it was a manual input field; the concept is now derived from transactions and lives only on `PaymentMethodBalance`)

- **`src/lib/api/validation.ts`** — Remove `beginningBalance` from `createPaymentMethodSchema` and `updatePaymentMethodSchema`

- **`src/app/api/payment-methods/route.ts`** — Remove `beginningBalance` from payload handling after schema change

- **`src/app/api/payment-methods/[id]/route.ts`** — Remove `beginningBalance` from payload handling after schema change

- **`src/features/balances/BalanceCard.tsx`** — Redesign to 4-row display (Beginning Balance, Income, Expense, Closing); remove all `monthlyFlow` usage

- **`src/features/balances/useBalances.ts`** — Change `staleTime` from `30_000` to `0`

- **`src/app/settings/categories/page.tsx`** — Remove `newMethodBeginningBalance` state, `editBeginningBalance` state, `parseCurrencyInput(newMethodBeginningBalance)` in `handleAddMethod`, `method.beginningBalance` read in `handleOpenEdit`, and `beginningBalance` in `handleEditSave` payload

- **`src/server/db/seed.ts`** — Ensure "Saldo Awal" is seeded as a built-in income category

- **`src/server/db/client.ts`** — No change. `beginning_balance` column stays dormant in DB

---

## Issue B — Click Navigation Fix

### Problem

Clicking an account balance card routes to `/transactions` but the `paymentMethod` URL param is not applied.

### Root Cause

`src/app/transactions/page.tsx` initialises filters using `useState` with `window.location.search` as a lazy initializer. In Next.js App Router, this runs once on mount and does not react to navigation. Fix: use `useSearchParams()`.

### Fix

1. Replace `useState + window.location.search` with `useSearchParams()` in `TransactionsPage`
2. Wrap page or its Suspense-requiring portion in `<Suspense>` (required by App Router for `useSearchParams()`)
3. Read these URL params: `paymentMethod`, `allMonths`, `month`, `year` — all remain seeded from URL so other navigation paths (e.g., dashboard month links) still work
4. Navigation URL for balance card clicks: `router.push('/transactions?paymentMethod=NAME&allMonths=true')`

**`InitialFilters` interface extension** in `useAllTransactions.ts`:

```typescript
// Before
interface InitialFilters { paymentMethod?: string }

// After
interface InitialFilters {
  paymentMethod?: string;
  allMonths?: boolean;
  month?: number;
  year?: number;
}
```

`allMonths` state seeded from `initialFilters?.allMonths ?? false`.

### Files to Change

- **`src/app/transactions/page.tsx`** — Replace `useState(window.location.search)` with `useSearchParams()`; add Suspense boundary; read `paymentMethod`, `allMonths`, `month`, `year` params; pass all as `initialFilters`

- **`src/features/balances/AccountBalancesWidget.tsx`** — Update `handleCardClick` to `router.push('/transactions?paymentMethod=NAME&allMonths=true')`

- **`src/features/transactions/useAllTransactions.ts`** — Extend `InitialFilters` to include `allMonths?: boolean`, `month?: number`, `year?: number`; initialize each state from it

---

## Issue C — Report/Export System Redesign

### Problem

1. "Export Data" and "Download Reports" are two separate features doing the same thing
2. Monthly XLSX report has bugs vs. actual Excel template
3. JSON export format is not needed

### Approved Design

**Merge the two features:**
- Remove "Download Reports" button/section from `/reports` page
- Rename nav item: change `labelKey: 'export'` → `labelKey: 'downloadReport'` in `nav-config.ts`; add `downloadReport` key to `i18n.ts` (EN: "Download Report", ID: "Unduh Laporan")
- The `/export` page becomes the single place to generate all output

**Output formats: CSV, Excel, PDF only** (remove JSON):
- Remove `'json'` from `ExportFormat` in `src/lib/types.ts`
- Remove `'json'` from `createExportJobSchema` in `src/lib/api/validation.ts`
- Remove JSON `FormatCard` and `format: FileText` from `FORMAT_OPTIONS`/`FORMAT_ICONS` in `export/page.tsx`

### Annual Report: `listPaymentMethodBalances()` Strategy

**Decision: Option A — make params optional with all-time SQL fallback.**

When `month` and `year` are provided: run the month-scoped SQL from Issue A.
When no params provided (annual report context): run the all-time query:

```sql
SELECT pm.id, pm.name, pm.type, pm.icon,
  0 AS beginning_balance,
  COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END), 0) AS income,
  COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END), 0) AS expense,
  COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount
                    WHEN t.type='expense' THEN -t.amount ELSE 0 END), 0) AS balance
FROM payment_methods pm
LEFT JOIN transactions t ON t.payment_method = pm.name
GROUP BY pm.id, pm.name, pm.type, pm.icon
ORDER BY balance DESC
```

In this all-time path, `beginningBalance = 0`, `income`/`expense` = all-time totals, `balance` = net all-time. `getAnnualReportData` continues to call `listPaymentMethodBalances()` without params.

### Monthly XLSX Template Cell Mapping (confirmed by parsing)

The monthly XLSX body **changes from individual transaction rows to category-level summaries**. The existing generator writes `incomeTransactions`/`expenseTransactions` row-by-row; the new generator writes aggregated category totals. This is intentional to match the Excel template.

| Cell | Content |
|------|---------|
| B5 | "LAPORAN KEUANGAN BULANAN" |
| B7 | Full datetime string (e.g., "Monday, 16 March 2026, 12.52.55") — use `new Date()` at generation time |
| B9 | "Bulan:" |
| C9 | Month name (Indonesian) |
| B10 | "Tahun:" |
| C10 | Year number |
| G10 | "Total Pemasukan:" |
| H10 | Income total — currency format `'"Rp"#,##0'` |
| G12 | "Total Pengeluaran:" |
| H12 | Expense total — currency format `'"Rp"#,##0'` |
| B15 | "PEMASUKAN" (section header) |
| D15 | "PENGELUARAN" (section header) |
| B18+ | Income category names (one per row, column B) |
| C18+ | Income category amounts (column C, currency format) |
| D18+ | Expense category names (column D) |
| E18+ | Expense category amounts (column E, currency format) |

All amount cells use number format: `'"Rp"#,##0'`

### `MonthlyReportData` Additions and Aggregation Logic

Add to contract and service:

```typescript
incomeCategories: Array<{ category: string; total: number }>;
expenseCategories: Array<{ category: string; total: number }>;
```

**`incomeCategories` aggregation in `report.service.ts`** (mirrors existing `expenseSummaryByCategory`):

```typescript
const incomeCategoryMap = new Map<string, number>();
for (const tx of incomeTransactions) {
  incomeCategoryMap.set(tx.category, (incomeCategoryMap.get(tx.category) ?? 0) + tx.amount);
}
const incomeCategories = Array.from(incomeCategoryMap.entries())
  .map(([category, total]) => ({ category, total }))
  .sort((a, b) => b.total - a.total);
```

`expenseCategories` uses the existing `expenseSummaryByCategory` computation (rename/reuse).

### Files to Change

- **`src/features/reports/report-generator.ts`** — Complete rewrite: use cell mapping above; category-summary body instead of transaction rows; `'"Rp"#,##0'` format on all amounts; full datetime in B7; Annual report as two-sheet workbook

- **`src/server/services/report.service.ts`** — Pass `month`/`year` to `listPaymentMethodBalances()`; add `incomeCategories` aggregation logic; add `expenseCategories` to output; `getAnnualReportData` continues calling without params (all-time path)

- **`src/lib/api/contracts.ts`** — Add `incomeCategories` and `expenseCategories` to `MonthlyReportData`

- **`src/lib/types.ts`** — Remove `'json'` from `ExportFormat` type

- **`src/lib/api/validation.ts`** — Remove `'json'` from `createExportJobSchema`

- **`/reports` page (`src/app/reports/page.tsx`)** — Remove "Download Reports" section/button

- **`src/features/navigation/nav-config.ts`** — Change `labelKey: 'export'` → `labelKey: 'downloadReport'`

- **`src/lib/i18n.ts`** — Add `downloadReport` key (EN: "Download Report", ID: "Unduh Laporan")

- **`src/app/export/page.tsx`** — Remove JSON `FormatCard` from `FORMAT_OPTIONS` and `json: FileText` from `FORMAT_ICONS`

---

## Issue D — Date Sort Toggle

### Problem

The Transactions page always shows newest-first. Users want oldest-first chronologically.

### Approved Design

A toggle button in the Transactions page toolbar. Default: DESC (newest first). Label: "Terbaru" / "Terlama" in Indonesian.

### Files to Change

- **`src/lib/api/validation.ts`** — Add `sortOrder: z.enum(['asc', 'desc']).optional()` to `listTransactionsQuerySchema`

- **`src/server/repositories/transaction.repository.ts`** — Change `ORDER BY date DESC` to `ORDER BY date ${dir}` where `const dir = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'`

- **`src/app/api/transactions/route.ts`** — Pass `sortOrder` from validated query params to service

- **`src/lib/api/client.ts`** — Add `sortOrder?: 'asc' | 'desc'` to the `api.transactions.list()` parameter type

- **`src/features/transactions/useAllTransactions.ts`** — Add `sortOrder: 'asc' | 'desc'` state (default `'desc'`); add `toggleSortOrder` action; **include `sortOrder` in the `filterKey` array** (resets infinite query accumulation on sort change); include `sortOrder` in query params

- **Transactions page UI** — Add sort toggle button (arrow icon) in filter toolbar; label reflects current sort

---

## Issue E — End-of-Month Reminder

### Problem

Users may forget to record all transactions before month-end, causing wrong opening balance for next month.

### Approved Design

On the **last calendar day of each month**, a dismissible modal appears on the dashboard.

**Behavior:**
- On mount: if `today === lastDayOfMonth(today)`, check localStorage key `eom-reminder-dismissed-{YYYY}-{MM}`
- If not dismissed: show modal
- "Dismiss": write key to localStorage; close modal
- "Go to Transactions": navigate to `/transactions`; close modal
- Does not reappear same day; reappears on next month's last day

**UI:** shadcn/ui `Dialog`, Bell icon, amber colors, bilingual content.

**i18n keys:**
- `endOfMonthTitle`: EN "End of Month Reminder", ID "Pengingat Akhir Bulan"
- `endOfMonthBody`: EN "Today is the last day of {month}. Make sure you've recorded all transactions before midnight so next month's opening balance is accurate.", ID "Hari ini adalah hari terakhir {month}. Pastikan semua transaksi sudah dicatat sebelum tengah malam agar saldo awal bulan berikutnya akurat."
- `goToTransactions`: EN "Go to Transactions", ID "Ke Transaksi"
- `dismiss`: EN "Dismiss", ID "Tutup"

### Files to Change

- **New: `src/components/shared/EndOfMonthReminder.tsx`** — Component with date check on mount, localStorage key `eom-reminder-dismissed-{YYYY}-{MM}`, Dialog from shadcn/ui

- **Dashboard layout or page** — Import and render `<EndOfMonthReminder />`

- **`src/lib/i18n.ts`** — Add 4 EN/ID translation keys above

---

## Non-Changes

- `beginning_balance` DB column is **kept** (backward compat) but never read in balance calculations
- `payment_methods` table schema unchanged
- Bills, savings goals remain in Zustand (out of scope)
- Upload and Settings pages unchanged (out of scope)

---

## Testing

- **A**: Balance service tests: chain SQL (beginningBalance, income, expense, closing), all-time fallback path; `PaymentMethodBalance` shape; BalanceCard 4-row rendering; settings page no longer has beginning_balance fields
- **B**: Transaction page: `paymentMethod` filter applied from URL; `allMonths=true` seeds correctly; `month`/`year` also seeded when present
- **C**: Report generator: cell positions match mapping; amounts use currency format; body is category rows not transaction rows; export page shows only CSV/Excel/PDF
- **D**: `findFiltered` sort order (ASC and DESC); `filterKey` reset on sort change; API rejects invalid `sortOrder`; `client.ts` passes sortOrder correctly
- **E**: `EndOfMonthReminder` shows on last day; suppressed after dismiss; correct EN/ID strings; localStorage key scoped per month

---

## Implementation Order

1. **Issue D** (date sort) — smallest change, fully isolated
2. **Issue B** (click navigation) — isolated, no DB changes
3. **Issue A** (balance system) — DB query, service, contract, UI, settings cleanup
4. **Issue E** (end-of-month reminder) — new component, no backend
5. **Issue C** (report/export) — largest scope: generator rewrite, nav rename, page changes
