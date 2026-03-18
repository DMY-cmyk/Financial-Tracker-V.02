# Balance, Report & Export Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix payment method balance calculations, click-to-filter navigation, report template conformance, add date sort toggle, and add end-of-month reminder modal.

**Architecture:** Five independent change sets executed in order: date sort (API + hook + UI), click navigation (useSearchParams + URL fix), balance system (SQL rewrite + contract + card redesign + settings cleanup), end-of-month reminder (new component), report/export merge (generator rewrite + nav rename + page cleanup).

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Vitest, SQLite/Neon Postgres via unified DbClient, React Query infinite query, Zustand (UI state only), shadcn/ui Dialog, Framer Motion, SheetJS (xlsx)

---

## File Map

### Issue D — Date Sort
- Modify: `src/lib/api/validation.ts` — add `sortOrder` to `listTransactionsQuerySchema`
- Modify: `src/server/repositories/transaction.repository.ts` — dynamic ORDER BY direction
- Modify: `src/app/api/transactions/route.ts` — pass `sortOrder` from query params
- Modify: `src/lib/api/client.ts` — add `sortOrder` to `api.transactions.list()` params
- Modify: `src/features/transactions/useAllTransactions.ts` — add `sortOrder` state + `filterKey`
- Modify: `src/app/transactions/page.tsx` — add sort toggle button
- Modify: `src/__tests__/transaction.service.test.ts` — add sort order tests
- Modify: `src/__tests__/validation.test.ts` — add sortOrder schema test

### Issue B — Click Navigation
- Modify: `src/app/transactions/page.tsx` — replace `useState+window.location.search` with `useSearchParams`
- Modify: `src/features/transactions/useAllTransactions.ts` — extend `InitialFilters`
- Modify: `src/features/balances/AccountBalancesWidget.tsx` — update navigation URL

### Issue A — Balance System
- Modify: `src/server/services/balance.service.ts` — rewrite SQL for monthly chain
- Modify: `src/lib/api/contracts.ts` — update `PaymentMethodBalance` interface
- Modify: `src/lib/types.ts` — remove `beginningBalance` from `PaymentMethod`
- Modify: `src/lib/api/validation.ts` — remove `beginningBalance` from PM schemas
- Modify: `src/app/api/payment-methods/route.ts` — remove beginningBalance from payload
- Modify: `src/app/api/payment-methods/[id]/route.ts` — remove beginningBalance from payload
- Modify: `src/features/balances/BalanceCard.tsx` — 4-row ledger layout
- Modify: `src/features/balances/useBalances.ts` — staleTime → 0
- Modify: `src/app/settings/categories/page.tsx` — remove beginning balance UI
- Modify: `src/server/db/seed.ts` — ensure "Saldo Awal" income category seeded
- Modify: `src/__tests__/balance.service.test.ts` — replace existing tests with monthly-chain tests

### Issue E — End-of-Month Reminder
- Create: `src/components/shared/EndOfMonthReminder.tsx`
- Modify: `src/app/(dashboard)/layout.tsx` or root dashboard page — add component
- Modify: `src/lib/i18n.ts` — add 4 translation keys

### Issue C — Report/Export
- Modify: `src/features/reports/report-generator.ts` — complete rewrite
- Modify: `src/server/services/report.service.ts` — pass month/year, add categories
- Modify: `src/lib/api/contracts.ts` — add `incomeCategories`/`expenseCategories` to `MonthlyReportData`
- Modify: `src/lib/types.ts` — remove `'json'` from `ExportFormat`
- Modify: `src/lib/api/validation.ts` — remove `'json'` from `createExportJobSchema`
- Modify: `src/app/reports/page.tsx` — remove ReportDownloader section
- Modify: `src/features/navigation/nav-config.ts` — rename export → downloadReport
- Modify: `src/lib/i18n.ts` — add `downloadReport` i18n key
- Modify: `src/app/export/page.tsx` — remove JSON format option
- Modify: `src/__tests__/report.service.test.ts` — add categories tests

---

## Task 1: Date Sort — Validation Schema

**Files:**
- Modify: `src/lib/api/validation.ts:27-37`
- Modify: `src/__tests__/validation.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `src/__tests__/validation.test.ts`:

```typescript
import { listTransactionsQuerySchema } from '@/lib/api/validation';

describe('listTransactionsQuerySchema — sortOrder', () => {
  it('accepts asc', () => {
    const r = listTransactionsQuerySchema.safeParse({ sortOrder: 'asc' });
    expect(r.success).toBe(true);
    expect(r.data?.sortOrder).toBe('asc');
  });
  it('accepts desc', () => {
    const r = listTransactionsQuerySchema.safeParse({ sortOrder: 'desc' });
    expect(r.success).toBe(true);
  });
  it('rejects invalid value', () => {
    const r = listTransactionsQuerySchema.safeParse({ sortOrder: 'random' });
    expect(r.success).toBe(false);
  });
  it('is optional — defaults to undefined when omitted', () => {
    const r = listTransactionsQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    expect(r.data?.sortOrder).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npm run test -- --reporter=verbose src/__tests__/validation.test.ts
```

Expected: `sortOrder` tests fail with "Invalid enum value" or similar.

- [ ] **Step 3: Add `sortOrder` to schema**

In `src/lib/api/validation.ts`, in `listTransactionsQuerySchema`, add after `pageSize`:

```typescript
sortOrder: z.enum(['asc', 'desc']).optional(),
```

- [ ] **Step 4: Run tests — expect PASS**

```
npm run test -- --reporter=verbose src/__tests__/validation.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/validation.ts src/__tests__/validation.test.ts
git commit -m "feat: add sortOrder to listTransactionsQuerySchema"
```

---

## Task 2: Date Sort — Repository ORDER BY

**Files:**
- Modify: `src/server/repositories/transaction.repository.ts`
- Modify: `src/__tests__/transaction.service.test.ts`

- [ ] **Step 1: Write failing tests**

In `src/__tests__/transaction.service.test.ts`, add a new describe block:

```typescript
describe('listTransactions — sortOrder', () => {
  beforeEach(async () => {
    await createTransaction({
      date: '2026-01-10', description: 'Oldest', category: 'A',
      categoryId: 'c1', type: 'income', amount: 100000, paymentMethod: 'BCA', notes: '',
    });
    await createTransaction({
      date: '2026-01-20', description: 'Middle', category: 'A',
      categoryId: 'c1', type: 'income', amount: 200000, paymentMethod: 'BCA', notes: '',
    });
    await createTransaction({
      date: '2026-01-30', description: 'Newest', category: 'A',
      categoryId: 'c1', type: 'income', amount: 300000, paymentMethod: 'BCA', notes: '',
    });
  });

  it('defaults to newest first (desc)', async () => {
    const r = await listTransactions({});
    expect(r.data!.transactions[0].description).toBe('Newest');
    expect(r.data!.transactions[2].description).toBe('Oldest');
  });

  it('sortOrder asc returns oldest first', async () => {
    const r = await listTransactions({ sortOrder: 'asc' });
    expect(r.data!.transactions[0].description).toBe('Oldest');
    expect(r.data!.transactions[2].description).toBe('Newest');
  });

  it('sortOrder desc explicitly returns newest first', async () => {
    const r = await listTransactions({ sortOrder: 'desc' });
    expect(r.data!.transactions[0].description).toBe('Newest');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npm run test -- --reporter=verbose src/__tests__/transaction.service.test.ts
```

Expected: `sortOrder asc` test fails (all come back DESC).

- [ ] **Step 3: Update `findFiltered` in `transaction.repository.ts`**

Find the `findFiltered` method (look for `ORDER BY date DESC` in the query string). The method builds a `WHERE` clause and ends with `ORDER BY date DESC`. Change the ORDER BY to be dynamic:

```typescript
// Add this line before building the final SQL
const dir = (filters.sortOrder as string) === 'asc' ? 'ASC' : 'DESC';
```

Then change every `ORDER BY date DESC` in `findFiltered` to `ORDER BY date ${dir}`.

Also add `sortOrder` to the filter interface at the top of the repository (or it will be passed through `filters` as `unknown`). The filter object is typed loosely as `Record<string, unknown>` via the validated query type — confirm the type accepts `sortOrder` from the validated schema.

- [ ] **Step 4: Update `listTransactions` in `transaction.service.ts` to pass `sortOrder`**

In `src/server/services/transaction.service.ts`, `listTransactions` passes query params to `repo.findFiltered`. Verify `sortOrder` flows through automatically (it should since the service passes the validated query object directly).

- [ ] **Step 5: Run tests — expect PASS**

```
npm run test -- --reporter=verbose src/__tests__/transaction.service.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/server/repositories/transaction.repository.ts src/__tests__/transaction.service.test.ts
git commit -m "feat: add dynamic sort order to transaction repository"
```

---

## Task 3: Date Sort — API Route + Client

**Files:**
- Modify: `src/app/api/transactions/route.ts`
- Modify: `src/lib/api/client.ts`

- [ ] **Step 1: Add `sortOrder` to API route**

In `src/app/api/transactions/route.ts`, in the GET handler, after reading `pageSizeStr`, add:

```typescript
const sortOrder = searchParams.get('sortOrder');
if (sortOrder === 'asc' || sortOrder === 'desc') query.sortOrder = sortOrder;
```

- [ ] **Step 2: Add `sortOrder` to `api.transactions.list()` params**

In `src/lib/api/client.ts`, `api.transactions.list()` has a `params?:` object. Add `sortOrder?: 'asc' | 'desc'` to its type:

```typescript
list(params?: {
  month?: number;
  year?: number;
  type?: string;
  categoryId?: string;
  paymentMethod?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  yearOnly?: boolean;
  sortOrder?: 'asc' | 'desc';  // add this line
})
```

The existing `Object.entries` loop will automatically include `sortOrder` when set.

- [ ] **Step 3: Run typecheck**

```
npm run typecheck
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/transactions/route.ts src/lib/api/client.ts
git commit -m "feat: pass sortOrder through API route and client"
```

---

## Task 4: Date Sort — Hook + UI Toggle

**Files:**
- Modify: `src/features/transactions/useAllTransactions.ts`
- Modify: `src/app/transactions/page.tsx`

- [ ] **Step 1: Add `sortOrder` state to hook**

In `src/features/transactions/useAllTransactions.ts`:

1. Add state after line 83 (`const [yearOnly, ...]`):
   ```typescript
   const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>('desc');
   ```

2. Add `sortOrder` to `filterKey` array (line 89–95):
   ```typescript
   const filterKey = [
     allMonths ? 'all' : yearOnly ? `year-${year}` : `${month}-${year}`,
     typeFilter,
     categoryFilter,
     paymentMethodFilter,
     search,
     sortOrder,   // add this line
   ].join('|');
   ```

3. Add setter callback after `setYearOnly`:
   ```typescript
   const toggleSortOrder = useCallback(() => {
     setSortOrderState((prev) => (prev === 'desc' ? 'asc' : 'desc'));
     setSelectedIds(new Set());
   }, []);
   ```

4. In the `queryFn`, add `params.sortOrder = sortOrder;` (always, not conditional — the API defaults to desc when missing but being explicit is cleaner):
   ```typescript
   params.sortOrder = sortOrder;
   ```

5. Add to `UseAllTransactionsReturn` interface:
   ```typescript
   sortOrder: 'asc' | 'desc';
   toggleSortOrder: () => void;
   ```

6. Add to the return object at the bottom:
   ```typescript
   sortOrder,
   toggleSortOrder,
   ```

- [ ] **Step 2: Add sort toggle button to transactions page**

In `src/app/transactions/page.tsx`:

1. Add `ArrowUpDown` to the lucide-react import:
   ```typescript
   import { Plus, Receipt, Download, ArrowUpDown } from 'lucide-react';
   ```

2. Destructure `sortOrder` and `toggleSortOrder` from `useAllTransactions()`.

3. Add a sort toggle button in the filter toolbar area (near `<TransactionFilters />`):
   ```tsx
   <Button
     variant="outline"
     size="sm"
     onClick={toggleSortOrder}
     className="gap-1.5"
   >
     <ArrowUpDown className="h-3.5 w-3.5" />
     {sortOrder === 'desc' ? t(locale, 'newest') : t(locale, 'oldest')}
   </Button>
   ```

4. Add `'newest'` and `'oldest'` to `src/lib/i18n.ts` if not already present:
   ```typescript
   newest: { en: 'Newest', id: 'Terbaru' },
   oldest: { en: 'Oldest', id: 'Terlama' },
   ```

- [ ] **Step 3: Run typecheck**

```
npm run typecheck
```

Expected: No errors.

- [ ] **Step 4: Start dev server and verify manually**

```
npm run dev
```

Navigate to `/transactions`. Click the sort toggle — transactions should reorder between newest-first and oldest-first.

- [ ] **Step 5: Commit**

```bash
git add src/features/transactions/useAllTransactions.ts src/app/transactions/page.tsx src/lib/i18n.ts
git commit -m "feat: add date sort toggle to transactions page"
```

---

## Task 5: Click Navigation Fix

**Files:**
- Modify: `src/app/transactions/page.tsx`
- Modify: `src/features/transactions/useAllTransactions.ts`
- Modify: `src/features/balances/AccountBalancesWidget.tsx`

- [ ] **Step 1: Extend `InitialFilters` in `useAllTransactions.ts`**

Change the interface from:
```typescript
interface InitialFilters {
  paymentMethod?: string;
}
```
to:
```typescript
interface InitialFilters {
  paymentMethod?: string;
  allMonths?: boolean;
  month?: number;
  year?: number;
}
```

Then update the state initializations to use the new fields:
```typescript
const [paymentMethodFilter, setPaymentMethodFilterState] = useState(
  initialFilters?.paymentMethod ?? ''
);
const [allMonths, setAllMonthsState] = useState(
  initialFilters?.allMonths ?? false
);
```

(The hook already reads `month` and `year` from the Zustand store, so those don't need to be seeded from `InitialFilters` — the URL params for month/year would need to be synced to Zustand or passed differently. For this change, only `paymentMethod` and `allMonths` are seeded from URL; month/year continue from Zustand.)

- [ ] **Step 2: Update `TransactionsPage` to use `useSearchParams`**

In `src/app/transactions/page.tsx`:

1. Add imports at the top:
   ```typescript
   import { useSearchParams, Suspense } from 'react';
   // Actually: useSearchParams is from 'next/navigation', not React
   import { useSearchParams } from 'next/navigation';
   ```
   (Keep `'use client'` directive already present.)

2. Split the page into two components: an inner component that uses `useSearchParams`, and an outer page export that wraps it in `<Suspense>`. Example structure:

   ```tsx
   function TransactionsPageInner() {
     const searchParams = useSearchParams();
     const urlPaymentMethod = searchParams.get('paymentMethod') ?? '';
     const urlAllMonths = searchParams.get('allMonths') === 'true';

     const { ... } = useAllTransactions({
       paymentMethod: urlPaymentMethod,
       allMonths: urlAllMonths,
     });

     // ... rest of existing page JSX
   }

   export default function TransactionsPage() {
     return (
       <Suspense fallback={<ListSkeleton />}>
         <TransactionsPageInner />
       </Suspense>
     );
   }
   ```

3. Remove the old `const [urlPaymentMethod] = useState<string>(...)` lines.

4. Remove the old `const { ... } = useAllTransactions({ paymentMethod: urlPaymentMethod })` and replace with the version inside `TransactionsPageInner`.

- [ ] **Step 3: Update `AccountBalancesWidget` navigation URL**

In `src/features/balances/AccountBalancesWidget.tsx`, change `handleCardClick`:

```typescript
const handleCardClick = (paymentMethodName: string) => {
  const params = new URLSearchParams({
    paymentMethod: paymentMethodName,
    allMonths: 'true',
  });
  router.push(`/transactions?${params.toString()}`);
};
```

Remove the `month` and `year` from the params (and the `useStore` imports for those if no longer used elsewhere in the widget — check before removing).

- [ ] **Step 4: Run typecheck**

```
npm run typecheck
```

Expected: No errors.

- [ ] **Step 5: Test manually**

1. Start dev server: `npm run dev`
2. Go to dashboard. Click any payment method card.
3. Confirm: navigates to `/transactions`, filter shows the payment method name pre-selected, `allMonths` toggle is ON, transactions filtered.

- [ ] **Step 6: Commit**

```bash
git add src/app/transactions/page.tsx src/features/transactions/useAllTransactions.ts src/features/balances/AccountBalancesWidget.tsx
git commit -m "fix: use useSearchParams for URL filter seeding, fix payment method click navigation"
```

---

## Task 6: Balance System — Service Rewrite

**Files:**
- Modify: `src/server/services/balance.service.ts`
- Modify: `src/__tests__/balance.service.test.ts`

- [ ] **Step 1: Replace all tests in `balance.service.test.ts`**

The existing tests test the old all-time + monthlyFlow model. Replace them entirely with tests for the new monthly-chain model:

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

const mkTx = (date: string, type: 'income' | 'expense', amount: number, pm = 'BCA') =>
  createTransaction({ date, description: 'd', category: 'c', categoryId: 'c1',
    type, amount, paymentMethod: pm, notes: '' });

describe('listPaymentMethodBalances (monthly chain)', () => {
  it('returns empty array when no payment methods exist', async () => {
    const r = await listPaymentMethodBalances(2, 2026);
    expect(r.error).toBeUndefined();
    expect(r.data).toEqual([]);
  });

  it('beginningBalance is 0 when no prior transactions exist', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    const r = await listPaymentMethodBalances(2, 2026); // March 2026
    expect(r.data![0].beginningBalance).toBe(0);
  });

  it('beginningBalance = sum of transactions before the month', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await mkTx('2026-01-10', 'income', 5000000); // January — before March
    await mkTx('2026-02-15', 'expense', 1000000); // February — before March
    const r = await listPaymentMethodBalances(2, 2026); // month=2 → March
    // beginningBalance = 5,000,000 - 1,000,000 = 4,000,000
    expect(r.data![0].beginningBalance).toBe(4000000);
  });

  it('income = only income in the queried month', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await mkTx('2026-01-10', 'income', 5000000); // prior month
    await mkTx('2026-03-05', 'income', 3000000); // this month
    const r = await listPaymentMethodBalances(2, 2026); // March
    expect(r.data![0].income).toBe(3000000);
  });

  it('expense = only expense in the queried month', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await mkTx('2026-01-10', 'expense', 200000); // prior
    await mkTx('2026-03-20', 'expense', 500000); // this month
    const r = await listPaymentMethodBalances(2, 2026);
    expect(r.data![0].expense).toBe(500000);
  });

  it('balance (closing) = beginningBalance + income − expense', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await mkTx('2026-01-10', 'income', 6000000); // prior — beginningBalance
    await mkTx('2026-03-05', 'income', 3000000); // income this month
    await mkTx('2026-03-20', 'expense', 2000000); // expense this month
    const r = await listPaymentMethodBalances(2, 2026);
    const b = r.data![0];
    expect(b.beginningBalance).toBe(6000000);
    expect(b.income).toBe(3000000);
    expect(b.expense).toBe(2000000);
    expect(b.balance).toBe(7000000); // 6M + 3M - 2M
  });

  it('without params (all-time path): beginningBalance=0, income/expense all-time', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await mkTx('2026-01-10', 'income', 5000000);
    await mkTx('2026-03-20', 'expense', 1000000);
    const r = await listPaymentMethodBalances(); // no params
    const b = r.data![0];
    expect(b.beginningBalance).toBe(0);
    expect(b.income).toBe(5000000);
    expect(b.expense).toBe(1000000);
    expect(b.balance).toBe(4000000);
  });

  it('orders results by balance descending', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await createPaymentMethod({ name: 'GoPay', icon: 'smartphone', type: 'ewallet' });
    await mkTx('2026-03-05', 'income', 1000000, 'BCA');
    await mkTx('2026-03-05', 'income', 5000000, 'GoPay');
    const r = await listPaymentMethodBalances(2, 2026);
    expect(r.data![0].name).toBe('GoPay');
    expect(r.data![1].name).toBe('BCA');
  });

  it('multiple payment methods computed independently', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await createPaymentMethod({ name: 'GoPay', icon: 'smartphone', type: 'ewallet' });
    await mkTx('2026-01-10', 'income', 4000000, 'BCA');
    await mkTx('2026-01-15', 'income', 1000000, 'GoPay');
    await mkTx('2026-03-05', 'expense', 500000, 'BCA');
    const r = await listPaymentMethodBalances(2, 2026);
    const bca = r.data!.find((b) => b.name === 'BCA')!;
    const gopay = r.data!.find((b) => b.name === 'GoPay')!;
    expect(bca.beginningBalance).toBe(4000000);
    expect(bca.expense).toBe(500000);
    expect(bca.balance).toBe(3500000);
    expect(gopay.beginningBalance).toBe(1000000);
    expect(gopay.income).toBe(0);
    expect(gopay.balance).toBe(1000000);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npm run test -- --reporter=verbose src/__tests__/balance.service.test.ts
```

Expected: Most tests fail (old implementation returns different field shape).

- [ ] **Step 3: Rewrite `balance.service.ts`**

Replace the entire file content:

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
  beginning_balance: number;
  income: number;
  expense: number;
  balance: number;
}

export async function listPaymentMethodBalances(
  month?: number,
  year?: number
): Promise<ServiceResult<PaymentMethodBalance[]>> {
  await ensureSeeded();
  const db = await getDb();

  if (month !== undefined && year !== undefined) {
    // Monthly path: chain calculation
    const monthStr = String(month + 1).padStart(2, '0');
    const monthStart = `${year}-${monthStr}-01`;
    const monthPattern = `${year}-${monthStr}-%`;

    const { rows } = await db.query<BalanceRow>(
      `SELECT
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
      ORDER BY balance DESC`,
      [monthStart, monthStart, monthPattern, monthPattern,
       monthStart, monthStart, monthPattern, monthPattern]
    );

    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type as 'bank' | 'cash' | 'ewallet',
        icon: row.icon,
        beginningBalance: Number(row.beginning_balance),
        income: Number(row.income),
        expense: Number(row.expense),
        balance: Number(row.balance),
      })),
    };
  }

  // All-time path (used by annual report, no month/year given)
  const { rows } = await db.query<BalanceRow>(
    `SELECT
      pm.id, pm.name, pm.type, pm.icon,
      0 AS beginning_balance,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount
                        WHEN t.type = 'expense' THEN -t.amount ELSE 0 END), 0) AS balance
    FROM payment_methods pm
    LEFT JOIN transactions t ON t.payment_method = pm.name
    GROUP BY pm.id, pm.name, pm.type, pm.icon
    ORDER BY balance DESC`
  );

  return {
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as 'bank' | 'cash' | 'ewallet',
      icon: row.icon,
      beginningBalance: 0,
      income: Number(row.income),
      expense: Number(row.expense),
      balance: Number(row.balance),
    })),
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```
npm run test -- --reporter=verbose src/__tests__/balance.service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/server/services/balance.service.ts src/__tests__/balance.service.test.ts
git commit -m "feat: rewrite balance service for monthly chain calculation"
```

---

## Task 7: Balance System — Contracts & Types

**Files:**
- Modify: `src/lib/api/contracts.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/api/validation.ts`

- [ ] **Step 1: Update `PaymentMethodBalance` in `contracts.ts`**

Replace the existing interface (lines 273–282):

```typescript
export interface PaymentMethodBalance {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'ewallet';
  icon: string;
  beginningBalance: number; // all transactions before selected month (0 in all-time path)
  income: number;           // selected month only (all-time in no-params path)
  expense: number;          // selected month only (all-time in no-params path)
  balance: number;          // beginningBalance + income − expense (closing)
}
```

- [ ] **Step 2: Remove `beginningBalance` from `PaymentMethod` in `lib/types.ts`**

In `src/lib/types.ts`, the `PaymentMethod` interface currently includes `beginningBalance: number`. Remove that field:

```typescript
export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  type: 'bank' | 'cash' | 'ewallet';
  // beginningBalance removed — derived from transaction chain
}
```

- [ ] **Step 3: Remove `beginningBalance` from payment method Zod schemas**

In `src/lib/api/validation.ts`:

Change `createPaymentMethodSchema`:
```typescript
export const createPaymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  icon: z.string().max(50).optional().default('wallet'),
  type: z.enum(['bank', 'cash', 'ewallet']),
  // beginningBalance removed
});
```

Change `updatePaymentMethodSchema`:
```typescript
export const updatePaymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  icon: z.string().max(50).optional(),
  type: z.enum(['bank', 'cash', 'ewallet']).optional(),
  // beginningBalance removed
});
```

- [ ] **Step 4: Run typecheck — expect errors to surface**

```
npm run typecheck
```

TypeScript will now flag every place that reads or writes `beginningBalance` on `PaymentMethod`. Use these errors as a checklist for the next steps. Expected error sites:
- `src/app/settings/categories/page.tsx` (multiple lines)
- `src/app/api/payment-methods/route.ts`
- `src/app/api/payment-methods/[id]/route.ts`
- `src/server/repositories/payment-method.repository.ts`

- [ ] **Step 5: Fix `payment-method.repository.ts`**

In `src/server/repositories/payment-method.repository.ts`:

1. Remove `beginning_balance: number` from `PmRow` interface
2. In `rowToPm`, remove `beginningBalance: Number(row.beginning_balance)`
3. In `create`, remove `beginningBalance` from INSERT params and the returned object
4. In `update`, remove `beginning_balance` from UPDATE SET clause and params

The INSERT becomes:
```typescript
await db.query(
  'INSERT INTO payment_methods (id, name, icon, type) VALUES (?, ?, ?, ?)',
  [id, data.name, data.icon, data.type]
);
return { ...data, id };
```

The existing `update` method already uses a spread pattern (`{ ...rowToPm(existing.rows[0]), ...data }`) before the UPDATE — it's not a dynamic SET builder, it always updates all columns. Simply remove `beginning_balance=?` from the SET clause and its corresponding param:

```typescript
await db.query(
  'UPDATE payment_methods SET name=?, icon=?, type=? WHERE id=?',
  [updated.name, updated.icon, updated.type, id]
);
```

- [ ] **Step 6: Fix API routes**

In `src/app/api/payment-methods/route.ts` (POST handler): remove any destructuring or use of `beginningBalance` from the validated payload.

In `src/app/api/payment-methods/[id]/route.ts` (PATCH handler): same — remove `beginningBalance` from payload handling.

- [ ] **Step 7: Run typecheck again — expect clean**

```
npm run typecheck
```

- [ ] **Step 8: Run full test suite**

```
npm run test
```

Expected: All passing (payment-method service tests may need minor updates if they tested `beginningBalance`).

- [ ] **Step 9: Commit**

```bash
git add src/lib/api/contracts.ts src/lib/types.ts src/lib/api/validation.ts \
  src/server/repositories/payment-method.repository.ts \
  src/app/api/payment-methods/route.ts src/app/api/payment-methods/[id]/route.ts
git commit -m "feat: remove beginningBalance from PaymentMethod type and schemas"
```

---

## Task 8: Balance System — BalanceCard Redesign

**Files:**
- Modify: `src/features/balances/BalanceCard.tsx`
- Modify: `src/features/balances/useBalances.ts`

- [ ] **Step 1: Update `useBalances.ts` staleTime**

In `src/features/balances/useBalances.ts`, find `staleTime: 30_000` and change it to `staleTime: 0`.

- [ ] **Step 2: Rewrite `BalanceCard.tsx`**

Replace the entire component to show the 4-row ledger view. Keep the card header (icon, name, type badge) unchanged. Replace the body:

Note: `import type { PaymentMethodBalance } from './types'` is correct — `src/features/balances/types.ts` re-exports from `@/lib/api/contracts`.

```tsx
'use client';

import { motion } from 'framer-motion';
import { Building2, Wallet, Smartphone, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { staggerGridItem, tapScale } from '@/lib/motion';
import { t } from '@/lib/i18n';
import type { PaymentMethodBalance } from './types';

const TYPE_LABELS: Record<PaymentMethodBalance['type'], { en: string; id: string }> = {
  bank: { en: 'Bank', id: 'Bank' },
  cash: { en: 'Cash', id: 'Tunai' },
  ewallet: { en: 'E-Wallet', id: 'E-Wallet' },
};

const TYPE_ICONS: Record<PaymentMethodBalance['type'], typeof Building2> = {
  bank: Building2,
  cash: Wallet,
  ewallet: Smartphone,
};

interface BalanceCardProps {
  balance: PaymentMethodBalance;
  locale: 'en' | 'id';
  onClick?: () => void;
}

export function BalanceCard({ balance, locale, onClick }: BalanceCardProps) {
  const Icon = TYPE_ICONS[balance.type];
  const typeLabel = TYPE_LABELS[balance.type][locale];
  const closingPositive = balance.balance >= 0;

  return (
    <motion.div
      variants={staggerGridItem}
      whileTap={onClick ? tapScale : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'bg-card border-border rounded-2xl border p-4 shadow-sm',
        onClick && 'hover:border-primary/50 cursor-pointer transition-colors'
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
          <Icon className="text-primary h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{balance.name}</p>
          <p className="text-muted-foreground text-xs">{typeLabel}</p>
        </div>
      </div>

      {/* Ledger rows */}
      <div className="space-y-1 text-xs">
        <div className="text-muted-foreground flex justify-between">
          <span>{t(locale, 'beginningBalance')}</span>
          <span className="font-mono">{formatCurrency(balance.beginningBalance)}</span>
        </div>
        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {t(locale, 'income')}
          </span>
          <span className="font-mono">+{formatCurrency(balance.income)}</span>
        </div>
        <div className="flex justify-between text-red-500">
          <span className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            {t(locale, 'expense')}
          </span>
          <span className="font-mono">-{formatCurrency(balance.expense)}</span>
        </div>
        <div className={cn('border-border mt-2 flex justify-between border-t pt-2 font-medium',
          closingPositive ? 'text-foreground' : 'text-destructive')}>
          <span>{t(locale, 'closing')}</span>
          <span className="font-mono">{formatCurrency(balance.balance)}</span>
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Add missing i18n keys**

In `src/lib/i18n.ts`, add:
```typescript
beginningBalance: { en: 'Beginning Balance', id: 'Saldo Awal' },
closing: { en: 'Closing', id: 'Penutupan' },
```

(`income` and `expense` keys should already exist.)

- [ ] **Step 4: Run typecheck**

```
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/features/balances/BalanceCard.tsx src/features/balances/useBalances.ts src/lib/i18n.ts
git commit -m "feat: redesign BalanceCard to show ledger view with beginning/closing balance"
```

---

## Task 9: Balance System — Settings Page Cleanup

**Files:**
- Modify: `src/app/settings/categories/page.tsx`
- Modify: `src/server/db/seed.ts`

- [ ] **Step 1: Remove beginning balance UI from settings page**

In `src/app/settings/categories/page.tsx`:

1. Remove state declarations (around lines 100, 105):
   - `const [newMethodBeginningBalance, setNewMethodBeginningBalance] = useState('');`
   - `const [editBeginningBalance, setEditBeginningBalance] = useState('');`

2. In `handleAddMethod` (around line 213), remove `beginningBalance: parseCurrencyInput(newMethodBeginningBalance)` from the `api.paymentMethods.create()` call. Also remove `setNewMethodBeginningBalance('')` from the success handler.

3. In `handleOpenEdit` (find where `editBeginningBalance` is set), remove that line.

4. In `handleEditSave`, remove `beginningBalance` from the update payload.

5. Remove any JSX `<Input>` or `<Label>` elements for beginning balance in both the Add Method form and the Edit Method dialog.

6. Remove `formatCurrencyInput` import if no longer used (check — it may still be used for budget field).

- [ ] **Step 2: Ensure "Saldo Awal" category is seeded**

In `src/server/db/seed.ts`, check if "Saldo Awal" already exists as a seeded income category. If not, add it to the seed data:

```typescript
// In the categories seed array, add:
{ id: 'cat-saldo-awal', name: 'Saldo Awal', type: 'income', color: '#10B981', icon: 'wallet' },
```

The `ensureSeeded()` function only runs once per process, so adding here ensures new databases have the category.

- [ ] **Step 3: Run typecheck**

```
npm run typecheck
```

- [ ] **Step 4: Run full test suite**

```
npm run test
```

- [ ] **Step 5: Commit**

```bash
git add src/app/settings/categories/page.tsx src/server/db/seed.ts
git commit -m "feat: remove beginning balance UI from settings, seed Saldo Awal category"
```

---

## Task 10: End-of-Month Reminder Component

**Files:**
- Create: `src/components/shared/EndOfMonthReminder.tsx`
- Modify: dashboard layout or page to add the component
- Modify: `src/lib/i18n.ts`

- [ ] **Step 1: Add i18n keys**

In `src/lib/i18n.ts`, add 4 keys:
```typescript
endOfMonthTitle: { en: 'End of Month Reminder', id: 'Pengingat Akhir Bulan' },
endOfMonthBody: {
  en: "Today is the last day of the month. Make sure you've recorded all transactions before midnight so next month's opening balance is accurate.",
  id: 'Hari ini adalah hari terakhir bulan ini. Pastikan semua transaksi sudah dicatat sebelum tengah malam agar saldo awal bulan berikutnya akurat.',
},
goToTransactions: { en: 'Go to Transactions', id: 'Ke Transaksi' },
dismiss: { en: 'Dismiss', id: 'Tutup' },
```

- [ ] **Step 2: Create `EndOfMonthReminder.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { t, useLocale } from '@/lib/i18n';

function isLastDayOfMonth(date: Date): boolean {
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  return tomorrow.getMonth() !== date.getMonth();
}

function getStorageKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `eom-reminder-dismissed-${y}-${m}`;
}

export function EndOfMonthReminder() {
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const today = new Date();
    if (!isLastDayOfMonth(today)) return;
    const key = getStorageKey(today);
    if (localStorage.getItem(key)) return;
    setOpen(true);
  }, []);

  const handleDismiss = () => {
    const key = getStorageKey(new Date());
    localStorage.setItem(key, '1');
    setOpen(false);
  };

  const handleGoToTransactions = () => {
    handleDismiss();
    router.push('/transactions');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle>{t(locale, 'endOfMonthTitle')}</DialogTitle>
          <DialogDescription>{t(locale, 'endOfMonthBody')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleDismiss}>
            {t(locale, 'dismiss')}
          </Button>
          <Button onClick={handleGoToTransactions}>
            {t(locale, 'goToTransactions')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Add to dashboard layout**

The project uses `src/app/layout.tsx` (no route group). Import and add `<EndOfMonthReminder />` inside the layout body (alongside other providers/wrappers):

```tsx
import { EndOfMonthReminder } from '@/components/shared/EndOfMonthReminder';

// Inside the layout JSX:
<EndOfMonthReminder />
```

- [ ] **Step 4: Run typecheck**

```
npm run typecheck
```

- [ ] **Step 5: Test manually**

Temporarily change the `isLastDayOfMonth` check to always return `true`, start dev, confirm modal appears. Then remove the override and restore.

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/EndOfMonthReminder.tsx src/lib/i18n.ts
git add src/app  # add whichever layout file was modified
git commit -m "feat: add end-of-month reminder modal with localStorage dismissal"
```

---

## Task 11: Report Service — Add Categories + Fix balances call

**Files:**
- Modify: `src/server/services/report.service.ts`
- Modify: `src/lib/api/contracts.ts`
- Modify: `src/__tests__/report.service.test.ts`

- [ ] **Step 1: Update `MonthlyReportData` contract**

In `src/lib/api/contracts.ts`, add two fields to `MonthlyReportData`:

```typescript
export interface MonthlyReportData {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;
  incomeTransactions: Transaction[];
  expenseTransactions: Transaction[];
  expenseSummaryByCategory: { category: string; total: number }[];
  incomeCategories: { category: string; total: number }[];   // ADD
  expenseCategories: { category: string; total: number }[];  // ADD
  paymentMethodBalances: PaymentMethodBalance[];
  bills: Bill[];
}
```

- [ ] **Step 2: Write failing test**

In `src/__tests__/report.service.test.ts`, add a test that checks the new fields:

```typescript
it('includes incomeCategories and expenseCategories in monthly report', async () => {
  // Setup: create a payment method and some transactions
  await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
  await createTransaction({ date: '2026-03-05', description: 'Salary', category: 'Gaji',
    categoryId: 'c1', type: 'income', amount: 5000000, paymentMethod: 'BCA', notes: '' });
  await createTransaction({ date: '2026-03-10', description: 'Bonus', category: 'Bonus',
    categoryId: 'c2', type: 'income', amount: 1000000, paymentMethod: 'BCA', notes: '' });
  await createTransaction({ date: '2026-03-15', description: 'Food', category: 'Makanan',
    categoryId: 'c3', type: 'expense', amount: 500000, paymentMethod: 'BCA', notes: '' });

  const r = await getMonthlyReportData(2, 2026); // month=2 → March
  expect(r.error).toBeUndefined();
  expect(r.data!.incomeCategories).toContainEqual({ category: 'Gaji', total: 5000000 });
  expect(r.data!.incomeCategories).toContainEqual({ category: 'Bonus', total: 1000000 });
  expect(r.data!.expenseCategories).toContainEqual({ category: 'Makanan', total: 500000 });
  // sorted descending by total
  expect(r.data!.incomeCategories[0].total).toBeGreaterThanOrEqual(r.data!.incomeCategories[1]?.total ?? 0);
});
```

- [ ] **Step 3: Run test — expect FAIL**

```
npm run test -- --reporter=verbose src/__tests__/report.service.test.ts
```

- [ ] **Step 4: Update `report.service.ts`**

In `src/server/services/report.service.ts`, in `getMonthlyReportData`:

1. Change the `listPaymentMethodBalances()` call to pass `month` and `year`:
   ```typescript
   listPaymentMethodBalances(month, year),
   ```

2. After computing `expenseSummaryByCategory`, add income categories computation:
   ```typescript
   const incomeCategoryMap = new Map<string, number>();
   for (const tx of incomeTransactions) {
     incomeCategoryMap.set(tx.category, (incomeCategoryMap.get(tx.category) ?? 0) + tx.amount);
   }
   const incomeCategories = Array.from(incomeCategoryMap.entries())
     .map(([category, total]) => ({ category, total }))
     .sort((a, b) => b.total - a.total);

   // Rename expenseSummaryByCategory usage for clarity — or just alias
   const expenseCategories = expenseSummaryByCategory;
   ```

3. Add both to the returned data object:
   ```typescript
   incomeCategories,
   expenseCategories,
   ```

- [ ] **Step 5: Run tests — expect PASS**

```
npm run test -- --reporter=verbose src/__tests__/report.service.test.ts
```

- [ ] **Step 6: Run typecheck**

```
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/server/services/report.service.ts src/lib/api/contracts.ts src/__tests__/report.service.test.ts
git commit -m "feat: add incomeCategories/expenseCategories to monthly report, fix balance call"
```

---

## Task 12: Report Generator — Complete Rewrite

**Files:**
- Modify: `src/features/reports/report-generator.ts`

> **Context:** The existing generator places data in wrong columns (F10 instead of G10) and writes individual transaction rows instead of category summaries. This is a full replacement.

- [ ] **Step 1: Read the current generator to understand the API surface**

The generator exports `generateMonthlyReport(data: MonthlyReportData)` and `generateAnnualReport(data: AnnualReportData)`. Both trigger a browser download. Keep the same function signatures.

- [ ] **Step 2: Rewrite the generator**

Replace `src/features/reports/report-generator.ts` entirely:

```typescript
import * as XLSX from 'xlsx';
import type { MonthlyReportData, AnnualReportData } from '@/lib/api/contracts';

const CURRENCY_FMT = '"Rp"#,##0';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function formatDatetimeID(date: Date): string {
  const day = DAY_NAMES_ID[date.getDay()];
  const d = date.getDate();
  const m = MONTH_NAMES_ID[date.getMonth()];
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${day}, ${d} ${m} ${y}, ${hh}.${mm}.${ss}`;
}

function setCurrency(ws: XLSX.WorkSheet, ref: string, value: number): void {
  if (!ws[ref]) ws[ref] = {};
  ws[ref].v = value;
  ws[ref].t = 'n';
  ws[ref].z = CURRENCY_FMT;
}

function setString(ws: XLSX.WorkSheet, ref: string, value: string): void {
  if (!ws[ref]) ws[ref] = {};
  ws[ref].v = value;
  ws[ref].t = 's';
}

function setNumber(ws: XLSX.WorkSheet, ref: string, value: number): void {
  if (!ws[ref]) ws[ref] = {};
  ws[ref].v = value;
  ws[ref].t = 'n';
}

function buildRange(maxRow: number, maxCol: number): string {
  return `A1:${XLSX.utils.encode_col(maxCol)}${maxRow}`;
}

export function generateMonthlyReport(data: MonthlyReportData): void {
  const ws: XLSX.WorkSheet = { '!ref': buildRange(50, 8) };

  // Header section
  setString(ws, 'B5', 'LAPORAN KEUANGAN BULANAN');
  setString(ws, 'B7', formatDatetimeID(new Date()));
  setString(ws, 'B9', 'Bulan:');
  setString(ws, 'C9', MONTH_NAMES_ID[data.month]);
  setString(ws, 'B10', 'Tahun:');
  setNumber(ws, 'C10', data.year);
  setString(ws, 'G10', 'Total Pemasukan:');
  setCurrency(ws, 'H10', data.totalIncome);
  setString(ws, 'G12', 'Total Pengeluaran:');
  setCurrency(ws, 'H12', data.totalExpense);

  // Section headers
  setString(ws, 'B15', 'PEMASUKAN');
  setString(ws, 'D15', 'PENGELUARAN');

  // Income categories (B18+)
  data.incomeCategories.forEach((cat, i) => {
    const row = 18 + i;
    setString(ws, `B${row}`, cat.category);
    setCurrency(ws, `C${row}`, cat.total);
  });

  // Expense categories (D18+)
  data.expenseCategories.forEach((cat, i) => {
    const row = 18 + i;
    setString(ws, `D${row}`, cat.category);
    setCurrency(ws, `E${row}`, cat.total);
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report');

  const monthStr = String(data.month + 1).padStart(2, '0');
  XLSX.writeFile(wb, `Laporan-Keuangan-${data.year}-${monthStr}.xlsx`);
}

export function generateAnnualReport(data: AnnualReportData): void {
  // Sheet 1: Monthly breakdown
  const ws1: XLSX.WorkSheet = { '!ref': buildRange(25, 6) };
  setString(ws1, 'B5', 'LAPORAN KEUANGAN TAHUNAN');
  setString(ws1, 'B7', formatDatetimeID(new Date()));
  setString(ws1, 'B9', 'Tahun:');
  setNumber(ws1, 'C9', data.year);
  setString(ws1, 'G10', 'Total Pemasukan:');
  setCurrency(ws1, 'H10', data.totalIncome);
  setString(ws1, 'G12', 'Total Pengeluaran:');
  setCurrency(ws1, 'H12', data.totalExpense);

  // Column headers
  setString(ws1, 'B15', 'Bulan');
  setString(ws1, 'C15', 'Pemasukan');
  setString(ws1, 'D15', 'Pengeluaran');
  setString(ws1, 'E15', 'Saldo');

  // 12-month rows
  data.monthlyBreakdown.forEach((m, i) => {
    const row = 16 + i;
    setString(ws1, `B${row}`, MONTH_NAMES_ID[m.month]);
    setCurrency(ws1, `C${row}`, m.income);
    setCurrency(ws1, `D${row}`, m.expense);
    setCurrency(ws1, `E${row}`, m.balance);
  });

  // Sheet 2: Transaction detail
  const ws2 = XLSX.utils.json_to_sheet(
    data.transactions.map((tx) => ({
      Tanggal: tx.date,
      Deskripsi: tx.description,
      Kategori: tx.category,
      Tipe: tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      Jumlah: tx.amount,
      'Metode Pembayaran': tx.paymentMethod,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan Tahunan');
  XLSX.utils.book_append_sheet(wb, ws2, 'Detail Transaksi');

  XLSX.writeFile(wb, `Laporan-Tahunan-${data.year}.xlsx`);
}
```

- [ ] **Step 3: Run typecheck**

```
npm run typecheck
```

Expected: No errors (the function signatures match what `ReportDownloader` calls).

- [ ] **Step 4: Test manually**

1. Start dev server: `npm run dev`
2. Go to `/reports` (or `/export` after nav rename in the next task)
3. Download a monthly report — open the file, verify: B5 has title, G10 has "Total Pemasukan:", H10 has income amount formatted as Rp, B18+ has income categories, D18+ has expense categories.

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/report-generator.ts
git commit -m "feat: rewrite report generator to match Excel template cell layout"
```

---

## Task 13: Export/Reports — Nav Rename + JSON Removal + Reports Page Cleanup

**Files:**
- Modify: `src/features/navigation/nav-config.ts`
- Modify: `src/lib/i18n.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/api/validation.ts`
- Modify: `src/app/export/page.tsx`
- Modify: `src/app/reports/page.tsx`

- [ ] **Step 1: Rename nav item**

In `src/features/navigation/nav-config.ts`, change:
```typescript
{ href: '/export', labelKey: 'export', icon: Download },
```
to:
```typescript
{ href: '/export', labelKey: 'downloadReport', icon: Download },
```

- [ ] **Step 2: Add `downloadReport` i18n key**

In `src/lib/i18n.ts`, add:
```typescript
downloadReport: { en: 'Download Report', id: 'Unduh Laporan' },
```

- [ ] **Step 3: Remove JSON from ExportFormat type**

In `src/lib/types.ts`, change:
```typescript
export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'pdf';
```
to:
```typescript
export type ExportFormat = 'csv' | 'xlsx' | 'pdf';
```

- [ ] **Step 4: Remove JSON from export job schema**

In `src/lib/api/validation.ts`, change:
```typescript
format: z.enum(['csv', 'json', 'xlsx', 'pdf']),
```
to:
```typescript
format: z.enum(['csv', 'xlsx', 'pdf']),
```

- [ ] **Step 5: Remove JSON from export page UI**

In `src/app/export/page.tsx`:

1. Remove `json: FileText` from `FORMAT_ICONS`
2. Remove the `json` entry from `FORMAT_OPTIONS`
3. Remove the `FileText` import if no longer used (keep `FileSpreadsheet`, `FileDown`, `FileBarChart`)

The updated constants become:
```typescript
const FORMAT_ICONS: Record<string, LucideIcon> = {
  csv: FileSpreadsheet,
  xlsx: FileDown,
  pdf: FileBarChart,
};

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'csv', label: 'CSV', description: 'Spreadsheet compatible' },
  { value: 'xlsx', label: 'Excel', description: 'Formatted workbook' },
  { value: 'pdf', label: 'PDF', description: 'Print-ready report' },
];
```

- [ ] **Step 6: Remove ReportDownloader from reports page**

In `src/app/reports/page.tsx`:

1. Remove the `import { ReportDownloader } ...` line
2. Remove the `<ReportDownloader />` JSX block (the last `<motion.div>` section at the bottom)

- [ ] **Step 7: Run typecheck + tests**

```
npm run typecheck && npm run test
```

- [ ] **Step 8: Commit**

```bash
git add src/features/navigation/nav-config.ts src/lib/i18n.ts src/lib/types.ts \
  src/lib/api/validation.ts src/app/export/page.tsx src/app/reports/page.tsx
git commit -m "feat: merge export/reports, rename nav to Download Report, remove JSON format"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Run full preflight**

```
npm run preflight
```

Expected output: Format check ✓, Typecheck ✓, Lint ✓, Build ✓

- [ ] **Step 2: Run full test suite**

```
npm run test
```

Expected: All tests pass (or only pre-existing failures if any).

- [ ] **Step 3: Manual smoke test checklist**

Start dev: `npm run dev`

| Feature | Check |
|---------|-------|
| Dashboard balance cards | Show 4 rows: Beginning Balance / Income / Expense / Closing |
| Click balance card | Navigates to `/transactions?paymentMethod=NAME&allMonths=true`, transactions filtered |
| Transactions sort toggle | Shows "Newest"/"Oldest", reorders list |
| Settings > Payment Methods | No "Beginning Balance" input field |
| Navigation sidebar | "Export Data" → "Download Report" |
| Export page | Only CSV, Excel, PDF (no JSON option) |
| Reports page | No "Download Reports" section at bottom |
| Download monthly XLSX | Opens; B5=title, G10=Total Pemasukan, H10=income, B18+=income categories |
| Last day of month trigger (force via devtools or temp code) | Modal appears, dismiss writes localStorage key |

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -p  # stage only specific changes
git commit -m "fix: address issues found in smoke testing"
```
