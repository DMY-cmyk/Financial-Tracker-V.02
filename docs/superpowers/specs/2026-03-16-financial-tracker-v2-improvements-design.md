# Financial Tracker V.02 — Improvements Design Spec

**Date:** 2026-03-16
**Status:** Approved
**Features:** Account Balances, Downloadable Reports, Load-More Transactions, Collapsible Sidebar Nav

---

## Overview

Four improvements to the Financial Tracker app. All are additive — no existing files are moved or deleted. New code lives in `src/features/` (Approach B: hybrid feature modules).

**Verified dependencies already in project** (confirmed in `package.json`):
- `@tanstack/react-query ^5.90.21` — confirmed in `package.json` line 22; `QueryProvider` wrapper already exists in `src/components/providers/`; used by all existing data-fetching hooks for caching and invalidation
- `xlsx` (SheetJS) — confirmed in `package.json`; already used by `src/lib/export-utils.ts`
- `zustand` — confirmed in `package.json`; used by `src/store/index.ts`

**Confirmed existing pages** (all have page files in `src/app/`):
- `/home` — welcome screen (`src/app/home/page.tsx`)
- `/recurring` — recurring transactions (`src/app/recurring/page.tsx`)
- `/reports` — financial reports (`src/app/reports/page.tsx`)

**Bills data confirmed server-side:** The `bills` table exists in SQLite (defined in `src/server/db/client.ts`), is populated via `POST /api/bills`, and is queryable via the existing `listBills(month, year)` service in `src/server/services/`. The project memory note "Bills remain in Zustand" refers to the *frontend* not yet reading from the API for display purposes — the *server-side* table and service are fully operational and available to the report service.

---

## Architecture Decision: Hybrid Feature Modules

Keep all existing code in `src/components/`, `src/hooks/`, `src/server/`, and `src/app/` exactly as-is. New cross-cutting features get self-contained modules under `src/features/`. Server services and API routes follow the same patterns already established in the codebase.

### New folder structure

```
src/
├── features/
│   ├── balances/
│   │   ├── BalanceCard.tsx
│   │   ├── BalanceGrid.tsx
│   │   ├── useBalances.ts
│   │   └── types.ts
│   ├── reports/
│   │   ├── ReportDownloader.tsx
│   │   ├── report-generator.ts
│   │   ├── useReportData.ts
│   │   └── types.ts
│   ├── transactions/
│   │   ├── AllTransactionsView.tsx
│   │   ├── LoadMoreButton.tsx
│   │   └── useAllTransactions.ts
│   └── navigation/
│       ├── nav-config.ts
│       ├── SidebarGroup.tsx
│       └── useNavGroups.ts
│
├── server/services/
│   ├── balance.service.ts          ← new
│   └── report.service.ts           ← new
│
└── app/api/
    ├── payment-methods/balances/
    │   └── route.ts                ← new
    └── reports/
        ├── monthly/route.ts        ← new
        └── annual/route.ts         ← new
```

---

## Feature 1: Account Balance by Payment Method

### Goal

Display the current net balance for each payment method — computed automatically as the sum of all income transactions minus all expense transactions for that payment method across all time. No manual opening balance required.

### Data layer

**New service:** `src/server/services/balance.service.ts`

SQL query:
```sql
SELECT
  pm.id,
  pm.name,
  pm.type,
  pm.icon,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount
                    WHEN t.type = 'expense' THEN -t.amount ELSE 0 END), 0) AS balance
FROM payment_methods pm
LEFT JOIN transactions t ON t.payment_method = pm.name
GROUP BY pm.id, pm.name, pm.type, pm.icon
ORDER BY balance DESC
```

- LEFT JOIN ensures payment methods with no transactions appear with balance = 0
- Joins on `pm.name = t.payment_method` because transactions store payment method as a denormalized name string (not a foreign key)
- All-time scope (no date filter) — reflects current available balance

> **Known limitation:** If a payment method is renamed (via `/settings/categories`), historical transactions retain the old name and will no longer match the renamed payment method in this JOIN. The balance for the new name will start from zero, and the old name will not appear in the list. This is an accepted limitation of the denormalized schema. Renaming payment methods does not need to be blocked, but the UI should not imply historical accuracy beyond this constraint.

**New API endpoint:** `GET /api/payment-methods/balances`
Response: `{ data: { balances: PaymentMethodBalance[] } }`

### Types

```typescript
// src/features/balances/types.ts
interface PaymentMethodBalance {
  id: string
  name: string
  type: 'bank' | 'cash' | 'ewallet'   // exact values from payment_methods.type column
  icon: string
  income: number
  expense: number
  balance: number
}
```

The `type` values `'bank' | 'cash' | 'ewallet'` are confirmed from `src/lib/constants.ts` `DEFAULT_PAYMENT_METHODS`. No other values are seeded or expected.

### Hook

```typescript
// src/features/balances/useBalances.ts
// Uses @tanstack/react-query (already installed: ^5.90.21)
const { balances, totalBalance, isLoading } = useBalances()
// totalBalance = sum of all payment method balances (used as "Total Assets")
// Cached via React Query, refetches on window focus
```

### Components

**`BalanceCard`** — single payment method card:
- Icon + name + type badge (Bank / Cash / E-Wallet)
- Net balance in JetBrains Mono, large, colored (emerald if positive, red if zero/negative)
- Small income ↑ / expense ↓ breakdown below the balance
- Styling: rounded-2xl, soft border, subtle shadow — matches existing card language

**`BalanceGrid`** — responsive grid of BalanceCards:
- Uses `staggerGrid` animation preset (80ms stagger)
- Loading skeleton state
- Empty state if no payment methods exist

### UI placement

1. **Dashboard** — new `AccountBalancesWidget` bento card added to the dashboard grid (`src/app/page.tsx`). `AccountBalancesWidget` is a thin wrapper around `BalanceGrid` that adds a card title ("Account Balances" / "Saldo Akun"), a `totalBalance` summary line, and the bento grid sizing/spacing needed for the dashboard layout. It lives in `src/features/balances/AccountBalancesWidget.tsx`.
2. **Reports page** — `BalanceGrid` appears as a "current snapshot" panel in the existing `/reports` page

---

## Feature 2: Monthly & Yearly Downloadable Reports

### Goal

Allow users to download financial reports that replicate the exact layout of the Excel template (`Financial Tracker Downloadable Report (Monthly).xlsx`), covering both monthly and yearly scopes.

### Existing `/reports` page

`src/app/reports/page.tsx` already exists and contains:
- Financial trends area chart (Income vs Expense over 6/12 months)
- Monthly breakdown table
- Annual report section with year navigation
- Summary cards (total income, expense, net balance, savings rate)

The new `ReportDownloader` component and `BalanceGrid` are added as new sections **below** these existing elements. No existing content is changed or removed.

### Data aggregation

**New service:** `src/server/services/report.service.ts`

**New API endpoint:** `GET /api/reports/monthly?month=1&year=2026`

```typescript
interface MonthlyReportData {
  month: number
  year: number
  totalIncome: number
  totalExpense: number
  totalAssets: number                                    // sum of all payment method balances
  incomeTransactions: Transaction[]
  expenseTransactions: Transaction[]
  expenseSummaryByCategory: { category: string; total: number }[]
  paymentMethodBalances: PaymentMethodBalance[]
  bills: Bill[]                                         // fetched from bills table via existing service
}
```

Bills are fetched server-side from the `bills` SQLite table via the existing `listBills(month, year)` service in `src/server/services/bill.service.ts`. The report service imports and calls this directly (not via HTTP fetch), following the same service-to-service call pattern used throughout the existing backend. The bills table and service are confirmed operational — see the "Confirmed existing pages" note in the Overview section.

> **Important:** `listBills` takes a single object parameter `{ month, year }` and returns `ServiceResult<Bill[]>`, not `Bill[]` directly. The report service must call it as: `const bills = (await listBills({ month, year })).data ?? []`.

**New API endpoint:** `GET /api/reports/annual?year=2026`

```typescript
interface AnnualReportData {
  year: number
  totalIncome: number
  totalExpense: number
  totalAssets: number
  monthlyBreakdown: { month: number; income: number; expense: number; net: number }[]
  topCategories: { category: string; type: 'income' | 'expense'; total: number }[]
  paymentMethodBalances: PaymentMethodBalance[]
}
```

### XLSX generation — monthly template replica

`src/features/reports/report-generator.ts` uses `SheetJS aoa_to_sheet()` (array-of-arrays) for precise cell positioning.

**Row numbers below are Excel 1-based row numbers** (matching what you see in the template file when opened in Excel). SheetJS `aoa_to_sheet` takes a 0-based array, so row N in Excel = index N-1 in the array.

**The template file at the repo root (`Financial Tracker Downloadable Report (Monthly).xlsx`) is committed to the repo and is the authoritative source for exact cell positions.** The table below provides known column assignments parsed from the template; use the file itself to verify during implementation if any position seems off:

| Section | Excel rows (1-based) | Content |
|---|---|---|
| Title | Row 4, col B | "Monthly Report" |
| Date serial | Row 7, col B | Excel serial date for report month |
| Month/Year labels | Row 9, cols B, D | "B U L A N", "T A H U N" |
| Month name, Year value | Row 10, cols B, D | Indonesian month name (e.g. "Januari"), year number |
| Total Pemasukan | Row 10, col G | Total income value |
| Total Pengeluaran label | Row 12, col B | "T O T A L A S S E T S" label |
| Total Assets value | Row 13, col B | Computed sum of all payment method balances |
| Column headers row 1 | Row 16 | KATEGORI, PEMASUKAN, PENGELUARAN, Rekap Pengeluaran section labels |
| Column headers row 2 | Row 17 | Sub-headers: No, Tanggal, Jumlah, Kategori, Method/Account, Notes |
| Category lists | Rows 18–28, cols B, D | Income category names (col B), expense category names (col D) |
| Income transactions | Rows 18+, cols F–J | F=No (row number), G=Tanggal (YYYY-MM-DD), H=Jumlah (amount), I=Kategori (category name), J=Method (payment method) |
| Expense transactions | Rows 18+, cols L–Q | L=No, M=Tanggal, N=Jumlah, O=Kategori, P=Account (payment method), Q=Notes |
| Expense summary | Rows 18+, cols S–T | S=Kategori (category name), T=Total (summed expense amount) |
| Payment method section | Row 32, col B | "Payment Method" label |
| Payment method rows | Rows 34+, cols B, D | Payment method name, balance amount |
| Bills section header | Row 48, col B | "C A T A T A N T A G I H A N" |
| Bills sub-header | Row 50, cols C, D | "Tagihan", "Jumlah" |
| Bills rows | Rows 51+, cols B, C, D | Paid status (boolean), bill name, amount |

Cell merges via `ws['!merges']`, column widths via `ws['!cols']`.

> Note: SheetJS community edition does not support cell background colors or font styling. The data layout, cell positions, merges, and column widths will match the template exactly. Background fill colors from the original template will not carry over.

### XLSX generation — yearly report

One XLSX file with two sheets:
- **Sheet 1 "Ringkasan Tahunan"** — 12-month summary table (income, expense, net per month), annual totals, top categories, payment method balances
- **Sheet 2 "Detail Transaksi"** — all transactions for the year sorted by date, with a month label grouping column

### UI — `ReportDownloader` component

Added as a new section on the existing `/reports` page, below the existing charts:

```
┌─────────────────────────────────────────────────┐
│  Download Report                                 │
│                                                  │
│  Type: [Monthly]  [Yearly]   (tab toggle)        │
│                                                  │
│  Month: [Januari ▼]  Year: [2026 ▼]             │
│         (hidden when Yearly selected)            │
│                                                  │
│  [ ↓ Download Report ]                           │
└─────────────────────────────────────────────────┘
```

- Year dropdown populated by calling `api.dashboard.folderSummary()` (client-side API call to `GET /api/dashboard/folder-summary`) which returns `YearSummary[]` with available years
- Download is fully client-side: fetch data from API → pass to `report-generator.ts` → trigger blob download
- Toast notification on success/error via Sonner
- `isGenerating` state disables button and shows spinner during fetch + generation

### Hook

```typescript
// src/features/reports/useReportData.ts
// Uses @tanstack/react-query (already installed: ^5.90.21)
const { downloadMonthly, downloadAnnual, isGenerating } = useReportData()
// downloadMonthly(month, year) → fetch API → generate XLSX → trigger download
// downloadAnnual(year) → fetch API → generate XLSX → trigger download
```

### i18n additions

> Before adding these keys, verify none already exist in `src/lib/i18n.ts` (which has 155+ keys). If a key already exists with acceptable text, reuse it instead of adding a duplicate.

```typescript
downloadReport:      { en: 'Download Report',           id: 'Unduh Laporan' }
reportTypeMonthly:   { en: 'Monthly',                   id: 'Bulanan' }
reportTypeYearly:    { en: 'Yearly',                    id: 'Tahunan' }
generatingReport:    { en: 'Generating...',             id: 'Membuat...' }
reportDownloaded:    { en: 'Report downloaded',         id: 'Laporan diunduh' }
reportError:         { en: 'Failed to generate report', id: 'Gagal membuat laporan' }
annualSummary:       { en: 'Annual Summary',            id: 'Ringkasan Tahunan' }
transactionDetail:   { en: 'Transaction Detail',        id: 'Detail Transaksi' }
accountBalances:     { en: 'Account Balances',          id: 'Saldo Akun' }
```

---

## Feature 3: All Transactions with Load More

### Goal

Replace fixed 25-item pagination on the `/transactions` page with a 50-item default page size and a "Load more" button that appends the next batch to the existing list.

### Mechanics

- Default page size: **50** (up from 25)
- "Load more" appends the next 50 transactions to the accumulated list
- Changing any filter resets accumulated list to page 1 fresh
- Transaction summary bar (income/expense totals) reflects the full filtered server total — not just loaded rows
- "Showing X of Y transactions" count always visible above the list

### Hook

`useAllTransactions` is a near-complete drop-in replacement for the existing `useTransactions()`. It wraps or mirrors all the same fields the transactions page currently uses — only replacing the pagination model with load-more accumulation. The existing `useTransactions` hook in `src/hooks/useTransactions.ts` should be used as the reference for the full field list.

```typescript
// src/features/transactions/useAllTransactions.ts
// Uses @tanstack/react-query (already installed: ^5.90.21)
const {
  // ── Data (load-more specific) ──────────────────
  transactions,       // Transaction[] — all accumulated rows so far
  total,              // number — server total matching current filters
  income,             // number — income total for current filters (full server total)
  expense,            // number — expense total for current filters (full server total)
  hasMore,            // boolean — page < totalPages
  loadMore,           // () => void — fetch next page and append
  isLoading,          // boolean — true on first load
  isLoadingMore,      // boolean — true on subsequent load-more fetches
  isEmpty,            // boolean — total === 0 (no transactions at all)
  hasNoResults,       // boolean — total === 0 but filters are active

  // ── Filters (mirror useTransactions) ─────────
  search,             setSearch,
  typeFilter,         setTypeFilter,
  categoryId,         setCategoryId,
  paymentMethod,      setPaymentMethod,
  month,              setMonth,
  year,               setYear,
  allMonths,          setAllMonths,
  yearOnly,           setYearOnly,
  resetFilters,       // () => void — clears all filters and resets accumulation

  // ── Reference data (for filter dropdowns) ────
  categories,         // Category[] — for category filter dropdown
  paymentMethods,     // PaymentMethod[] — for payment method filter dropdown

  // ── Form management (mirror useTransactions) ──
  formOpen,           // boolean
  editingTx,          // Transaction | null
  openAdd,            // () => void
  openEdit,           // (tx: Transaction) => void
  openDuplicate,      // (tx: Transaction) => void
  closeForm,          // () => void
  deleteTransaction,  // (id: string) => Promise<void>

  // ── Bulk operations (mirror useTransactions) ──
  selectedIds,             // Set<string>
  toggleSelect,            // (id: string) => void
  selectAll,               // () => void
  clearSelection,          // () => void
  isAllSelected,           // boolean
  bulkDeleteTransactions,  // () => Promise<void>
} = useAllTransactions()
```

**Key implementation note:** Calling any of the individual filter setters (`setSearch`, `setTypeFilter`, etc.) or `resetFilters` must clear the accumulated transactions array and reset the internal page cursor to 1 before the next fetch. The `setFilter` calls for month/year/allMonths/yearOnly must also trigger this reset. The load-more accumulation is the *only* behavioral difference from `useTransactions`.

**Filter setter type clarification:**
```typescript
type TransactionTypeFilter = 'all' | 'income' | 'expense'
setTypeFilter: (value: TransactionTypeFilter) => void
setSearch:     (value: string) => void
setCategoryId: (value: string) => void    // '' = all
setPaymentMethod: (value: string) => void // '' = all
setMonth:      (value: number) => void    // 0–11
setYear:       (value: number) => void
setAllMonths:  (value: boolean) => void
setYearOnly:   (value: boolean) => void
```

### Components

**`LoadMoreButton`** — renders below the transaction list:

- Label uses plain string concatenation (not i18n interpolation) since `t()` does not support params:
  ```typescript
  // Example in component (pageSize = 50, remaining = total - transactions.length):
  const remaining = total - transactions.length
  const label = isLoadingMore
    ? t(locale, 'loading')
    : hasMore
      ? `${t(locale, 'loadMore')} ${pageSize} (${remaining} ${t(locale, 'remaining')})`
      : `${t(locale, 'allLoaded')} (${total})`
  ```
- Spinner during `isLoadingMore`
- When `!hasMore`: shows "all loaded" message
- Hidden entirely when list is empty
- Uses `tapScale` animation preset, matches existing Button styles

**`AllTransactionsView`** — thin wrapper that composes the existing `TransactionTable` + new `LoadMoreButton` + updated count label.

### i18n additions

> Before adding these keys, verify none already exist in `src/lib/i18n.ts`. The keys `showing` and `of` in particular may already exist — reuse them if so.

String interpolation is handled via plain concatenation at the call site (not via `t()` params), since the existing `t(locale, key)` function only accepts a key and returns a plain string:

```typescript
loadMore:   { en: 'Load more',      id: 'Muat lagi' }
remaining:  { en: 'remaining',      id: 'tersisa' }
allLoaded:  { en: 'All loaded',     id: 'Semua dimuat' }
showing:    { en: 'Showing',        id: 'Menampilkan' }
of:         { en: 'of',             id: 'dari' }
// Usage: `${t(locale,'showing')} ${loaded} ${t(locale,'of')} ${total} ...`
```

### What stays unchanged

- All filters (type, category, payment method, date range, search)
- Bulk select and bulk delete
- Export of filtered results
- `TransactionTable` component (no changes needed)
- `TransactionForm` sheet modal

---

## Feature 4: Collapsible Sidebar Nav Groups

### Goal

Organize the desktop sidebar nav items into labeled, collapsible groups. Groups remember their collapsed state across sessions. The icon-only rail mode is unaffected.

### Types

```typescript
// src/features/navigation/nav-config.ts

interface NavItem {
  href: string
  labelKey: string
  icon: LucideIcon
}

interface NavGroup {
  id: string
  labelKey?: string           // omitted for the unlabeled 'overview' group
  defaultCollapsed?: boolean  // omitted for non-collapsible groups; defaults to false
  items: NavItem[]
}
```

When `labelKey` is undefined, `SidebarGroup` renders no header row and the group is not collapsible (always expanded).

### Nav group configuration

`/home` (welcome screen) and `/recurring` (recurring transactions) are confirmed existing pages in the app.

```typescript
// src/features/navigation/nav-config.ts
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    // labelKey omitted → no visible header, not collapsible
    items: [
      { href: '/home', labelKey: 'home',      icon: Home },
      { href: '/',     labelKey: 'dashboard', icon: LayoutDashboard },
    ]
  },
  {
    id: 'finance',
    labelKey: 'groupFinance',  // "Finance" / "Keuangan"
    defaultCollapsed: false,
    items: [
      { href: '/transactions', labelKey: 'transactions', icon: ArrowLeftRight },
      { href: '/recurring',    labelKey: 'recurring',    icon: Repeat },
      { href: '/budget',       labelKey: 'budget',       icon: Target },
      { href: '/bills',        labelKey: 'bills',        icon: FileText },
      { href: '/savings',      labelKey: 'savings',      icon: PiggyBank },
    ]
  },
  {
    id: 'tools',
    labelKey: 'groupTools',   // "Tools" / "Alat"
    defaultCollapsed: false,
    items: [
      { href: '/reports', labelKey: 'reports', icon: BarChart2 },
      { href: '/upload',  labelKey: 'upload',  icon: Upload },
      { href: '/export',  labelKey: 'export',  icon: Download },
    ]
  }
]
// NAV_BOTTOM (Settings, Categories) remains unchanged — always visible, not grouped
```

### Collapse state

Two new keys added to the existing Zustand `ui` slice in `src/store/index.ts`. The current store has these UI fields: `selectedMonth`, `selectedYear`, `theme`, `locale`, `sidebarCollapsed`, `dashboardView`, `dashboardViewDirection`. Add:

```typescript
// New fields added to UIState interface in src/lib/types.ts:
collapsedGroups: Record<string, boolean>  // initial value: {} (empty record)

// New action added to store:
toggleNavGroup: (groupId: string) => void
// Implementation: set collapsedGroups[groupId] = !collapsedGroups[groupId]
```

**Initial value is `{}` (empty record).** When `collapsedGroups[groupId]` is `undefined` (i.e., never toggled), the component reads `group.defaultCollapsed ?? false` as the fallback. The effective collapsed check is:
```typescript
const isGroupCollapsed = collapsedGroups[group.id] ?? group.defaultCollapsed ?? false
```

Persisted in localStorage automatically with the rest of UI state (existing `persist()` middleware covers all `ui` state).

### `useNavGroups` hook

```typescript
// src/features/navigation/useNavGroups.ts
const { groups, isGroupCollapsed, toggleGroup } = useNavGroups()
// groups: NAV_GROUPS array from nav-config.ts
// isGroupCollapsed(groupId): boolean — reads collapsedGroups[id] ?? defaultCollapsed ?? false
// toggleGroup(groupId): void — calls store.toggleNavGroup; no-op if group contains active route
```

The hook reads `collapsedGroups` and `toggleNavGroup` from the Zustand store and `usePathname()` for the active-route guard. It exports the enriched group list plus the two helpers so `Sidebar.tsx` has a single clean import.

### `SidebarGroup` component

```typescript
// src/features/navigation/SidebarGroup.tsx
interface SidebarGroupProps {
  group: NavGroup
  railMode: boolean          // true = sidebar is in icon-only 72px rail mode (NOT the group's own collapsed state)
  onToggle: () => void       // called when group header is clicked
  locale: 'en' | 'id'
}
```

- Group header row: label + chevron icon, full-width clickable
- Chevron rotates 90° when collapsed (Framer Motion `animate={{ rotate }}`)
- Items animate in/out with `AnimatePresence` + `motion.div` with height: `0 ↔ auto`, opacity: `0 ↔ 1`, 250ms ease
- Items use `staggerList` preset (40ms stagger) on expand
- **Active-route guard:** if any item in the group matches `usePathname()`, the group cannot be collapsed — forced open to keep the current page visible in the nav

### Icon-only rail mode

When `sidebarCollapsed: true` (72px rail), group headers are hidden. All nav icons render in a flat list as today. The `railMode` prop is passed as `true` to each `SidebarGroup`, which suppresses the header and renders items directly. Group collapse state is ignored in rail mode. Tooltips still appear on hover. No behavior change from current rail mode.

### i18n additions

```typescript
groupFinance: { en: 'Finance', id: 'Keuangan' }
groupTools:   { en: 'Tools',   id: 'Alat' }
```

---

## Cross-cutting concerns

### No breaking changes

- No existing files are deleted or moved
- No existing API routes are modified (only new routes added)
- No existing components are changed (only new components added, or existing pages extended)
- Existing `useTransactions` hook remains intact — `useAllTransactions` is a new hook in `src/features/`
- Existing export utilities (`export-utils.ts`) remain intact — report generation is new code in `features/reports/`

### Testing

Following the existing Vitest pattern in `src/__tests__/`:
- `balance.service.test.ts` — verify balance computation with income-only, expense-only, mixed, zero-transaction payment methods, and LEFT JOIN behavior
- `report.service.test.ts` — verify monthly and annual data aggregation correctness, bills inclusion
- `report-generator.test.ts` — verify XLSX output structure (sheet names, row count, cell values at key positions)

### Performance

- Balance query uses the existing `idx_transactions_payment_method` index
- Report data queries are all indexed (date, category_id, payment_method)
- Load-more fetches one page at a time — no all-records-at-once loading
- XLSX generation is synchronous but fast for typical report sizes (< 500 rows)

---

## Summary of all new files

| File | Purpose |
|------|---------|
| `src/features/balances/types.ts` | PaymentMethodBalance interface |
| `src/features/balances/useBalances.ts` | Balance fetch hook (React Query) |
| `src/features/balances/BalanceCard.tsx` | Single balance card |
| `src/features/balances/BalanceGrid.tsx` | Grid of balance cards |
| `src/features/balances/AccountBalancesWidget.tsx` | Dashboard bento card wrapper around BalanceGrid — adds card title and total balance summary line |
| `src/features/reports/types.ts` | MonthlyReportData, AnnualReportData interfaces |
| `src/features/reports/useReportData.ts` | Report fetch + download hook |
| `src/features/reports/ReportDownloader.tsx` | Download UI component |
| `src/features/reports/report-generator.ts` | XLSX builder (monthly + yearly templates) |
| `src/features/transactions/useAllTransactions.ts` | Load-more accumulating hook |
| `src/features/transactions/LoadMoreButton.tsx` | Load more button component |
| `src/features/transactions/AllTransactionsView.tsx` | Composed view wrapper |
| `src/features/navigation/nav-config.ts` | Nav group definitions |
| `src/features/navigation/SidebarGroup.tsx` | Collapsible group component |
| `src/features/navigation/useNavGroups.ts` | Group collapse state hook |
| `src/server/services/balance.service.ts` | Balance computation service |
| `src/server/services/report.service.ts` | Report data aggregation service |
| `src/app/api/payment-methods/balances/route.ts` | GET /api/payment-methods/balances |
| `src/app/api/reports/monthly/route.ts` | GET /api/reports/monthly |
| `src/app/api/reports/annual/route.ts` | GET /api/reports/annual |

## Summary of modified files

| File | Change |
|------|--------|
| `src/store/index.ts` | Add `collapsedGroups` state + `toggleNavGroup` action |
| `src/lib/types.ts` | Add `collapsedGroups` and `toggleNavGroup` to `UIState` / `FinancialStore` interfaces |
| `src/components/layout/Sidebar.tsx` | Replace flat nav list with `SidebarGroup` components from `src/features/navigation/` |
| `src/app/transactions/page.tsx` | Swap `useTransactions` for `useAllTransactions`, render `AllTransactionsView` |
| `src/app/reports/page.tsx` | Add `ReportDownloader` and `BalanceGrid` sections below existing charts |
| `src/app/page.tsx` (dashboard) | Add `AccountBalancesWidget` to bento grid |
| `src/lib/i18n.ts` | Add all new translation keys listed in each feature section |
| `src/lib/api/client.ts` | Add `api.balances.list()`, `api.reports.monthly()`, `api.reports.annual()` (see signatures below) |
| `src/lib/api/contracts.ts` | Add `PaymentMethodBalance`, `MonthlyReportData`, `AnnualReportData` response types |

### API client method signatures

```typescript
// Additions to src/lib/api/client.ts

balances: {
  list(): Promise<ApiResult<{ balances: PaymentMethodBalance[] }>>
    // GET /api/payment-methods/balances
}

reports: {
  monthly(month: number, year: number): Promise<ApiResult<MonthlyReportData>>
    // GET /api/reports/monthly?month={month}&year={year}

  annual(year: number): Promise<ApiResult<AnnualReportData>>
    // GET /api/reports/annual?year={year}
}
```

These follow the exact same `fetchApi<T>()` wrapper pattern used by all other methods in `src/lib/api/client.ts`.
