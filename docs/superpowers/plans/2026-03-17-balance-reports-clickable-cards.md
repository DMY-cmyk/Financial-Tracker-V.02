# Balance Fix, Report Fix, Clickable Cards + Folder Restructure — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix incorrect balance display (add monthly flow), fix crashing annual report (API shape mismatch), make balance cards navigate to filtered transactions, and consolidate scattered components/hooks into feature modules.

**Architecture:** Five chunks executed in order. Chunk 1 (folder restructure) is a prerequisite for all others — it moves files so new code is written in the correct locations. Chunks 2–3 (balance) and chunks 4–5 (report) are independent of each other and can be parallelised after chunk 1 completes. All service changes follow TDD (write failing test → watch it fail → implement → watch it pass).

**Spec:** `docs/superpowers/specs/2026-03-17-balance-reports-clickable-cards-design.md`

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Vitest, Zustand, TanStack Query v5, better-sqlite3 (dev/test), Neon Postgres (prod), Framer Motion, Tailwind v4, shadcn/ui

---

## Chunk 1: Folder Restructure

**Spec ref:** Section 1

Pure file relocation — zero functional changes. All moves use `git mv` to preserve history. After all moves, import paths are updated and `npm run typecheck` must pass before committing.

### Task 1: Create new feature directories

**Files:**
- Create: `src/features/dashboard/` (directory)
- Create: `src/features/export/` (directory)
- Create: `src/features/upload/` (directory)

- [ ] **Step 1: Create the three new feature directories with placeholder files so git tracks them**

```bash
mkdir -p "src/features/dashboard" "src/features/export" "src/features/upload"
```

---

### Task 2: Move component files into feature folders

**Files (all are git mv operations):**

- [ ] **Step 1: Move reports components**

```bash
git mv src/components/reports/AnnualSummary.tsx src/features/reports/AnnualSummary.tsx
git mv src/components/reports/TrendChart.tsx src/features/reports/TrendChart.tsx
```

- [ ] **Step 2: Move transaction components**

```bash
git mv src/components/transactions/BulkActionBar.tsx src/features/transactions/BulkActionBar.tsx
git mv src/components/transactions/CategoryChip.tsx src/features/transactions/CategoryChip.tsx
git mv src/components/transactions/RecurringTransactionForm.tsx src/features/transactions/RecurringTransactionForm.tsx
git mv src/components/transactions/TransactionFilters.tsx src/features/transactions/TransactionFilters.tsx
git mv src/components/transactions/TransactionForm.tsx src/features/transactions/TransactionForm.tsx
git mv src/components/transactions/TransactionSummary.tsx src/features/transactions/TransactionSummary.tsx
git mv src/components/transactions/TransactionTable.tsx src/features/transactions/TransactionTable.tsx
```

- [ ] **Step 3: Move dashboard components**

```bash
git mv src/components/dashboard/BillsChecklist.tsx src/features/dashboard/BillsChecklist.tsx
git mv src/components/dashboard/BudgetProgress.tsx src/features/dashboard/BudgetProgress.tsx
git mv src/components/dashboard/CashFlowChart.tsx src/features/dashboard/CashFlowChart.tsx
git mv src/components/dashboard/CategoryBreakdown.tsx src/features/dashboard/CategoryBreakdown.tsx
git mv src/components/dashboard/DashboardContent.tsx src/features/dashboard/DashboardContent.tsx
git mv src/components/dashboard/MonthSelector.tsx src/features/dashboard/MonthSelector.tsx
git mv src/components/dashboard/PaymentMethods.tsx src/features/dashboard/PaymentMethods.tsx
git mv src/components/dashboard/RecentTransactions.tsx src/features/dashboard/RecentTransactions.tsx
git mv src/components/dashboard/SavingsGoals.tsx src/features/dashboard/SavingsGoals.tsx
```

- [ ] **Step 4: Move export components**

```bash
git mv src/components/export/ExportActionBar.tsx src/features/export/ExportActionBar.tsx
git mv src/components/export/ExportOptions.tsx src/features/export/ExportOptions.tsx
git mv src/components/export/ExportPreview.tsx src/features/export/ExportPreview.tsx
git mv src/components/export/FormatCard.tsx src/features/export/FormatCard.tsx
git mv src/components/export/ScopeSelector.tsx src/features/export/ScopeSelector.tsx
```

- [ ] **Step 5: Move upload components**

```bash
git mv src/components/upload/BulkImportTabs.tsx src/features/upload/BulkImportTabs.tsx
git mv src/components/upload/ConfidenceBar.tsx src/features/upload/ConfidenceBar.tsx
git mv src/components/upload/DropZone.tsx src/features/upload/DropZone.tsx
git mv src/components/upload/ExtractionStatusBadge.tsx src/features/upload/ExtractionStatusBadge.tsx
git mv src/components/upload/ImportPreview.tsx src/features/upload/ImportPreview.tsx
git mv src/components/upload/ImportProgress.tsx src/features/upload/ImportProgress.tsx
git mv src/components/upload/ImportSummary.tsx src/features/upload/ImportSummary.tsx
git mv src/components/upload/OcrPreview.tsx src/features/upload/OcrPreview.tsx
git mv src/components/upload/ProcessingOverlay.tsx src/features/upload/ProcessingOverlay.tsx
git mv src/components/upload/UploadedFileCard.tsx src/features/upload/UploadedFileCard.tsx
```

---

### Task 3: Move hooks into feature folders

**Files (all are git mv operations):**

- [ ] **Step 1: Move feature hooks**

```bash
git mv src/hooks/useTransactions.ts src/features/transactions/useTransactions.ts
git mv src/hooks/useRecurringTransactions.ts src/features/transactions/useRecurringTransactions.ts
git mv src/hooks/useReportsData.ts src/features/reports/useReportsData.ts
git mv src/hooks/useDashboardData.ts src/features/dashboard/useDashboardData.ts
git mv src/hooks/useExport.ts src/features/export/useExport.ts
git mv src/hooks/useUpload.ts src/features/upload/useUpload.ts
git mv src/hooks/useBulkImport.ts src/features/upload/useBulkImport.ts
git mv src/hooks/useImport.ts src/features/upload/useImport.ts
```

**Hooks that stay in `src/hooks/` (do NOT move):** `useKeyboardShortcuts.ts`, `useBudgetData.ts`, `useFolderData.ts`, `useSettings.ts`. Budget, folders, and settings are out of scope for this restructure. The import-update commands in Task 4 target hooks by exact name, so they will not affect these files.

---

### Task 4: Update all import paths

After the moves, TypeScript will report broken imports. Fix them all with global find-and-replace. Run each line separately and check for errors.

- [ ] **Step 1: Fix component path imports**

```bash
# On Windows with Git Bash / PowerShell, use the Grep + Edit tools or:
grep -rl "@/components/reports/" src/ --include="*.tsx" --include="*.ts" | xargs sed -i 's|@/components/reports/|@/features/reports/|g'
grep -rl "@/components/transactions/" src/ --include="*.tsx" --include="*.ts" | xargs sed -i 's|@/components/transactions/|@/features/transactions/|g'
grep -rl "@/components/dashboard/" src/ --include="*.tsx" --include="*.ts" | xargs sed -i 's|@/components/dashboard/|@/features/dashboard/|g'
grep -rl "@/components/export/" src/ --include="*.tsx" --include="*.ts" | xargs sed -i 's|@/components/export/|@/features/export/|g'
grep -rl "@/components/upload/" src/ --include="*.tsx" --include="*.ts" | xargs sed -i 's|@/components/upload/|@/features/upload/|g'
```

- [ ] **Step 2: Fix hook path imports**

```bash
grep -rl "@/hooks/useTransactions" src/ --include="*.tsx" --include="*.ts" | xargs sed -i 's|@/hooks/useTransactions|@/features/transactions/useTransactions|g'
grep -rl "@/hooks/useReportsData" src/ --include="*.tsx" --include="*.ts" | xargs sed -i 's|@/hooks/useReportsData|@/features/reports/useReportsData|g'
grep -rl "@/hooks/useDashboardData" src/ --include="*.tsx" --include="*.ts" | xargs sed -i 's|@/hooks/useDashboardData|@/features/dashboard/useDashboardData|g'
grep -rl "@/hooks/useExport" src/ --include="*.tsx" --include="*.ts" | xargs sed -i 's|@/hooks/useExport|@/features/export/useExport|g'
grep -rl "@/hooks/useUpload" src/ --include="*.tsx" --include="*.ts" | xargs sed -i 's|@/hooks/useUpload|@/features/upload/useUpload|g'
grep -rl "@/hooks/useBulkImport" src/ --include="*.tsx" --include="*.ts" | xargs sed -i 's|@/hooks/useBulkImport|@/features/upload/useBulkImport|g'
grep -rl "@/hooks/useImport" src/ --include="*.tsx" --include="*.ts" | xargs sed -i 's|@/hooks/useImport|@/features/upload/useImport|g'
grep -rl "@/hooks/useRecurringTransactions" src/ --include="*.tsx" --include="*.ts" | xargs sed -i 's|@/hooks/useRecurringTransactions|@/features/transactions/useRecurringTransactions|g'
```

- [ ] **Step 3: Run typecheck to confirm no broken imports**

```bash
npm run typecheck
```

Expected: Exit 0, no errors. If there are errors, read each one and fix the import path manually using the Edit tool.

- [ ] **Step 4: Run tests to confirm nothing broke**

```bash
npm run test
```

Expected: All 312 tests pass (or whatever the current count is).

- [ ] **Step 5: Commit the restructure**

```bash
git add -A
git commit -m "refactor: consolidate components and hooks into feature modules

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Balance Service — Monthly Flow

**Spec ref:** Sections 2a–2d

### Task 5: Add failing tests for `monthlyFlow`

**Files:**
- Modify: `src/__tests__/balance.service.test.ts`

The existing test file has 5 passing tests for `listPaymentMethodBalances()`. Add the new tests **at the end** of the file, inside the existing `describe('listPaymentMethodBalances', ...)` block.

- [ ] **Step 1: Add the failing tests**

Add these tests inside the `describe('listPaymentMethodBalances', ...)` block in `src/__tests__/balance.service.test.ts`:

```typescript
  it('returns monthlyFlow of 0 for all accounts when no month/year params given', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createTransaction({
      date: '2026-01-15', description: 'Salary', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 5000000, paymentMethod: 'Bank BCA', notes: '',
    });
    const result = await listPaymentMethodBalances();
    expect(result.data![0].monthlyFlow).toBe(0);
  });

  it('returns monthlyFlow of 0 when account has no transactions in the queried month', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createTransaction({
      date: '2026-01-15', description: 'Salary', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 5000000, paymentMethod: 'Bank BCA', notes: '',
    });
    // Query February — no transactions in Feb
    const result = await listPaymentMethodBalances(1, 2026);
    expect(result.data![0].monthlyFlow).toBe(0);
    // All-time balance is unchanged
    expect(result.data![0].balance).toBe(5000000);
  });

  it('returns positive monthlyFlow for an income-only month', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createTransaction({
      date: '2026-03-10', description: 'Salary', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 5000000, paymentMethod: 'Bank BCA', notes: '',
    });
    const result = await listPaymentMethodBalances(2, 2026); // month=2 = March
    expect(result.data![0].monthlyFlow).toBe(5000000);
  });

  it('returns negative monthlyFlow for an expense-only month', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createTransaction({
      date: '2026-03-15', description: 'Rent', category: 'Housing', categoryId: 'c2',
      type: 'expense', amount: 2000000, paymentMethod: 'Bank BCA', notes: '',
    });
    const result = await listPaymentMethodBalances(2, 2026);
    expect(result.data![0].monthlyFlow).toBe(-2000000);
  });

  it('monthlyFlow is independent of all-time balance', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    // January: income 5M
    await createTransaction({
      date: '2026-01-10', description: 'Salary Jan', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 5000000, paymentMethod: 'Bank BCA', notes: '',
    });
    // March: expense 200K
    await createTransaction({
      date: '2026-03-15', description: 'Food', category: 'Food', categoryId: 'c2',
      type: 'expense', amount: 200000, paymentMethod: 'Bank BCA', notes: '',
    });
    const result = await listPaymentMethodBalances(2, 2026); // query March only
    expect(result.data![0].balance).toBe(4800000);     // all-time: 5M - 200K
    expect(result.data![0].monthlyFlow).toBe(-200000); // March only: -200K
  });

  it('all-time income/expense/balance are identical regardless of month/year params', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createTransaction({
      date: '2026-01-10', description: 'Salary', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 5000000, paymentMethod: 'Bank BCA', notes: '',
    });
    await createTransaction({
      date: '2026-01-20', description: 'Rent', category: 'Housing', categoryId: 'c2',
      type: 'expense', amount: 1000000, paymentMethod: 'Bank BCA', notes: '',
    });
    const withParams = await listPaymentMethodBalances(1, 2026); // Feb — no transactions
    const withoutParams = await listPaymentMethodBalances();
    expect(withParams.data![0].balance).toBe(withoutParams.data![0].balance);
    expect(withParams.data![0].income).toBe(withoutParams.data![0].income);
    expect(withParams.data![0].expense).toBe(withoutParams.data![0].expense);
  });
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npm run test -- --reporter=verbose src/__tests__/balance.service.test.ts
```

Expected: The 6 new tests FAIL with errors like `"Expected 0, Received undefined"` (because `monthlyFlow` does not exist yet on the returned objects) or `"Too many arguments"` for the new `month, year` params. The original 5 tests still pass.

---

### Task 6: Implement `monthlyFlow` in the balance service

**Files:**
- Modify: `src/server/services/balance.service.ts`

- [ ] **Step 1: Replace the entire file with the updated implementation**

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

interface MonthlyFlowRow {
  name: string;
  monthlyFlow: number;
}

export async function listPaymentMethodBalances(
  month?: number,
  year?: number
): Promise<ServiceResult<PaymentMethodBalance[]>> {
  await ensureSeeded();
  const db = await getDb();

  // Query 1: all-time income, expense, balance per payment method
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

  // Query 2 (conditional): monthly net flow per payment method
  const monthlyFlowMap = new Map<string, number>();
  if (month !== undefined && year !== undefined) {
    const { rows: flowRows } = await db.query<MonthlyFlowRow>(
      `SELECT
         t.payment_method AS name,
         COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount
                           WHEN t.type = 'expense' THEN -t.amount ELSE 0 END), 0) AS monthlyFlow
       FROM transactions t
       WHERE CAST(SUBSTR(t.date, 6, 2) AS INTEGER) - 1 = ?
         AND CAST(SUBSTR(t.date, 1, 4) AS INTEGER) = ?
       GROUP BY t.payment_method`,
      [month, year]
    );
    for (const row of flowRows) {
      monthlyFlowMap.set(row.name, Number(row.monthlyFlow));
    }
  }

  return {
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as 'bank' | 'cash' | 'ewallet',
      icon: row.icon,
      income: Number(row.income),
      expense: Number(row.expense),
      balance: Number(row.balance),
      monthlyFlow: monthlyFlowMap.get(row.name) ?? 0,
    })),
  };
}
```

**Important:** Use `?` positional placeholders — the SQLite adapter uses `?` style (not `$1/$2`), as used throughout `src/server/repositories/`. The SQL condition `CAST(SUBSTR(t.date, 6, 2) AS INTEGER) - 1 = ?` subtracts 1 from the stored 1-based month to match the 0-based `month` parameter. Bind `[month, year]` as the second argument to `db.query()`.

- [ ] **Step 2: Run the balance service tests**

```bash
npm run test -- --reporter=verbose src/__tests__/balance.service.test.ts
```

Expected: All 11 tests pass (5 original + 6 new).

---

### Task 7: Update the balance API route

**Files:**
- Modify: `src/app/api/payment-methods/balances/route.ts`

- [ ] **Step 1: Replace the route with the version that reads month/year params**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { listPaymentMethodBalances } from '@/server/services/balance.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const monthStr = searchParams.get('month');
  const yearStr = searchParams.get('year');

  const month = monthStr !== null ? parseInt(monthStr, 10) : undefined;
  const year = yearStr !== null ? parseInt(yearStr, 10) : undefined;

  // Validate if provided
  if (month !== undefined && (isNaN(month) || month < 0 || month > 11)) {
    return NextResponse.json(
      { error: { message: 'month must be 0–11', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }
  if (year !== undefined && (isNaN(year) || year < 2000 || year > 2100)) {
    return NextResponse.json(
      { error: { message: 'year must be 2000–2100', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  const result = await listPaymentMethodBalances(month, year);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: { balances: result.data } });
}
```

- [ ] **Step 2: Run all tests to confirm nothing regressed**

```bash
npm run test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/server/services/balance.service.ts \
        src/app/api/payment-methods/balances/route.ts \
        src/__tests__/balance.service.test.ts
git commit -m "feat: add monthly flow to balance service and API

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Balance UI — Cards, Navigation, URL Seeding

**Spec ref:** Sections 2a (contracts), 2b (client), 2e (hook), 2f (card), 2g (grid + widget), 2h (transactions page)

### Task 8: Extend `PaymentMethodBalance` contract and API client

**Files:**
- Modify: `src/lib/api/contracts.ts`
- Modify: `src/lib/api/client.ts`

- [ ] **Step 1: Add `monthlyFlow` to `PaymentMethodBalance` in `src/lib/api/contracts.ts`**

Find the `PaymentMethodBalance` interface (around line 273) and add `monthlyFlow`:

```typescript
export interface PaymentMethodBalance {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'ewallet';
  icon: string;
  income: number;
  expense: number;
  balance: number;
  monthlyFlow: number;  // income − expense for the queried month/year; 0 when no params given
}
```

- [ ] **Step 2: Update `balances.list()` in `src/lib/api/client.ts` to accept optional params**

Find the `balances` section (around line 324) and replace it:

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

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: Exit 0. If there are errors about `monthlyFlow` being missing in existing code that constructs `PaymentMethodBalance` objects, find those places and add `monthlyFlow: 0` as a default.

---

### Task 9: Update `useBalances.ts` to pass month/year

**Files:**
- Modify: `src/features/balances/useBalances.ts`

- [ ] **Step 1: Replace the file contents**

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
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);

  const { data, isLoading } = useQuery({
    queryKey: ['payment-method-balances', month, year],
    queryFn: async () => {
      const result = await api.balances.list({ month, year });
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

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: Exit 0.

---

### Task 10: Update `BalanceCard.tsx` — monthly flow display + click support

**Files:**
- Modify: `src/features/balances/BalanceCard.tsx`

- [ ] **Step 1: Replace the file contents**

```typescript
'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Building2, Wallet, Smartphone } from 'lucide-react';
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
  const isPositive = balance.balance > 0;
  const flowPositive = balance.monthlyFlow > 0;

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
        onClick && 'cursor-pointer transition-colors hover:border-primary/50'
      )}
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

      {/* All-time balance */}
      <p
        className={cn(
          'font-mono text-xl font-bold tracking-tight',
          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
        )}
      >
        {formatCurrency(balance.balance)}
      </p>

      {/* Monthly flow secondary line */}
      {balance.monthlyFlow !== 0 && (
        <p
          className={cn(
            'font-mono mt-0.5 text-xs',
            flowPositive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-destructive'
          )}
        >
          {flowPositive ? '↑' : '↓'} {formatCurrency(Math.abs(balance.monthlyFlow))}{' '}
          {t(locale, 'thisMonth')}
        </p>
      )}

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

**Note:** The `thisMonth` key already exists in `src/lib/i18n.ts` — do not add it again.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: Exit 0.

---

### Task 11: Wire up `BalanceGrid.tsx` and `AccountBalancesWidget.tsx` with navigation

**Files:**
- Modify: `src/features/balances/BalanceGrid.tsx`
- Modify: `src/features/balances/AccountBalancesWidget.tsx`

- [ ] **Step 1: Update `BalanceGrid.tsx` to accept and pass `onCardClick`**

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
  onCardClick?: (paymentMethodName: string) => void;
}

export function BalanceGrid({ balances, locale, isLoading, onCardClick }: BalanceGridProps) {
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
        <BalanceCard
          key={b.id}
          balance={b}
          locale={locale}
          onClick={onCardClick ? () => onCardClick(b.name) : undefined}
        />
      ))}
    </motion.div>
  );
}
```

- [ ] **Step 2: Update `AccountBalancesWidget.tsx` to provide navigation**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { useStore } from '@/store';
import { useBalances } from './useBalances';
import { BalanceGrid } from './BalanceGrid';

export function AccountBalancesWidget() {
  const locale = useLocale();
  const router = useRouter();
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const { balances, totalBalance, isLoading } = useBalances();

  const handleCardClick = (paymentMethodName: string) => {
    const params = new URLSearchParams({
      paymentMethod: paymentMethodName,
      month: String(month),
      year: String(year),
    });
    router.push(`/transactions?${params.toString()}`);
  };

  return (
    <div className="bg-card border-border rounded-2xl border p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{t(locale, 'accountBalances')}</h3>
        <span className="text-muted-foreground font-mono text-sm font-medium">
          {formatCurrency(totalBalance)}
        </span>
      </div>
      <BalanceGrid
        balances={balances}
        locale={locale}
        isLoading={isLoading}
        onCardClick={handleCardClick}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: Exit 0.

---

### Task 12: Seed payment method filter from URL in transactions page

**Files:**
- Modify: `src/features/transactions/useAllTransactions.ts`
- Modify: `src/app/transactions/page.tsx`

**Note on month/year:** `useAllTransactions` reads `month` and `year` directly from the Zustand store (`useStore(s => s.ui.selectedMonth/selectedYear)`) — it has no separate useState for these. When a user clicks a balance card, the Zustand store already holds the correct month/year (they were just used to render the card). The URL params `month` and `year` are therefore redundant and intentionally not seeded. Only `paymentMethod` needs URL seeding.

- [ ] **Step 1: Add `InitialFilters` support to `useAllTransactions.ts`**

At the top of the file, after the imports, add the interface:

```typescript
interface InitialFilters {
  paymentMethod?: string;
}
```

Change the function signature from:

```typescript
export function useAllTransactions(): UseAllTransactionsReturn {
```

to:

```typescript
export function useAllTransactions(initialFilters?: InitialFilters): UseAllTransactionsReturn {
```

Change the `paymentMethodFilter` useState initializer from:

```typescript
const [paymentMethodFilter, setPaymentMethodFilterState] = useState('');
```

to:

```typescript
const [paymentMethodFilter, setPaymentMethodFilterState] = useState(
  initialFilters?.paymentMethod ?? ''
);
```

- [ ] **Step 2: Read `paymentMethod` from URL in `src/app/transactions/page.tsx`**

At the top of `TransactionsPage`, after the existing imports, add:

```typescript
import { useRef, useEffect } from 'react'; // useRef was already imported; just ensure useEffect is here
```

After the line `const queryClient = useQueryClient();`, add:

```typescript
  // One-time URL seed: read paymentMethod from URL on mount
  const urlPaymentMethod = useRef<string | null>(null);
  if (urlPaymentMethod.current === null && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    urlPaymentMethod.current = params.get('paymentMethod') ?? '';
  }
```

Change the `useAllTransactions()` call to:

```typescript
  const {
    // ... all destructured values (unchanged)
  } = useAllTransactions(
    urlPaymentMethod.current ? { paymentMethod: urlPaymentMethod.current } : undefined
  );
```

Note: `useRef` is already imported at the top of the file. Ensure `useEffect` is also imported if needed. Check the existing imports before modifying.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: Exit 0.

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: All tests pass.

- [ ] **Step 5: Commit the balance UI changes**

```bash
git add src/lib/api/contracts.ts \
        src/lib/api/client.ts \
        src/features/balances/useBalances.ts \
        src/features/balances/BalanceCard.tsx \
        src/features/balances/BalanceGrid.tsx \
        src/features/balances/AccountBalancesWidget.tsx \
        src/features/transactions/useAllTransactions.ts \
        src/app/transactions/page.tsx
git commit -m "feat: clickable balance cards with monthly flow display

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Annual Report Service — Rich Fields

**Spec ref:** Sections 3b–3c

### Task 13: Add failing tests for new report service fields

**Files:**
- Modify: `src/__tests__/report.service.test.ts`

The existing file has `describe('getAnnualReportData', ...)` with 2 tests. Add these tests inside that block.

- [ ] **Step 1: Add failing tests at the end of the `getAnnualReportData` describe block**

```typescript
  it('transactionCount equals the number of transactions created for that year', async () => {
    await createTransaction({
      date: '2026-01-10', description: 'A', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 1000000, paymentMethod: 'Bank', notes: '',
    });
    await createTransaction({
      date: '2026-02-10', description: 'B', category: 'Expense', categoryId: 'c2',
      type: 'expense', amount: 500000, paymentMethod: 'Bank', notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.data!.transactionCount).toBe(2);
  });

  it('transactionCount is 0 when no transactions exist for the year', async () => {
    const result = await getAnnualReportData(2026);
    expect(result.data!.transactionCount).toBe(0);
  });

  it('totalBalance equals totalIncome minus totalExpense', async () => {
    await createTransaction({
      date: '2026-01-10', description: 'Salary', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 5000000, paymentMethod: 'Bank', notes: '',
    });
    await createTransaction({
      date: '2026-01-20', description: 'Food', category: 'Food', categoryId: 'c2',
      type: 'expense', amount: 1000000, paymentMethod: 'Bank', notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.data!.totalBalance).toBe(4000000);
  });

  it('savingsRate is calculated as Math.round((totalBalance / totalIncome) * 100)', async () => {
    await createTransaction({
      date: '2026-01-10', description: 'Salary', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 10000000, paymentMethod: 'Bank', notes: '',
    });
    await createTransaction({
      date: '2026-01-20', description: 'Rent', category: 'Housing', categoryId: 'c2',
      type: 'expense', amount: 3000000, paymentMethod: 'Bank', notes: '',
    });
    const result = await getAnnualReportData(2026);
    // totalBalance = 7M, totalIncome = 10M → savingsRate = 70
    expect(result.data!.savingsRate).toBe(70);
  });

  it('savingsRate is 0 when totalIncome is 0', async () => {
    const result = await getAnnualReportData(2026);
    expect(result.data!.savingsRate).toBe(0);
  });

  it('savingsRate is 0 when totalBalance is negative', async () => {
    await createTransaction({
      date: '2026-01-10', description: 'Expense', category: 'Food', categoryId: 'c2',
      type: 'expense', amount: 3000000, paymentMethod: 'Bank', notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.data!.savingsRate).toBe(0);
  });

  it('topExpenseCategories contains only expense transactions sorted by amount descending', async () => {
    await createTransaction({
      date: '2026-01-10', description: 'Salary', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 5000000, paymentMethod: 'Bank', notes: '',
    });
    await createTransaction({
      date: '2026-01-15', description: 'Rent', category: 'Housing', categoryId: 'c2',
      type: 'expense', amount: 2000000, paymentMethod: 'Bank', notes: '',
    });
    await createTransaction({
      date: '2026-01-20', description: 'Food', category: 'Food', categoryId: 'c3',
      type: 'expense', amount: 500000, paymentMethod: 'Bank', notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.data!.topExpenseCategories).toHaveLength(2);
    expect(result.data!.topExpenseCategories[0].category).toBe('Housing');
    expect(result.data!.topExpenseCategories[0].amount).toBe(2000000);
    expect(result.data!.topExpenseCategories[1].category).toBe('Food');
    // Income category must NOT appear
    expect(result.data!.topExpenseCategories.find((c) => c.category === 'Income')).toBeUndefined();
  });

  it('topExpenseCategories is empty when no expense transactions exist', async () => {
    await createTransaction({
      date: '2026-01-10', description: 'Salary', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 5000000, paymentMethod: 'Bank', notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.data!.topExpenseCategories).toEqual([]);
  });

  it('previousYear is null when no transactions exist for prior year', async () => {
    const result = await getAnnualReportData(2026);
    expect(result.data!.previousYear).toBeNull();
  });

  it('previousYear returns correct totals when prior year data exists', async () => {
    // 2025 transaction
    await createTransaction({
      date: '2025-06-15', description: 'Old Salary', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 4000000, paymentMethod: 'Bank', notes: '',
    });
    // 2026 transaction
    await createTransaction({
      date: '2026-01-10', description: 'New Salary', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 5000000, paymentMethod: 'Bank', notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.data!.previousYear).not.toBeNull();
    expect(result.data!.previousYear!.year).toBe(2025);
    expect(result.data!.previousYear!.totalIncome).toBe(4000000);
  });

  it('comparison is null when previousYear is null', async () => {
    const result = await getAnnualReportData(2026);
    expect(result.data!.comparison).toBeNull();
  });

  it('comparison.incomeChange is null when previous year income is 0', async () => {
    // 2025: only expense transactions (income = 0)
    await createTransaction({
      date: '2025-06-15', description: 'Old Expense', category: 'Housing', categoryId: 'c2',
      type: 'expense', amount: 1000000, paymentMethod: 'Bank', notes: '',
    });
    // 2026: has income
    await createTransaction({
      date: '2026-01-10', description: 'Salary', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 5000000, paymentMethod: 'Bank', notes: '',
    });
    const result = await getAnnualReportData(2026);
    // previousYear exists (2025 has a transaction), but prevTotalIncome = 0 → pctChange returns null
    expect(result.data!.comparison).not.toBeNull();
    expect(result.data!.comparison!.incomeChange).toBeNull();
  });

  it('monthlyBreakdown entries include monthKey in YYYY-MM format', async () => {
    const result = await getAnnualReportData(2026);
    expect(result.data!.monthlyBreakdown[0].monthKey).toBe('2026-01'); // January
    expect(result.data!.monthlyBreakdown[11].monthKey).toBe('2026-12'); // December
  });

  it('monthlyBreakdown balance equals net (income minus expense) for that month', async () => {
    await createTransaction({
      date: '2026-03-10', description: 'Salary', category: 'Income', categoryId: 'c1',
      type: 'income', amount: 5000000, paymentMethod: 'Bank', notes: '',
    });
    await createTransaction({
      date: '2026-03-15', description: 'Rent', category: 'Housing', categoryId: 'c2',
      type: 'expense', amount: 1500000, paymentMethod: 'Bank', notes: '',
    });
    const result = await getAnnualReportData(2026);
    const march = result.data!.monthlyBreakdown[2]; // index 2 = March
    expect(march.net).toBe(3500000);
    expect(march.balance).toBe(march.net);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm run test -- --reporter=verbose src/__tests__/report.service.test.ts
```

Expected: The 14 new tests FAIL (properties like `transactionCount`, `totalBalance`, `savingsRate` do not exist on the current service return value). The original 6 tests still pass.

---

### Task 14: Implement new fields in `report.service.ts`

**Files:**
- Modify: `src/server/services/report.service.ts`

- [ ] **Step 1: Replace `getAnnualReportData` with the extended version**

Replace the entire `getAnnualReportData` function (lines 64–121):

```typescript
export async function getAnnualReportData(year: number): Promise<ServiceResult<AnnualReportData>> {
  await ensureSeeded();

  const [monthSummaries, balancesResult, allYearResult, prevYearResult] = await Promise.all([
    txRepo.getMonthSummaries(year),
    listPaymentMethodBalances(),
    txRepo.findFiltered({ year, yearOnly: true, page: 1, pageSize: 10000 }),
    txRepo.findFiltered({ year: year - 1, yearOnly: true, page: 1, pageSize: 10000 }),
  ]);

  if (balancesResult.error) return { error: balancesResult.error };
  const paymentMethodBalances = balancesResult.data ?? [];

  // 12-month breakdown
  const summaryMap = new Map(monthSummaries.map((s) => [s.month, s]));
  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const s = summaryMap.get(i);
    const income = s?.income ?? 0;
    const expense = s?.expense ?? 0;
    const net = income - expense;
    return {
      month: i,
      income,
      expense,
      net,
      balance: net,
      monthKey: `${year}-${String(i + 1).padStart(2, '0')}`,
    };
  });

  const totalIncome = monthlyBreakdown.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthlyBreakdown.reduce((s, m) => s + m.expense, 0);
  const totalAssets = paymentMethodBalances.reduce((s, b) => s + b.balance, 0);
  const totalBalance = totalIncome - totalExpense;
  const transactionCount = allYearResult.rows.length;
  const savingsRate =
    totalIncome > 0 ? Math.round(Math.max(0, (totalBalance / totalIncome) * 100)) : 0;

  // Top categories (all types, top 10) — kept for XLSX generator
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

  // Top expense categories (expense-only, top 5) — for web UI
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

  // Previous year data
  const prevRows = prevYearResult.rows;
  let previousYear: AnnualReportData['previousYear'] = null;
  let comparison: AnnualReportData['comparison'] = null;

  if (prevRows.length > 0) {
    // Build prev year month summaries from the rows we already fetched
    const prevIncomeTotal = prevRows
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const prevExpenseTotal = prevRows
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const prevTotalBalance = prevIncomeTotal - prevExpenseTotal;
    const prevTransactionCount = prevRows.length;
    const prevSavingsRate =
      prevIncomeTotal > 0
        ? Math.round(Math.max(0, (prevTotalBalance / prevIncomeTotal) * 100))
        : 0;

    previousYear = {
      year: year - 1,
      totalIncome: prevIncomeTotal,
      totalExpense: prevExpenseTotal,
      totalBalance: prevTotalBalance,
      transactionCount: prevTransactionCount,
      savingsRate: prevSavingsRate,
    };

    const pctChange = (curr: number, prev: number): number | null => {
      if (prev === 0) return null;
      return Math.round(((curr - prev) / prev) * 100);
    };
    comparison = {
      incomeChange: pctChange(totalIncome, prevIncomeTotal),
      expenseChange: pctChange(totalExpense, prevExpenseTotal),
      balanceChange: pctChange(totalBalance, prevTotalBalance),
      savingsRateChange: pctChange(savingsRate, prevSavingsRate),
    };
  }

  return {
    data: {
      year,
      totalIncome,
      totalExpense,
      totalAssets,
      totalBalance,
      transactionCount,
      savingsRate,
      topCategories,
      topExpenseCategories,
      previousYear,
      comparison,
      monthlyBreakdown,
      paymentMethodBalances,
      transactions: allYearResult.rows,
    },
  };
}
```

- [ ] **Step 2: Run the report service tests**

```bash
npm run test -- --reporter=verbose src/__tests__/report.service.test.ts
```

Expected: All 20 tests pass (6 original + 14 new).

---

### Task 15: Flatten the annual report API response

**Files:**
- Modify: `src/app/api/reports/annual/route.ts`

- [ ] **Step 1: Change line 21 — remove the `{ report: ... }` nesting**

Find this line:
```typescript
  return NextResponse.json({ data: { report: result.data } });
```

Replace with:
```typescript
  return NextResponse.json({ data: result.data });
```

- [ ] **Step 2: Run all tests**

```bash
npm run test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/report.service.test.ts \
        src/server/services/report.service.ts \
        src/app/api/reports/annual/route.ts
git commit -m "feat: extend annual report service with rich fields and flatten API response

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Annual Report Contracts + UI Fix

**Spec ref:** Sections 3a, 3c (contracts), 3d (AnnualSummary)

### Task 16: Update `AnnualReportData` contract and API client

**Files:**
- Modify: `src/lib/api/contracts.ts`
- Modify: `src/lib/api/client.ts`

- [ ] **Step 1: Update `AnnualReportData` in `src/lib/api/contracts.ts`**

Find the `AnnualReportData` interface (around line 302) and replace it:

```typescript
export interface AnnualReportData {
  // Existing fields — kept for report-generator.ts (XLSX download)
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;           // sum of all payment method all-time balances
  monthlyBreakdown: {
    month: number;               // 0-based (0 = January)
    income: number;
    expense: number;
    net: number;                 // kept for report-generator.ts
    balance: number;             // alias for net; used by AnnualSummary.tsx
    monthKey: string;            // 'YYYY-MM', e.g. '2026-03'
  }[];
  topCategories: { category: string; type: 'income' | 'expense'; total: number }[];
  paymentMethodBalances: PaymentMethodBalance[];
  transactions: Transaction[];

  // New fields — consumed by AnnualSummary.tsx
  totalBalance: number;          // totalIncome − totalExpense for the year
  transactionCount: number;
  savingsRate: number;           // 0–100, rounded; 0 if totalIncome = 0 or net is negative
  topExpenseCategories: { category: string; amount: number }[];
  previousYear: {
    year: number;
    totalIncome: number;
    totalExpense: number;
    totalBalance: number;
    transactionCount: number;
    savingsRate: number;
  } | null;
  comparison: {
    incomeChange: number | null;
    expenseChange: number | null;
    balanceChange: number | null;
    savingsRateChange: number | null;
  } | null;
}
```

Also update `AnnualReportResponse` (around line 317):

```typescript
// Before:
export interface AnnualReportResponse {
  report: AnnualReportData;
}

// After — the API now returns AnnualReportData directly (no nesting):
export type AnnualReportResponse = AnnualReportData;
```

- [ ] **Step 2: Update `reports.annual()` in `src/lib/api/client.ts`**

Find the `reports.annual()` method (around line 335) and replace:

```typescript
    annual(year: number) {
      return fetchApi<AnnualReportData>(`/reports/annual?year=${year}`);
    },
```

Remove `AnnualReportResponse` from the imports list at the top of `client.ts` since it is no longer used there (the method now uses `AnnualReportData` directly). Or, since `AnnualReportResponse` is now a type alias for `AnnualReportData`, keeping the import does no harm.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: Exit 0. If there are errors referencing `AnnualReportResponse.report`, find those usages and update them (they should now access fields directly on `AnnualReportData`).

---

### Task 17: Fix `AnnualSummary.tsx`

**Files:**
- Modify: `src/features/reports/AnnualSummary.tsx` (was moved from `src/components/reports/` in Chunk 1)

The component's local `AnnualData` interface now matches `AnnualReportData` from contracts. The fix is to:
1. Remove the local `AnnualData` interface
2. Import `AnnualReportData` from contracts
3. Use it as the query return type

- [ ] **Step 1: Update the import and remove local interface**

Replace the top of the file:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Hash, BarChart3 } from 'lucide-react';
import type { AnnualReportData } from '@/lib/api/contracts';

interface AnnualSummaryProps {
  year: number;
}

export function AnnualSummary({ year }: AnnualSummaryProps) {
  const locale = useLocale();

  const { data, isLoading } = useQuery<AnnualReportData | null>({
    queryKey: ['reports-annual', year],
    queryFn: async () => {
      const res = await fetch(`/api/reports/annual?year=${year}`);
      const json = await res.json();
      return json.data ?? null;
    },
  });
```

This removes the `AnnualData` local interface entirely. The rest of the component is unchanged — `data.totalBalance`, `data.transactionCount`, `data.savingsRate`, `data.topExpenseCategories`, `data.previousYear`, `data.comparison` are all now provided by the API.

- [ ] **Step 2: Verify `data.transactionCount === 0` guard still works**

In the component, find:

```typescript
  if (!data || data.transactionCount === 0) {
```

This line is still correct — `transactionCount` is now a real field on the response. No change needed.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: Exit 0. The `AnnualSummary` component is now fully typed against the real API response.

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/contracts.ts \
        src/lib/api/client.ts \
        src/features/reports/AnnualSummary.tsx
git commit -m "fix: correct AnnualSummary data shape — extend contracts and flatten API response

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Final Verification

- [ ] **Step 1: Run the full preflight check**

```bash
npm run preflight
```

Expected: All of the following pass with exit 0:
- Prettier format check
- TypeScript typecheck
- ESLint lint
- Next.js build

If any step fails, fix the specific issue before proceeding.

- [ ] **Step 2: Confirm test count increased**

```bash
npm run test -- --reporter=verbose 2>&1 | tail -5
```

Expected: Test count is higher than 312 (the 20 new tests added: 6 balance + 14 report). All pass.

- [ ] **Step 3: Push to remote**

```bash
git push origin main
```

---

## Quick Reference: Files Changed

| File | Change |
|------|--------|
| `src/features/dashboard/` | Created (moved from components/dashboard/) |
| `src/features/export/` | Created (moved from components/export/) |
| `src/features/upload/` | Created (moved from components/upload/) |
| `src/features/reports/AnnualSummary.tsx` | Moved + local interface removed, imports contracts type |
| `src/features/reports/TrendChart.tsx` | Moved (no content change) |
| `src/features/transactions/*.tsx` | Moved from components/transactions/ |
| `src/features/transactions/useTransactions.ts` | Moved from hooks/ |
| `src/features/transactions/useRecurringTransactions.ts` | Moved from hooks/ |
| `src/features/transactions/useAllTransactions.ts` | Added `InitialFilters` support |
| `src/features/reports/useReportsData.ts` | Moved from hooks/ |
| `src/features/dashboard/useDashboardData.ts` | Moved from hooks/ |
| `src/features/export/useExport.ts` | Moved from hooks/ |
| `src/features/upload/useUpload.ts` + `useBulkImport.ts` + `useImport.ts` | Moved from hooks/ |
| `src/server/services/balance.service.ts` | Added `month?/year?` params + monthly flow query |
| `src/app/api/payment-methods/balances/route.ts` | Reads month/year params |
| `src/server/services/report.service.ts` | Added 7 new computed fields to `getAnnualReportData` |
| `src/app/api/reports/annual/route.ts` | Flattened response from `{ report: data }` to `data` |
| `src/lib/api/contracts.ts` | Extended `PaymentMethodBalance` + `AnnualReportData` + `AnnualReportResponse` |
| `src/lib/api/client.ts` | Updated `balances.list()` params + `reports.annual()` type |
| `src/features/balances/useBalances.ts` | Passes month/year to API + query key |
| `src/features/balances/BalanceCard.tsx` | Monthly flow secondary line + click support |
| `src/features/balances/BalanceGrid.tsx` | `onCardClick` prop |
| `src/features/balances/AccountBalancesWidget.tsx` | Navigation handler |
| `src/app/transactions/page.tsx` | URL param seeding for paymentMethod filter |
| `src/__tests__/balance.service.test.ts` | 5 new tests for monthlyFlow |
| `src/__tests__/report.service.test.ts` | 14 new tests for rich report fields |
