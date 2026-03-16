# Financial Tracker V.02 Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add account balances by payment method, monthly/yearly downloadable reports matching the Excel template, load-more transactions page, and collapsible grouped sidebar navigation.

**Architecture:** Hybrid feature modules — new code in `src/features/` (balances, reports, transactions, navigation) with server services in `src/server/services/` and API routes in `src/app/api/`. All existing code stays in place; no files are moved or deleted.

**Tech Stack:** Next.js App Router, TypeScript strict, Tailwind v4, shadcn/ui, `@tanstack/react-query ^5.90.21` (already installed), Zustand, SheetJS (xlsx), Framer Motion, Sonner, better-sqlite3 / Neon Postgres via `getDb()`.

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `src/features/balances/types.ts` | `PaymentMethodBalance` interface |
| `src/features/balances/useBalances.ts` | React Query hook → `GET /api/payment-methods/balances` |
| `src/features/balances/BalanceCard.tsx` | Single payment method card |
| `src/features/balances/BalanceGrid.tsx` | Responsive grid of BalanceCards |
| `src/features/balances/AccountBalancesWidget.tsx` | Dashboard bento card wrapper |
| `src/features/reports/types.ts` | `MonthlyReportData`, `AnnualReportData` interfaces |
| `src/features/reports/useReportData.ts` | Download hook (fetch + generate + trigger) |
| `src/features/reports/ReportDownloader.tsx` | Month/year picker + download button UI |
| `src/features/reports/report-generator.ts` | SheetJS XLSX builder (monthly template + yearly) |
| `src/features/transactions/useAllTransactions.ts` | `useInfiniteQuery` load-more hook |
| `src/features/transactions/LoadMoreButton.tsx` | "Load 50 more" button |
| `src/features/transactions/AllTransactionsView.tsx` | Composes TransactionTable + LoadMoreButton |
| `src/features/navigation/nav-config.ts` | `NavGroup`/`NavItem` types + `NAV_GROUPS` config |
| `src/features/navigation/SidebarGroup.tsx` | Collapsible nav section component |
| `src/features/navigation/useNavGroups.ts` | Group collapse state hook (Zustand + active-route guard) |
| `src/server/services/balance.service.ts` | Raw SQL JOIN → balance per payment method |
| `src/server/services/report.service.ts` | Aggregates monthly/annual report data |
| `src/app/api/payment-methods/balances/route.ts` | `GET /api/payment-methods/balances` |
| `src/app/api/reports/monthly/route.ts` | `GET /api/reports/monthly?month=&year=` |
| `src/app/api/reports/annual/route.ts` | `GET /api/reports/annual?year=` |

### Modified files
| File | What changes |
|------|-------------|
| `src/lib/types.ts` | Add `collapsedGroups`, `toggleNavGroup` to `UIState`/`FinancialStore` |
| `src/store/index.ts` | Add `collapsedGroups: {}` initial state + `toggleNavGroup` action |
| `src/lib/api/contracts.ts` | Add `PaymentMethodBalance`, `MonthlyReportData`, `AnnualReportData`, `BalanceListResponse`, `MonthlyReportResponse`, `AnnualReportResponse` |
| `src/lib/api/client.ts` | Add `api.balances.list()`, `api.reports.monthly()`, `api.reports.annual()` |
| `src/lib/i18n.ts` | Add ~11 new translation keys (check for duplicates first) |
| `src/components/layout/Sidebar.tsx` | Replace flat `NAV_MAIN` loop with `SidebarGroup` components |
| `src/components/dashboard/DashboardContent.tsx` | Add `AccountBalancesWidget` to bento grid |
| `src/app/transactions/page.tsx` | Swap `useTransactions` for `useAllTransactions`, render `AllTransactionsView` |
| `src/app/reports/page.tsx` | Add `ReportDownloader` + `BalanceGrid` sections below existing charts |

---

## Chunk 1: Foundation — Types, Store, Contracts, API Client, i18n

### Task 1: Extend `UIState`, `FinancialStore`, Zustand store

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/store/index.ts`

- [ ] **Step 1: Add `collapsedGroups` and `toggleNavGroup` to types**

In `src/lib/types.ts`, add to `UIState` (after `dashboardViewDirection`):
```typescript
  collapsedGroups: Record<string, boolean>;
```
Add to `FinancialStore` (after `setDashboardView`):
```typescript
  toggleNavGroup: (groupId: string) => void;
```

- [ ] **Step 2: Update the Zustand store**

In `src/store/index.ts`, add `collapsedGroups: {}` to the `ui` initial state object (after `dashboardViewDirection: 1`):
```typescript
        collapsedGroups: {},
```
Add the action after `setDashboardView`:
```typescript
      toggleNavGroup: (groupId: string) =>
        set((state) => ({
          ui: {
            ...state.ui,
            collapsedGroups: {
              ...state.ui.collapsedGroups,
              [groupId]: !(state.ui.collapsedGroups[groupId] ?? false),
            },
          },
        })),
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run typecheck
```
Expected: no errors related to these files.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/store/index.ts
git commit -m "feat: add collapsedGroups state and toggleNavGroup to Zustand store"
```

---

### Task 2: Add contracts, API client methods, and i18n keys

**Files:**
- Modify: `src/lib/api/contracts.ts`
- Modify: `src/lib/api/client.ts`
- Modify: `src/lib/i18n.ts`

- [ ] **Step 1: Add new response types to `contracts.ts`**

First, update the existing import on line 1 of `src/lib/api/contracts.ts` to add `Bill`:
```typescript
import type { Transaction, Category, PaymentMethod, RecurringTransaction, Bill } from '@/lib/types';
```

Then add at the end of `src/lib/api/contracts.ts`:
```typescript
// === Balance contracts ===

export interface PaymentMethodBalance {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'ewallet';
  icon: string;
  income: number;
  expense: number;
  balance: number;
}

export interface BalanceListResponse {
  balances: PaymentMethodBalance[];
}

// === Report contracts ===

export interface MonthlyReportData {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;
  incomeTransactions: Transaction[];
  expenseTransactions: Transaction[];
  expenseSummaryByCategory: { category: string; total: number }[];
  paymentMethodBalances: PaymentMethodBalance[];
  bills: Bill[];
}

export interface AnnualReportData {
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;
  monthlyBreakdown: { month: number; income: number; expense: number; net: number }[];
  topCategories: { category: string; type: 'income' | 'expense'; total: number }[];
  paymentMethodBalances: PaymentMethodBalance[];
  transactions: Transaction[];
}

export interface MonthlyReportResponse {
  report: MonthlyReportData;
}

export interface AnnualReportResponse {
  report: AnnualReportData;
}
```

- [ ] **Step 2: Add API client methods to `client.ts`**

Add these two new namespaces to the `api` object in `src/lib/api/client.ts`. Add `BalanceListResponse`, `MonthlyReportResponse`, and `AnnualReportResponse` to the existing `import type { ... } from './contracts'` block on lines 2–30 (do not replace the whole block — just add these three names to the existing list).

Add inside the `api` object (after `recurringTransactions`):
```typescript
  balances: {
    list() {
      return fetchApi<BalanceListResponse>('/payment-methods/balances');
    },
  },

  reports: {
    monthly(month: number, year: number) {
      return fetchApi<MonthlyReportResponse>(`/reports/monthly?month=${month}&year=${year}`);
    },

    annual(year: number) {
      return fetchApi<AnnualReportResponse>(`/reports/annual?year=${year}`);
    },
  },
```

- [ ] **Step 3: Add i18n keys**

Open `src/lib/i18n.ts`. Search for these keys before adding to avoid duplicates: `downloadReport`, `reportTypeMonthly`, `reportTypeYearly`, `generatingReport`, `reportDownloaded`, `reportError`, `annualSummary`, `transactionDetail`, `accountBalances`, `loadMore`, `remaining`, `allLoaded`, `showing`, `of`, `groupFinance`, `groupTools`.

> **Note:** `remaining` and `of` already exist in `i18n.ts` with capitalized values (`Remaining`/`Tersisa` and `of`/`dari`). Skip them (the "search before adding" instruction covers this). The existing `of` value matches exactly (`of`/`dari`). The existing `remaining` is capitalized — the `LoadMoreButton` uses it in string concatenation, so lowercase capitalization is the caller's responsibility.

For any key that does NOT already exist, add both `en` and `id` entries to the `translations` object:
```typescript
// Report download keys
downloadReport:    { en: 'Download Report',           id: 'Unduh Laporan' },
reportTypeMonthly: { en: 'Monthly',                   id: 'Bulanan' },
reportTypeYearly:  { en: 'Yearly',                    id: 'Tahunan' },
generatingReport:  { en: 'Generating...',             id: 'Membuat...' },
reportDownloaded:  { en: 'Report downloaded',         id: 'Laporan diunduh' },
reportError:       { en: 'Failed to generate report', id: 'Gagal membuat laporan' },
annualSummary:     { en: 'Annual Summary',            id: 'Ringkasan Tahunan' },
transactionDetail: { en: 'Transaction Detail',        id: 'Detail Transaksi' },
accountBalances:   { en: 'Account Balances',          id: 'Saldo Akun' },
// Load-more transaction keys
loadMore:          { en: 'Load more',                 id: 'Muat lagi' },
// remaining — already exists, skip
allLoaded:         { en: 'All loaded',                id: 'Semua dimuat' },
showing:           { en: 'Showing',                   id: 'Menampilkan' },
// of — already exists, skip
// Sidebar group keys
groupFinance:      { en: 'Finance',                   id: 'Keuangan' },
groupTools:        { en: 'Tools',                     id: 'Alat' },
```

- [ ] **Step 4: Typecheck**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run typecheck
```
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/contracts.ts src/lib/api/client.ts src/lib/i18n.ts
git commit -m "feat: add balance/report contracts, API client methods, and i18n keys"
```

---

## Chunk 2: Feature 1 — Account Balance by Payment Method

### Task 3: `balance.service.ts` + test

**Files:**
- Create: `src/server/services/balance.service.ts`
- Create: `src/__tests__/balance.service.test.ts`
- Test: `src/__tests__/balance.service.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/__tests__/balance.service.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { listPaymentMethodBalances } from '@/server/services/balance.service';
import { createPaymentMethod } from '@/server/services/payment-method.service';
import { createTransaction } from '@/server/services/transaction.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('listPaymentMethodBalances', () => {
  it('returns empty array when no payment methods exist', async () => {
    const result = await listPaymentMethodBalances();
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([]);
  });

  it('returns zero balance for payment method with no transactions', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    const result = await listPaymentMethodBalances();
    expect(result.data).toHaveLength(1);
    expect(result.data![0].balance).toBe(0);
    expect(result.data![0].income).toBe(0);
    expect(result.data![0].expense).toBe(0);
  });

  it('computes balance as income minus expense', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createTransaction({
      date: '2026-01-15', description: 'Salary', category: 'Income',
      categoryId: 'c1', type: 'income', amount: 5000000,
      paymentMethod: 'Bank BCA', notes: '',
    });
    await createTransaction({
      date: '2026-01-20', description: 'Food', category: 'Expense',
      categoryId: 'c2', type: 'expense', amount: 200000,
      paymentMethod: 'Bank BCA', notes: '',
    });
    const result = await listPaymentMethodBalances();
    expect(result.data![0].income).toBe(5000000);
    expect(result.data![0].expense).toBe(200000);
    expect(result.data![0].balance).toBe(4800000);
  });

  it('handles multiple payment methods independently', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createPaymentMethod({ name: 'GoPay', icon: 'smartphone', type: 'ewallet' });
    await createTransaction({
      date: '2026-01-15', description: 'Salary', category: 'Income',
      categoryId: 'c1', type: 'income', amount: 3000000,
      paymentMethod: 'Bank BCA', notes: '',
    });
    await createTransaction({
      date: '2026-01-15', description: 'Top Up', category: 'Transfer',
      categoryId: 'c2', type: 'income', amount: 500000,
      paymentMethod: 'GoPay', notes: '',
    });
    const result = await listPaymentMethodBalances();
    expect(result.data).toHaveLength(2);
    const bca = result.data!.find(b => b.name === 'Bank BCA');
    const gopay = result.data!.find(b => b.name === 'GoPay');
    expect(bca!.balance).toBe(3000000);
    expect(gopay!.balance).toBe(500000);
  });

  it('orders results by balance descending', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createPaymentMethod({ name: 'GoPay', icon: 'smartphone', type: 'ewallet' });
    await createTransaction({
      date: '2026-01-15', description: 'Salary', category: 'Income',
      categoryId: 'c1', type: 'income', amount: 1000000,
      paymentMethod: 'Bank BCA', notes: '',
    });
    await createTransaction({
      date: '2026-01-15', description: 'Top Up', category: 'Transfer',
      categoryId: 'c2', type: 'income', amount: 5000000,
      paymentMethod: 'GoPay', notes: '',
    });
    const result = await listPaymentMethodBalances();
    expect(result.data![0].name).toBe('GoPay');
    expect(result.data![1].name).toBe('Bank BCA');
  });
});
```

- [ ] **Step 2: Run tests — expect failure (service does not exist yet)**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm test -- balance.service
```
Expected: fail with "Cannot find module '@/server/services/balance.service'"

- [ ] **Step 3: Implement `balance.service.ts`**

Create `src/server/services/balance.service.ts`:
```typescript
import { getDb } from '@/server/db/client';
import { ensureSeeded } from '@/server/db/seed';
import type { PaymentMethodBalance } from '@/lib/api/contracts';

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string };
}

interface BalanceRow {
  id: string;
  name: string;
  type: string;
  icon: string;
  income: number;
  expense: number;
  balance: number;
}

export async function listPaymentMethodBalances(): Promise<ServiceResult<PaymentMethodBalance[]>> {
  await ensureSeeded();
  const db = await getDb();

  const { rows } = await db.query<BalanceRow>(`
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
  `);

  return {
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as 'bank' | 'cash' | 'ewallet',
      icon: row.icon,
      income: Number(row.income),
      expense: Number(row.expense),
      balance: Number(row.balance),
    })),
  };
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm test -- balance.service
```
Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/balance.service.ts src/__tests__/balance.service.test.ts
git commit -m "feat: add balance service with payment method balance computation"
```

---

### Task 4: Balance API route

**Files:**
- Create: `src/app/api/payment-methods/balances/route.ts`

- [ ] **Step 1: Create the API route**

Create `src/app/api/payment-methods/balances/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { listPaymentMethodBalances } from '@/server/services/balance.service';

export async function GET() {
  const result = await listPaymentMethodBalances();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: { balances: result.data } });
}
```

- [ ] **Step 2: Smoke-test manually (dev server)**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run dev
```
In a browser or curl: `GET http://localhost:3000/api/payment-methods/balances`
Expected: `{ "data": { "balances": [ ... ] } }` — array of payment method objects with `balance`, `income`, `expense` fields.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/payment-methods/balances/route.ts
git commit -m "feat: add GET /api/payment-methods/balances endpoint"
```

---

### Task 5: Balance feature UI — `useBalances`, `BalanceCard`, `BalanceGrid`, `AccountBalancesWidget`

**Files:**
- Create: `src/features/balances/types.ts`
- Create: `src/features/balances/useBalances.ts`
- Create: `src/features/balances/BalanceCard.tsx`
- Create: `src/features/balances/BalanceGrid.tsx`
- Create: `src/features/balances/AccountBalancesWidget.tsx`

> **Note:** `PaymentMethodBalance` is already defined in `src/lib/api/contracts.ts`. The `types.ts` file in `src/features/balances/` re-exports it for local convenience.

- [ ] **Step 1: Create `src/features/balances/types.ts`**

```typescript
export type { PaymentMethodBalance } from '@/lib/api/contracts';
```

- [ ] **Step 2: Create `src/features/balances/useBalances.ts`**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import type { PaymentMethodBalance } from './types';

interface UseBalancesReturn {
  balances: PaymentMethodBalance[];
  totalBalance: number;
  isLoading: boolean;
}

export function useBalances(): UseBalancesReturn {
  const initialized = useStore((s) => s.initialized);

  const { data, isLoading } = useQuery({
    queryKey: ['payment-method-balances'],
    queryFn: async () => {
      const result = await api.balances.list();
      return result.data?.balances ?? [];
    },
    enabled: initialized,
    staleTime: 30_000,
  });

  const balances = data ?? [];
  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);

  return { balances, totalBalance, isLoading: !initialized || isLoading };
}
```

- [ ] **Step 3: Create `src/features/balances/BalanceCard.tsx`**

```typescript
'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Building2, Wallet, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { staggerGridItem, tapScale } from '@/lib/motion';
import type { PaymentMethodBalance } from './types';

const TYPE_LABELS: Record<PaymentMethodBalance['type'], { en: string; id: string }> = {
  bank:    { en: 'Bank',    id: 'Bank' },
  cash:    { en: 'Cash',   id: 'Tunai' },
  ewallet: { en: 'E-Wallet', id: 'E-Wallet' },
};

const TYPE_ICONS: Record<PaymentMethodBalance['type'], typeof Building2> = {
  bank:    Building2,
  cash:    Wallet,
  ewallet: Smartphone,
};

interface BalanceCardProps {
  balance: PaymentMethodBalance;
  locale: 'en' | 'id';
}

export function BalanceCard({ balance, locale }: BalanceCardProps) {
  const Icon = TYPE_ICONS[balance.type];
  const typeLabel = TYPE_LABELS[balance.type][locale];
  const isPositive = balance.balance > 0;

  return (
    <motion.div
      variants={staggerGridItem}
      whileTap={tapScale}
      className="bg-card border-border rounded-2xl border p-4 shadow-sm"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
            <Icon className="text-primary h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{balance.name}</p>
            <p className="text-muted-foreground text-xs">{typeLabel}</p>
          </div>
        </div>
      </div>

      {/* Balance */}
      <p
        className={cn(
          'font-mono text-xl font-bold tracking-tight',
          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
        )}
      >
        {formatCurrency(balance.balance)}
      </p>

      {/* Income / Expense breakdown */}
      <div className="mt-2 flex gap-3">
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          {formatCurrency(balance.income)}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <TrendingDown className="h-3 w-3 text-red-500" />
          {formatCurrency(balance.expense)}
        </span>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Create `src/features/balances/BalanceGrid.tsx`**

```typescript
'use client';

import { motion } from 'framer-motion';
import { staggerGrid } from '@/lib/motion';
import { BalanceCard } from './BalanceCard';
import type { PaymentMethodBalance } from './types';

interface BalanceGridProps {
  balances: PaymentMethodBalance[];
  locale: 'en' | 'id';
  isLoading?: boolean;
}

export function BalanceGrid({ balances, locale, isLoading }: BalanceGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-muted h-28 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        {locale === 'id' ? 'Belum ada metode pembayaran.' : 'No payment methods yet.'}
      </p>
    );
  }

  return (
    <motion.div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      variants={staggerGrid}
      initial="hidden"
      animate="show"
    >
      {balances.map((b) => (
        <BalanceCard key={b.id} balance={b} locale={locale} />
      ))}
    </motion.div>
  );
}
```

- [ ] **Step 5: Create `src/features/balances/AccountBalancesWidget.tsx`**

```typescript
'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { useBalances } from './useBalances';
import { BalanceGrid } from './BalanceGrid';

export function AccountBalancesWidget() {
  const locale = useLocale();
  const { balances, totalBalance, isLoading } = useBalances();

  return (
    <div className="bg-card border-border rounded-2xl border p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{t(locale, 'accountBalances')}</h3>
        <span className="text-muted-foreground font-mono text-sm font-medium">
          {formatCurrency(totalBalance)}
        </span>
      </div>
      <BalanceGrid balances={balances} locale={locale} isLoading={isLoading} />
    </div>
  );
}
```

- [ ] **Step 6: Typecheck**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run typecheck
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/balances/
git commit -m "feat: add balance feature — useBalances hook, BalanceCard, BalanceGrid, AccountBalancesWidget"
```

---

### Task 6: Wire `AccountBalancesWidget` into dashboard and reports page

**Files:**
- Modify: `src/components/dashboard/DashboardContent.tsx`
- Modify: `src/app/reports/page.tsx`

- [ ] **Step 1: Add `AccountBalancesWidget` to `DashboardContent.tsx`**

In `src/components/dashboard/DashboardContent.tsx`:

1. Add import at the top:
```typescript
import { AccountBalancesWidget } from '@/features/balances/AccountBalancesWidget';
```

2. After the "Bills, Savings, Payment Methods" `motion.div` section (after the closing `</motion.div>` that contains `BillsChecklist`, `SavingsGoals`, `PaymentMethodsSummary`), add:
```typescript
          {/* Account Balances */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <AccountBalancesWidget />
          </motion.div>
```

- [ ] **Step 2: Add `BalanceGrid` to the reports page**

In `src/app/reports/page.tsx`:

1. Add imports at the top:
```typescript
import { BalanceGrid } from '@/features/balances/BalanceGrid';
import { useBalances } from '@/features/balances/useBalances';
import { t } from '@/lib/i18n';
```

2. Inside the page component, add:
```typescript
const { balances, isLoading: balancesLoading } = useBalances();
```

3. At the bottom of the returned JSX (before the closing wrapper), add:
```tsx
{/* Account Balances Snapshot */}
<motion.div {...fadeInUp} transition={{ duration: 0.3, delay: 0.2 }}>
  <h2 className="mb-4 text-lg font-semibold">{t(locale, 'accountBalances')}</h2>
  <BalanceGrid balances={balances} locale={locale} isLoading={balancesLoading} />
</motion.div>
```

> **Note:** Read the existing reports page fully first to understand its current imports and structure before adding. Match its existing animation/layout patterns.

- [ ] **Step 3: Typecheck + run all tests**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run typecheck && npm test
```
Expected: no type errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/DashboardContent.tsx src/app/reports/page.tsx
git commit -m "feat: wire AccountBalancesWidget into dashboard and reports page"
```

---

## Chunk 3: Feature 2 — Monthly & Yearly Downloadable Reports

### Task 7: `report.service.ts` + test

**Files:**
- Create: `src/server/services/report.service.ts`
- Create: `src/__tests__/report.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/report.service.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { getMonthlyReportData, getAnnualReportData } from '@/server/services/report.service';
import { createPaymentMethod } from '@/server/services/payment-method.service';
import { createTransaction } from '@/server/services/transaction.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('getMonthlyReportData', () => {
  it('returns zero totals for a month with no transactions', async () => {
    const result = await getMonthlyReportData(0, 2026);
    expect(result.error).toBeUndefined();
    expect(result.data!.totalIncome).toBe(0);
    expect(result.data!.totalExpense).toBe(0);
    expect(result.data!.incomeTransactions).toHaveLength(0);
    expect(result.data!.expenseTransactions).toHaveLength(0);
  });

  it('separates income and expense transactions correctly', async () => {
    await createTransaction({
      date: '2026-01-10', description: 'Salary', category: 'Income',
      categoryId: 'c1', type: 'income', amount: 5000000,
      paymentMethod: 'Bank BCA', notes: '',
    });
    await createTransaction({
      date: '2026-01-15', description: 'Food', category: 'Food',
      categoryId: 'c2', type: 'expense', amount: 200000,
      paymentMethod: 'Bank BCA', notes: '',
    });
    // month=0 (January), year=2026
    const result = await getMonthlyReportData(0, 2026);
    expect(result.data!.incomeTransactions).toHaveLength(1);
    expect(result.data!.expenseTransactions).toHaveLength(1);
    expect(result.data!.totalIncome).toBe(5000000);
    expect(result.data!.totalExpense).toBe(200000);
  });

  it('groups expense transactions by category', async () => {
    await createTransaction({
      date: '2026-01-15', description: 'Lunch', category: 'Food',
      categoryId: 'c2', type: 'expense', amount: 50000,
      paymentMethod: 'Cash', notes: '',
    });
    await createTransaction({
      date: '2026-01-16', description: 'Dinner', category: 'Food',
      categoryId: 'c2', type: 'expense', amount: 80000,
      paymentMethod: 'Cash', notes: '',
    });
    await createTransaction({
      date: '2026-01-17', description: 'Bus', category: 'Transport',
      categoryId: 'c3', type: 'expense', amount: 20000,
      paymentMethod: 'Cash', notes: '',
    });
    const result = await getMonthlyReportData(0, 2026);
    const food = result.data!.expenseSummaryByCategory.find(s => s.category === 'Food');
    expect(food!.total).toBe(130000);
    expect(result.data!.expenseSummaryByCategory).toHaveLength(2);
  });

  it('does not include transactions from other months', async () => {
    await createTransaction({
      date: '2026-02-10', description: 'Feb Salary', category: 'Income',
      categoryId: 'c1', type: 'income', amount: 5000000,
      paymentMethod: 'Bank BCA', notes: '',
    });
    const result = await getMonthlyReportData(0, 2026); // January
    expect(result.data!.incomeTransactions).toHaveLength(0);
  });
});

describe('getAnnualReportData', () => {
  it('returns 12 months in monthly breakdown', async () => {
    const result = await getAnnualReportData(2026);
    expect(result.error).toBeUndefined();
    expect(result.data!.monthlyBreakdown).toHaveLength(12);
  });

  it('computes annual totals correctly', async () => {
    await createTransaction({
      date: '2026-01-10', description: 'Salary Jan', category: 'Income',
      categoryId: 'c1', type: 'income', amount: 5000000,
      paymentMethod: 'Bank BCA', notes: '',
    });
    await createTransaction({
      date: '2026-03-10', description: 'Salary Mar', category: 'Income',
      categoryId: 'c1', type: 'income', amount: 5000000,
      paymentMethod: 'Bank BCA', notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.data!.totalIncome).toBe(10000000);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm test -- report.service
```
Expected: fail with "Cannot find module '@/server/services/report.service'"

- [ ] **Step 3: Implement `report.service.ts`**

Create `src/server/services/report.service.ts`:
```typescript
import { createTransactionRepository } from '@/server/repositories/transaction.repository';
import { listBills } from '@/server/services/bill.service';
import { listPaymentMethodBalances } from '@/server/services/balance.service';
import { ensureSeeded } from '@/server/db/seed';
import type { MonthlyReportData, AnnualReportData } from '@/lib/api/contracts';

const txRepo = createTransactionRepository();

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string };
}

export async function getMonthlyReportData(
  month: number,
  year: number
): Promise<ServiceResult<MonthlyReportData>> {
  await ensureSeeded();

  // Fetch income and expense transactions for the month
  const [incomeResult, expenseResult, balancesResult, billsResult] = await Promise.all([
    txRepo.findFiltered({ month, year, type: 'income', page: 1, pageSize: 1000 }),
    txRepo.findFiltered({ month, year, type: 'expense', page: 1, pageSize: 1000 }),
    listPaymentMethodBalances(),
    listBills({ month, year }),
  ]);

  const incomeTransactions = incomeResult.rows;
  const expenseTransactions = expenseResult.rows;
  const paymentMethodBalances = balancesResult.data ?? [];
  const bills = billsResult.data ?? [];

  const totalIncome = incomeTransactions.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((s, t) => s + t.amount, 0);
  const totalAssets = paymentMethodBalances.reduce((s, b) => s + b.balance, 0);

  // Group expenses by category
  const categoryMap = new Map<string, number>();
  for (const tx of expenseTransactions) {
    categoryMap.set(tx.category, (categoryMap.get(tx.category) ?? 0) + tx.amount);
  }
  const expenseSummaryByCategory = Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return {
    data: {
      month,
      year,
      totalIncome,
      totalExpense,
      totalAssets,
      incomeTransactions,
      expenseTransactions,
      expenseSummaryByCategory,
      paymentMethodBalances,
      bills,
    },
  };
}

export async function getAnnualReportData(
  year: number
): Promise<ServiceResult<AnnualReportData>> {
  await ensureSeeded();

  const [monthSummaries, balancesResult, allYearResult] = await Promise.all([
    txRepo.getMonthSummaries(year),
    listPaymentMethodBalances(),
    txRepo.findFiltered({ year, yearOnly: true, page: 1, pageSize: 10000 }),
  ]);

  const paymentMethodBalances = balancesResult.data ?? [];

  // Build 12-month breakdown (fill missing months with zeros)
  // Note: getMonthSummaries uses `CAST(SUBSTR(date,6,2) AS INTEGER) - 1 as month`
  // which already returns 0-based months (January=0 ... December=11).
  const summaryMap = new Map(monthSummaries.map((s) => [s.month, s]));
  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const s = summaryMap.get(i); // 0-based: i=0 → January
    return {
      month: i,
      income: s?.income ?? 0,
      expense: s?.expense ?? 0,
      net: (s?.income ?? 0) - (s?.expense ?? 0),
    };
  });

  const totalIncome = monthlyBreakdown.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthlyBreakdown.reduce((s, m) => s + m.expense, 0);
  const totalAssets = paymentMethodBalances.reduce((s, b) => s + b.balance, 0);

  // Top categories by total
  const catMap = new Map<string, { total: number; type: 'income' | 'expense' }>();
  for (const tx of allYearResult.rows) {
    const existing = catMap.get(tx.category);
    if (existing) {
      existing.total += tx.amount;
    } else {
      catMap.set(tx.category, { total: tx.amount, type: tx.type });
    }
  }
  const topCategories = Array.from(catMap.entries())
    .map(([category, { total, type }]) => ({ category, type, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    data: {
      year,
      totalIncome,
      totalExpense,
      totalAssets,
      monthlyBreakdown,
      topCategories,
      paymentMethodBalances,
      transactions: allYearResult.rows,
    },
  };
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm test -- report.service
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/report.service.ts src/__tests__/report.service.test.ts
git commit -m "feat: add report service for monthly and annual data aggregation"
```

---

### Task 8: Report API routes

**Files:**
- Create: `src/app/api/reports/monthly/route.ts`
- Create: `src/app/api/reports/annual/route.ts`

- [ ] **Step 1: Create monthly report route**

Create `src/app/api/reports/monthly/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyReportData } from '@/server/services/report.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const monthStr = searchParams.get('month');
  const yearStr = searchParams.get('year');

  const month = monthStr !== null ? parseInt(monthStr, 10) : NaN;
  const year = yearStr !== null ? parseInt(yearStr, 10) : NaN;

  if (isNaN(month) || isNaN(year) || month < 0 || month > 11 || year < 2000) {
    return NextResponse.json(
      { error: { message: 'Valid month (0-11) and year are required', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  const result = await getMonthlyReportData(month, year);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: { report: result.data } });
}
```

- [ ] **Step 2: Create annual report route**

Create `src/app/api/reports/annual/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAnnualReportData } from '@/server/services/report.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearStr = searchParams.get('year');
  const year = yearStr !== null ? parseInt(yearStr, 10) : NaN;

  if (isNaN(year) || year < 2000) {
    return NextResponse.json(
      { error: { message: 'Valid year is required', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  const result = await getAnnualReportData(year);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: { report: result.data } });
}
```

- [ ] **Step 3: Typecheck**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/reports/monthly/route.ts src/app/api/reports/annual/route.ts
git commit -m "feat: add GET /api/reports/monthly and /api/reports/annual endpoints"
```

---

### Task 9: `report-generator.ts` (XLSX builder)

**Files:**
- Create: `src/features/reports/types.ts`
- Create: `src/features/reports/report-generator.ts`

> **Reference:** The template file `Financial Tracker Downloadable Report (Monthly).xlsx` at the repo root is the authoritative source for cell positions. Open it in Excel to verify column letters if needed. Row numbers below are 1-based Excel rows. SheetJS `aoa_to_sheet` takes a 0-based array, so Excel row N = array index N-1.

- [ ] **Step 1: Create `src/features/reports/types.ts`**

```typescript
export type { MonthlyReportData, AnnualReportData, PaymentMethodBalance } from '@/lib/api/contracts';
```

- [ ] **Step 2: Create `src/features/reports/report-generator.ts`**

```typescript
import * as XLSX from 'xlsx';
import type { MonthlyReportData, AnnualReportData } from './types';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// Column letter helpers (A=0, B=1, ...)
function colToLetter(col: number): string {
  return String.fromCharCode(65 + col);
}

function cellAddress(row: number, col: number): string {
  // row and col are 0-based
  return `${colToLetter(col)}${row + 1}`;
}

function dateToExcelSerial(dateStr: string): number {
  // Excel serial: days since 1899-12-30
  const d = new Date(dateStr);
  const msPerDay = 86400000;
  const excelEpoch = new Date('1899-12-30').getTime();
  return (d.getTime() - excelEpoch) / msPerDay;
}

export function generateMonthlyReport(data: MonthlyReportData): void {
  const wb = XLSX.utils.book_new();

  // Build a sparse array-of-arrays (26 columns wide, enough rows)
  // We'll use a plain object to set cells directly for precision
  const ws: XLSX.WorkSheet = {};

  // Helper to set a cell
  const set = (excelRow: number, colLetter: string, value: unknown) => {
    const addr = `${colLetter}${excelRow}`;
    if (typeof value === 'number') {
      ws[addr] = { v: value, t: 'n' };
    } else if (typeof value === 'boolean') {
      ws[addr] = { v: value, t: 'b' };
    } else {
      ws[addr] = { v: String(value ?? ''), t: 's' };
    }
  };

  // ── Header Section ──────────────────────────────────────────────────────────
  // Row 4: Title
  set(4, 'B', 'Monthly Report');

  // Row 7: Date serial for report month (1st of month)
  const firstOfMonth = `${data.year}-${String(data.month + 1).padStart(2, '0')}-01`;
  set(7, 'B', dateToExcelSerial(firstOfMonth));

  // Row 9: Labels
  set(9, 'B', 'B U L A N');
  set(9, 'D', 'T A H U N');

  // Row 10: Month name, Year, Total Income
  set(10, 'B', MONTH_NAMES_ID[data.month]);
  set(10, 'D', data.year);
  set(10, 'F', 'Total Pemasukan');
  set(10, 'G', data.totalIncome);

  // Row 12: Total Pengeluaran label + value
  set(12, 'B', 'T O T A L   A S S E T S');
  set(12, 'F', 'Total Pengeluaran');
  set(12, 'G', data.totalExpense);

  // Row 13: Total Assets value
  set(13, 'B', data.totalAssets);

  // ── Column Headers ──────────────────────────────────────────────────────────
  // Row 16: Section labels
  set(16, 'B', 'KATEGORI');
  set(16, 'F', 'P E M A S U K A N');
  set(16, 'L', 'P E N G E L U A R A N');
  set(16, 'S', 'Rekap Pengeluaran');

  // Row 17: Sub-headers
  set(17, 'B', 'Pemasukan');
  set(17, 'D', 'Pengeluaran');
  set(17, 'F', 'No');
  set(17, 'G', 'Tanggal');
  set(17, 'H', 'Jumlah');
  set(17, 'I', 'Kategori');
  set(17, 'J', 'Method');
  set(17, 'L', 'No');
  set(17, 'M', 'Tanggal');
  set(17, 'N', 'Jumlah');
  set(17, 'O', 'Kategori');
  set(17, 'P', 'Account');
  set(17, 'Q', 'Notes');
  set(17, 'S', 'Kategori');
  set(17, 'T', 'Total');

  // ── Income & Expense Transactions (starting at row 18) ─────────────────────
  const startRow = 18;

  // Income transactions (cols F-J)
  data.incomeTransactions.forEach((tx, i) => {
    const r = startRow + i;
    set(r, 'F', i + 1);
    set(r, 'G', tx.date);
    set(r, 'H', tx.amount);
    set(r, 'I', tx.category);
    set(r, 'J', tx.paymentMethod);
  });

  // Expense transactions (cols L-Q)
  data.expenseTransactions.forEach((tx, i) => {
    const r = startRow + i;
    set(r, 'L', i + 1);
    set(r, 'M', tx.date);
    set(r, 'N', tx.amount);
    set(r, 'O', tx.category);
    set(r, 'P', tx.paymentMethod);
    set(r, 'Q', tx.notes);
  });

  // Expense summary by category (cols S-T, starting row 18)
  data.expenseSummaryByCategory.forEach((item, i) => {
    const r = startRow + i;
    set(r, 'S', item.category);
    set(r, 'T', item.total);
  });

  // ── Payment Methods (row 32+) ───────────────────────────────────────────────
  set(32, 'B', 'Payment Method');
  set(32, 'D', 'Jumlah');
  data.paymentMethodBalances.forEach((pm, i) => {
    const r = 34 + i;
    set(r, 'B', pm.name);
    set(r, 'D', pm.balance);
  });

  // ── Bills Section (row 48+) ─────────────────────────────────────────────────
  set(48, 'B', 'C A T A T A N   T A G I H A N');
  set(50, 'C', 'Tagihan');
  set(50, 'D', 'Jumlah');
  data.bills.forEach((bill, i) => {
    const r = 51 + i;
    set(r, 'B', bill.isPaid);
    set(r, 'C', bill.name);
    set(r, 'D', bill.amount);
  });

  // ── Set worksheet ref range ──────────────────────────────────────────────────
  const lastRow = Math.max(
    60,
    startRow + Math.max(data.incomeTransactions.length, data.expenseTransactions.length) + 5,
    51 + data.bills.length + 2,
    34 + data.paymentMethodBalances.length + 2
  );
  ws['!ref'] = `A1:Z${lastRow}`;

  // Column widths
  ws['!cols'] = [
    { wch: 3 },   // A
    { wch: 20 },  // B
    { wch: 20 },  // C
    { wch: 12 },  // D
    { wch: 3 },   // E
    { wch: 5 },   // F (No)
    { wch: 12 },  // G (Tanggal)
    { wch: 14 },  // H (Jumlah)
    { wch: 18 },  // I (Kategori)
    { wch: 14 },  // J (Method)
    { wch: 3 },   // K
    { wch: 5 },   // L (No)
    { wch: 12 },  // M (Tanggal)
    { wch: 14 },  // N (Jumlah)
    { wch: 18 },  // O (Kategori)
    { wch: 14 },  // P (Account)
    { wch: 22 },  // Q (Notes)
    { wch: 3 },   // R
    { wch: 18 },  // S (Rekap Kategori)
    { wch: 14 },  // T (Total)
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report');

  // Trigger download
  const monthName = MONTH_NAMES_ID[data.month];
  XLSX.writeFile(wb, `Laporan_Bulanan_${monthName}_${data.year}.xlsx`);
}

export function generateAnnualReport(data: AnnualReportData): void {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Annual Summary ─────────────────────────────────────────────────
  const summaryRows: unknown[][] = [
    ['Ringkasan Tahunan', data.year],
    [],
    ['Bulan', 'Pemasukan', 'Pengeluaran', 'Net'],
    ...data.monthlyBreakdown.map((m) => [
      MONTH_NAMES_ID[m.month],
      m.income,
      m.expense,
      m.net,
    ]),
    [],
    ['Total', data.totalIncome, data.totalExpense, data.totalIncome - data.totalExpense],
    [],
    ['Total Aset', data.totalAssets],
    [],
    ['Kategori Teratas', '', 'Jumlah', 'Tipe'],
    ...data.topCategories.map((c) => [c.category, '', c.total, c.type]),
    [],
    ['Metode Pembayaran', '', 'Saldo'],
    ...data.paymentMethodBalances.map((p) => [p.name, '', p.balance]),
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 22 }, { wch: 4 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Tahunan');

  // ── Sheet 2: Transaction Detail ─────────────────────────────────────────────
  // All transactions for the year sorted by date, with month label grouping column.
  const detailRows: unknown[][] = [
    [`Detail Transaksi — ${data.year}`, '', '', '', '', '', ''],
    [],
    ['Bulan', 'Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Jumlah', 'Metode'],
  ];
  // Sort transactions by date
  const sorted = [...data.transactions].sort((a, b) => a.date.localeCompare(b.date));
  for (const tx of sorted) {
    const txDate = new Date(tx.date);
    const monthLabel = MONTH_NAMES_ID[txDate.getMonth()];
    detailRows.push([monthLabel, tx.date, tx.description, tx.category, tx.type, tx.amount, tx.paymentMethod]);
  }

  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Transaksi');

  XLSX.writeFile(wb, `Laporan_Tahunan_${data.year}.xlsx`);
}
```

- [ ] **Step 3: Typecheck**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/reports/types.ts src/features/reports/report-generator.ts
git commit -m "feat: add XLSX report generator for monthly template and annual report"
```

---

### Task 10: `useReportData` hook + `ReportDownloader` component + wire to reports page

**Files:**
- Create: `src/features/reports/useReportData.ts`
- Create: `src/features/reports/ReportDownloader.tsx`
- Modify: `src/app/reports/page.tsx`

- [ ] **Step 1: Create `src/features/reports/useReportData.ts`**

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';
import { t } from '@/lib/i18n';
import { generateMonthlyReport, generateAnnualReport } from './report-generator';

interface UseReportDataReturn {
  availableYears: number[];
  isLoadingYears: boolean;
  isGenerating: boolean;
  downloadMonthly: (month: number, year: number, locale: 'en' | 'id') => Promise<void>;
  downloadAnnual: (year: number, locale: 'en' | 'id') => Promise<void>;
}

export function useReportData(): UseReportDataReturn {
  const initialized = useStore((s) => s.initialized);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: folderData, isLoading: isLoadingYears } = useQuery({
    queryKey: ['folder-summary'],
    queryFn: async () => {
      const result = await api.dashboard.folderSummary();
      return result.data?.years ?? [];
    },
    enabled: initialized,
  });

  const availableYears = (folderData ?? []).map((y) => y.year).sort((a, b) => b - a);

  const downloadMonthly = useCallback(
    async (month: number, year: number, locale: 'en' | 'id') => {
      setIsGenerating(true);
      try {
        const result = await api.reports.monthly(month, year);
        if (result.error || !result.data?.report) {
          toast.error(t(locale, 'reportError'));
          return;
        }
        generateMonthlyReport(result.data.report);
        toast.success(t(locale, 'reportDownloaded'));
      } catch {
        toast.error(t(locale, 'reportError'));
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const downloadAnnual = useCallback(
    async (year: number, locale: 'en' | 'id') => {
      setIsGenerating(true);
      try {
        const result = await api.reports.annual(year);
        if (result.error || !result.data?.report) {
          toast.error(t(locale, 'reportError'));
          return;
        }
        generateAnnualReport(result.data.report);
        toast.success(t(locale, 'reportDownloaded'));
      } catch {
        toast.error(t(locale, 'reportError'));
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { availableYears, isLoadingYears, isGenerating, downloadMonthly, downloadAnnual };
}
```

- [ ] **Step 2: Create `src/features/reports/ReportDownloader.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, useLocale } from '@/lib/i18n';
import { MONTH_NAMES } from '@/lib/constants';
import { useReportData } from './useReportData';

export function ReportDownloader() {
  const locale = useLocale();
  const { availableYears, isLoadingYears, isGenerating, downloadMonthly, downloadAnnual } =
    useReportData();

  const currentYear = new Date().getFullYear();
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const years = availableYears.length > 0 ? availableYears : [currentYear];

  const handleDownload = async () => {
    if (reportType === 'monthly') {
      await downloadMonthly(selectedMonth, selectedYear, locale);
    } else {
      await downloadAnnual(selectedYear, locale);
    }
  };

  return (
    <div className="bg-card border-border rounded-2xl border p-5 shadow-sm">
      <h3 className="mb-4 font-semibold">{t(locale, 'downloadReport')}</h3>

      {/* Type toggle */}
      <div className="bg-muted mb-4 flex w-fit rounded-lg p-1">
        <button
          onClick={() => setReportType('monthly')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
            reportType === 'monthly'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t(locale, 'reportTypeMonthly')}
        </button>
        <button
          onClick={() => setReportType('yearly')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
            reportType === 'yearly'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t(locale, 'reportTypeYearly')}
        </button>
      </div>

      {/* Selectors */}
      <div className="mb-4 flex flex-wrap gap-3">
        {reportType === 'monthly' && (
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
        )}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          disabled={isLoadingYears}
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Download button */}
      <Button onClick={handleDownload} disabled={isGenerating} className="gap-2">
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t(locale, 'generatingReport')}
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            {t(locale, 'downloadReport')}
          </>
        )}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Add `ReportDownloader` to the existing `/reports` page**

Read `src/app/reports/page.tsx` first to understand its current structure and bottom of the JSX. Then add at the bottom of the page content (before the closing container div):
```typescript
import { ReportDownloader } from '@/features/reports/ReportDownloader';
```
And in the JSX, add `<ReportDownloader />` as the last section.

- [ ] **Step 4: Typecheck + run all tests**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run typecheck && npm test
```
Expected: no type errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/ src/app/reports/page.tsx
git commit -m "feat: add report downloader — useReportData hook, ReportDownloader UI, wired to reports page"
```

---

## Chunk 4: Feature 3 — Load-More Transactions

### Task 11: `useAllTransactions` hook

**Files:**
- Create: `src/features/transactions/useAllTransactions.ts`

> **Important:** The actual `useTransactions` hook uses these exact field names (different from the spec's initial draft): `categoryFilter`/`setCategoryFilter`, `paymentMethodFilter`/`setPaymentMethodFilter`, `clearFilters`, `hasActiveFilters`, `setFormOpen`. The hook below mirrors these exactly to be a drop-in replacement.

- [ ] **Step 1: Create `src/features/transactions/useAllTransactions.ts`**

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/store';
import { api } from '@/lib/api/client';
import { type Transaction, type PaymentMethod } from '@/lib/types';

const PAGE_SIZE = 50;

interface UseAllTransactionsReturn {
  // Data
  transactions: Transaction[];
  income: number;
  expense: number;
  total: number;

  // Load-more
  hasMore: boolean;
  loadMore: () => void;
  isLoading: boolean;
  isLoadingMore: boolean;

  // Filters
  search: string;
  setSearch: (v: string) => void;
  typeFilter: 'all' | 'income' | 'expense';
  setTypeFilter: (v: 'all' | 'income' | 'expense') => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (v: string) => void;
  allMonths: boolean;
  setAllMonths: (v: boolean) => void;
  yearOnly: boolean;
  setYearOnly: (v: boolean) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;

  // Reference data
  paymentMethods: PaymentMethod[];

  // Form
  formOpen: boolean;
  setFormOpen: (v: boolean) => void;
  editingTx: Transaction | undefined;
  openAdd: () => void;
  openEdit: (tx: Transaction) => void;
  openDuplicate: (tx: Transaction) => void;
  closeForm: () => void;
  deleteTransaction: (id: string) => void;

  // Selection (bulk)
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isAllSelected: boolean;
  bulkDeleteTransactions: () => Promise<number>;

  // States
  isEmpty: boolean;
  hasNoResults: boolean;
}

export function useAllTransactions(): UseAllTransactionsReturn {
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const initialized = useStore((s) => s.initialized);
  const queryClient = useQueryClient();

  const [search, setSearchState] = useState('');
  const [typeFilter, setTypeFilterState] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilterState] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilterState] = useState('');
  const [allMonths, setAllMonthsState] = useState(false);
  const [yearOnly, setYearOnlyState] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter key for query cache invalidation and accumulation reset
  const filterKey = [
    allMonths ? 'all' : yearOnly ? `year-${year}` : `${month}-${year}`,
    typeFilter,
    categoryFilter,
    paymentMethodFilter,
    search,
  ].join('|');

  // Filter setters — each resets selection
  const setSearch = useCallback((v: string) => { setSearchState(v); setSelectedIds(new Set()); }, []);
  const setTypeFilter = useCallback((v: 'all' | 'income' | 'expense') => { setTypeFilterState(v); setSelectedIds(new Set()); }, []);
  const setCategoryFilter = useCallback((v: string) => { setCategoryFilterState(v); setSelectedIds(new Set()); }, []);
  const setPaymentMethodFilter = useCallback((v: string) => { setPaymentMethodFilterState(v); setSelectedIds(new Set()); }, []);
  const setAllMonths = useCallback((v: boolean) => { setAllMonthsState(v); if (v) setYearOnlyState(false); setSelectedIds(new Set()); }, []);
  const setYearOnly = useCallback((v: boolean) => { setYearOnlyState(v); if (v) setAllMonthsState(false); setSelectedIds(new Set()); }, []);

  const clearFilters = useCallback(() => {
    setSearchState('');
    setTypeFilterState('all');
    setCategoryFilterState('');
    setPaymentMethodFilterState('');
    setAllMonthsState(false);
    setYearOnlyState(false);
    setSelectedIds(new Set());
  }, []);

  const hasActiveFilters =
    search !== '' || typeFilter !== 'all' || categoryFilter !== '' ||
    paymentMethodFilter !== '' || allMonths || yearOnly;

  // Payment methods reference data
  const { data: pmData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const result = await api.paymentMethods.list();
      return result.data?.paymentMethods ?? [];
    },
    enabled: initialized,
  });
  const paymentMethods = pmData ?? [];

  // Infinite query for load-more accumulation
  const {
    data,
    isLoading: isQueryLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['all-transactions', filterKey],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, unknown> = { page: pageParam, pageSize: PAGE_SIZE };
      if (yearOnly) {
        params.year = year;
        params.yearOnly = true;
      } else if (!allMonths) {
        params.month = month;
        params.year = year;
      }
      if (typeFilter !== 'all') params.type = typeFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (paymentMethodFilter) params.paymentMethod = paymentMethodFilter;
      if (search) params.search = search;

      const result = await api.transactions.list(
        params as Parameters<typeof api.transactions.list>[0]
      );
      return result.data ?? null;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      const next = lastPage.page + 1;
      return next <= lastPage.totalPages ? next : undefined;
    },
    initialPageParam: 1,
    enabled: initialized,
  });

  const transactions = data?.pages.flatMap((p) => p?.transactions ?? []) ?? [];
  const firstPage = data?.pages[0];
  const total = firstPage?.total ?? 0;
  const income = firstPage?.income ?? 0;
  const expense = firstPage?.expense ?? 0;
  const isLoading = !initialized || isQueryLoading;

  // Form actions
  const openAdd = useCallback(() => { setEditingTx(undefined); setFormOpen(true); }, []);
  const openEdit = useCallback((tx: Transaction) => { setEditingTx(tx); setFormOpen(true); }, []);
  const openDuplicate = useCallback((tx: Transaction) => {
    const today = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    setEditingTx({ ...tx, id: '', date: today });
    setFormOpen(true);
  }, [month, year]);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingTx(undefined);
    queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['payment-method-balances'] });
  }, [queryClient]);

  const deleteTransaction = useCallback((id: string) => {
    api.transactions.delete(id).then(() => {
      queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['payment-method-balances'] });
    });
  }, [queryClient]);

  // Selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const selectAll = useCallback(() => setSelectedIds(new Set(transactions.map((tx) => tx.id))), [transactions]);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const isAllSelected = transactions.length > 0 && selectedIds.size === transactions.length;

  const bulkDeleteTransactions = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const result = await api.transactions.bulkDelete(ids);
    const deleted = result.data?.deleted ?? 0;
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['payment-method-balances'] });
    return deleted;
  }, [selectedIds, queryClient]);

  return {
    transactions, income, expense, total,
    hasMore: Boolean(hasNextPage),
    loadMore: fetchNextPage,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    search, setSearch,
    typeFilter, setTypeFilter,
    categoryFilter, setCategoryFilter,
    paymentMethodFilter, setPaymentMethodFilter,
    allMonths, setAllMonths,
    yearOnly, setYearOnly,
    hasActiveFilters, clearFilters,
    paymentMethods,
    formOpen, setFormOpen,
    editingTx, openAdd, openEdit, openDuplicate, closeForm, deleteTransaction,
    selectedIds, toggleSelect, selectAll, clearSelection, isAllSelected,
    bulkDeleteTransactions,
    isEmpty: !isLoading && total === 0 && !hasActiveFilters,
    hasNoResults: !isLoading && transactions.length === 0 && hasActiveFilters,
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/transactions/useAllTransactions.ts
git commit -m "feat: add useAllTransactions hook with load-more via useInfiniteQuery"
```

---

### Task 12: `LoadMoreButton`, `AllTransactionsView`, update transactions page

**Files:**
- Create: `src/features/transactions/LoadMoreButton.tsx`
- Create: `src/features/transactions/AllTransactionsView.tsx`
- Modify: `src/app/transactions/page.tsx`

- [ ] **Step 1: Create `src/features/transactions/LoadMoreButton.tsx`**

```typescript
'use client';

import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { t, useLocale } from '@/lib/i18n';
import { tapScale } from '@/lib/motion';

interface LoadMoreButtonProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  total: number;
  loadedCount: number;
  onLoadMore: () => void;
}

export function LoadMoreButton({
  hasMore,
  isLoadingMore,
  total,
  loadedCount,
  onLoadMore,
}: LoadMoreButtonProps) {
  const locale = useLocale();

  if (total === 0) return null;

  const remaining = total - loadedCount;

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      {hasMore ? (
        <motion.div whileTap={tapScale}>
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="gap-2"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t(locale, 'loading')}
              </>
            ) : (
              `${t(locale, 'loadMore')} 50 (${remaining} ${t(locale, 'remaining')})`
            )}
          </Button>
        </motion.div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {t(locale, 'allLoaded')} ({total})
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/features/transactions/AllTransactionsView.tsx`**

```typescript
'use client';

import { t, useLocale } from '@/lib/i18n';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { LoadMoreButton } from './LoadMoreButton';
import type { Transaction } from '@/lib/types';

interface AllTransactionsViewProps {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export function AllTransactionsView({
  transactions,
  total,
  hasMore,
  isLoadingMore,
  onLoadMore,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  isAllSelected,
  onEdit,
  onDuplicate,
  onDelete,
}: AllTransactionsViewProps) {
  const locale = useLocale();
  const loadedCount = transactions.length;

  return (
    <div>
      {/* Count label */}
      {total > 0 && (
        <p className="text-muted-foreground mb-3 text-sm">
          {t(locale, 'showing')} {loadedCount} {t(locale, 'of')} {total}{' '}
          {locale === 'id' ? 'transaksi' : 'transactions'}
        </p>
      )}

      <TransactionTable
        transactions={transactions}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onSelectAll={onSelectAll}
        isAllSelected={isAllSelected}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />

      <LoadMoreButton
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        total={total}
        loadedCount={loadedCount}
        onLoadMore={onLoadMore}
      />
    </div>
  );
}
```

- [ ] **Step 3: Update `src/app/transactions/page.tsx`**

Read the current `src/app/transactions/page.tsx` fully. Then:

1. Replace the import of `useTransactions` with `useAllTransactions`:
```typescript
// Remove:
import { useTransactions } from '@/hooks/useTransactions';
// Add:
import { useAllTransactions } from '@/features/transactions/useAllTransactions';
```

2. Add import for `AllTransactionsView`:
```typescript
import { AllTransactionsView } from '@/features/transactions/AllTransactionsView';
```

3. Replace the hook call — change `useTransactions()` to `useAllTransactions()`:
```typescript
const {
  transactions, income, expense, total,
  hasMore, loadMore, isLoading, isLoadingMore,
  // ... rest of destructured fields (remove page, setPage, totalPages, pageSize)
  // the field names for filters remain the same: search, setSearch, typeFilter, etc.
} = useAllTransactions();
```

4. Replace the `TransactionTable` + pagination block with `AllTransactionsView`:
```tsx
<AllTransactionsView
  transactions={transactions}
  total={total}
  hasMore={hasMore}
  isLoadingMore={isLoadingMore}
  onLoadMore={loadMore}
  selectedIds={selectedIds}
  onToggleSelect={toggleSelect}
  onSelectAll={selectAll}
  isAllSelected={isAllSelected}
  onEdit={openEdit}
  onDuplicate={openDuplicate}
  onDelete={deleteTransaction}
/>
```

> **Note:** Read the full current `page.tsx` carefully. The page has many features (keyboard shortcuts, export dropdown, filter panel, bulk action bar, form sheet, confirm dialogs). Only replace the data hook and the transaction list rendering. All other UI stays identical. The existing `TransactionTable` does not accept a `categories` prop — do not pass one.

- [ ] **Step 4: Typecheck + run all tests**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run typecheck && npm test
```
Expected: no type errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/transactions/ src/app/transactions/page.tsx
git commit -m "feat: add load-more transactions — LoadMoreButton, AllTransactionsView, update transactions page"
```

---

## Chunk 5: Feature 4 — Collapsible Sidebar Nav Groups

### Task 13: `nav-config.ts`

**Files:**
- Create: `src/features/navigation/nav-config.ts`

- [ ] **Step 1: Create `src/features/navigation/nav-config.ts`**

```typescript
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  LayoutDashboard,
  Receipt,
  Repeat,
  Target,
  CalendarCheck,
  PiggyBank,
  BarChart3,
  Upload,
  Download,
} from 'lucide-react';

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  labelKey?: string;           // omit for unlabeled groups
  defaultCollapsed?: boolean;  // defaults to false
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    // no labelKey — no header, not collapsible
    items: [
      { href: '/home', labelKey: 'home',      icon: Home },
      { href: '/',     labelKey: 'dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'finance',
    labelKey: 'groupFinance',
    defaultCollapsed: false,
    items: [
      { href: '/transactions', labelKey: 'transactions',         icon: Receipt },
      { href: '/recurring',    labelKey: 'recurringTransactions', icon: Repeat },
      { href: '/budget',       labelKey: 'budgetPage',           icon: Target },
      { href: '/bills',        labelKey: 'bills',                icon: CalendarCheck },
      { href: '/savings',      labelKey: 'savingsPage',          icon: PiggyBank },
    ],
  },
  {
    id: 'tools',
    labelKey: 'groupTools',
    defaultCollapsed: false,
    items: [
      { href: '/reports', labelKey: 'reports', icon: BarChart3 },
      { href: '/upload',  labelKey: 'upload',  icon: Upload },
      { href: '/export',  labelKey: 'export',  icon: Download },
    ],
  },
];
```

> **Note:** The `labelKey` values (`'recurringTransactions'`, `'budgetPage'`, `'savingsPage'`) must match keys in `src/lib/i18n.ts` exactly. These are the same keys currently used in `Sidebar.tsx` `NAV_MAIN` array.

- [ ] **Step 2: Typecheck**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/features/navigation/nav-config.ts
git commit -m "feat: add nav-config with grouped navigation structure"
```

---

### Task 14: `useNavGroups` hook

**Files:**
- Create: `src/features/navigation/useNavGroups.ts`

- [ ] **Step 1: Create `src/features/navigation/useNavGroups.ts`**

```typescript
'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store';
import { NAV_GROUPS, type NavGroup } from './nav-config';

interface UseNavGroupsReturn {
  groups: NavGroup[];
  isGroupCollapsed: (groupId: string) => boolean;
  toggleGroup: (groupId: string) => void;
}

export function useNavGroups(): UseNavGroupsReturn {
  const pathname = usePathname();
  const collapsedGroups = useStore((s) => s.ui.collapsedGroups);
  const toggleNavGroup = useStore((s) => s.toggleNavGroup);

  const hasActiveItem = useCallback(
    (group: NavGroup): boolean => {
      return group.items.some((item) => {
        if (item.href === '/') return pathname === '/';
        if (item.href === '/home') return pathname === '/home';
        return pathname.startsWith(item.href);
      });
    },
    [pathname]
  );

  const isGroupCollapsed = useCallback(
    (groupId: string): boolean => {
      const group = NAV_GROUPS.find((g) => g.id === groupId);
      if (!group) return false;
      // Groups with no labelKey are never collapsible
      if (!group.labelKey) return false;
      // Groups containing the active route are always expanded
      if (hasActiveItem(group)) return false;
      return collapsedGroups[groupId] ?? group.defaultCollapsed ?? false;
    },
    [collapsedGroups, hasActiveItem]
  );

  const toggleGroup = useCallback(
    (groupId: string) => {
      const group = NAV_GROUPS.find((g) => g.id === groupId);
      if (!group || !group.labelKey) return; // not collapsible
      if (hasActiveItem(group)) return; // active route guard
      toggleNavGroup(groupId);
    },
    [toggleNavGroup, hasActiveItem]
  );

  return { groups: NAV_GROUPS, isGroupCollapsed, toggleGroup };
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/features/navigation/useNavGroups.ts
git commit -m "feat: add useNavGroups hook with collapse state and active-route guard"
```

---

### Task 15: `SidebarGroup` component

**Files:**
- Create: `src/features/navigation/SidebarGroup.tsx`

- [ ] **Step 1: Create `src/features/navigation/SidebarGroup.tsx`**

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { useStore } from '@/store';
import { staggerList, staggerListItem } from '@/lib/motion';
import type { NavGroup } from './nav-config';

interface SidebarGroupProps {
  group: NavGroup;
  /** True when sidebar is in 72px icon-only rail mode — suppresses group header */
  railMode: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  locale: 'en' | 'id';
}

export function SidebarGroup({
  group,
  railMode,
  isCollapsed,
  onToggle,
  locale,
}: SidebarGroupProps) {
  const pathname = usePathname();
  const setDashboardView = useStore((s) => s.setDashboardView);

  const isItemActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/home') return pathname === '/home';
    return pathname.startsWith(href);
  };

  const navLinkClass = (href: string) =>
    cn(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
      isItemActive(href)
        ? 'bg-primary/10 text-primary shadow-sm'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      railMode && 'justify-center px-0'
    );

  const isCollapsible = Boolean(group.labelKey) && !railMode;

  return (
    <div>
      {/* Group header — only shown when expanded sidebar + group has a label */}
      {isCollapsible && (
        <button
          onClick={onToggle}
          className="text-muted-foreground/60 hover:text-muted-foreground mb-1 flex w-full items-center justify-between px-3 py-1 text-[10px] font-semibold tracking-wider uppercase transition-colors"
        >
          <span>{t(locale, group.labelKey as Parameters<typeof t>[1])}</span>
          <motion.span animate={{ rotate: isCollapsed ? 0 : 90 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="h-3 w-3" />
          </motion.span>
        </button>
      )}

      {/* Nav items */}
      <AnimatePresence initial={false}>
        {(!isCollapsible || !isCollapsed) && (
          <motion.div
            key={group.id}
            initial={isCollapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <motion.div
              variants={staggerList}
              initial="hidden"
              animate="show"
              className="space-y-0.5"
            >
              {group.items.map(({ href, labelKey, icon: Icon }) => (
                <motion.div key={href} variants={staggerListItem}>
                  <Link
                    href={href}
                    className={navLinkClass(href)}
                    title={railMode ? t(locale, labelKey as Parameters<typeof t>[1]) : undefined}
                    aria-current={isItemActive(href) ? 'page' : undefined}
                    onClick={(e) => {
                      if (href === '/' && pathname === '/') {
                        e.preventDefault();
                        setDashboardView('years');
                        window.history.pushState({ dashboardView: 'years' }, '');
                      }
                    }}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <AnimatePresence>
                      {!railMode && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.15 }}
                          className="whitespace-nowrap"
                        >
                          {t(locale, labelKey as Parameters<typeof t>[1])}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/navigation/SidebarGroup.tsx
git commit -m "feat: add SidebarGroup collapsible nav section component"
```

---

### Task 16: Update `Sidebar.tsx` to use `SidebarGroup`

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Replace the flat `NAV_MAIN` rendering in `Sidebar.tsx`**

Read the full current `Sidebar.tsx`. Then make these changes:

1. Remove the `NAV_MAIN` constant and its `NavKey` type (they're replaced by `nav-config.ts`).

2. Add imports:
```typescript
import { SidebarGroup } from '@/features/navigation/SidebarGroup';
import { useNavGroups } from '@/features/navigation/useNavGroups';
```

3. Inside the `Sidebar` component, add:
```typescript
const { groups, isGroupCollapsed, toggleGroup } = useNavGroups();
```

4. Replace the `<nav>` section (the one that maps over `NAV_MAIN`) with:
```tsx
<nav className="flex-1 space-y-3 overflow-y-auto px-3 py-2" aria-label={t(locale, 'menu')}>
  {groups.map((group) => (
    <SidebarGroup
      key={group.id}
      group={group}
      railMode={collapsed}
      isCollapsed={isGroupCollapsed(group.id)}
      onToggle={() => toggleGroup(group.id)}
      locale={locale}
    />
  ))}
</nav>
```

5. Remove unused imports: `Home`, `LayoutDashboard`, `Receipt`, `CalendarCheck`, `PiggyBank`, `Target`, `Repeat`, `BarChart3` (these are now in `nav-config.ts`). Keep `Upload`, `Download`, `Settings`, `Plus`, `PanelLeftClose`, `PanelLeft`, `Tag`, `Languages` which are still used.

- [ ] **Step 2: Typecheck + run all tests**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run typecheck && npm test
```
Expected: no type errors, all tests pass.

- [ ] **Step 3: Verify in dev server**

```bash
npm run dev
```
Open `http://localhost:3000`. Verify:
- Sidebar shows "Finance" and "Tools" group headers
- Clicking a group header collapses/expands it with animation
- The active page's group stays expanded
- Collapsed sidebar (rail mode) shows flat icons with no group headers
- Collapsing/expanding state persists on page refresh

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: refactor Sidebar to use SidebarGroup with collapsible nav groups"
```

---

## Final: Full Preflight Check

- [ ] **Run full preflight**

```bash
cd "d:\VsCode\Financial Tracker\Financial-Tracker-V.02" && npm run preflight
```
Expected: format check ✓, typecheck ✓, lint ✓, build ✓

If lint errors appear: `npm run format` then re-run `npm run preflight`.

- [ ] **Run all tests one final time**

```bash
npm test
```
Expected: all tests pass (existing 144 + new balance service + report service tests).

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: financial tracker v2 improvements — balances, reports, load-more, nav groups"
```
