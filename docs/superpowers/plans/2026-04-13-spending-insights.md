# Spending Insights Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/insights` page with 5 analytics widgets — category comparison, biggest transactions, day-of-week pattern, spending outliers, and monthly health score — all powered by a single server-side API endpoint.

**Architecture:** Single `GET /api/insights/spending` endpoint calls `insights.service.ts` which runs 5 SQL query groups. Client renders via `useInsightsData` hook into 5 presentational components on a responsive grid page. No client-side computation beyond formatting.

**Tech Stack:** Next.js App Router, SQLite (better-sqlite3), Recharts (BarChart), React Query, Framer Motion, Tailwind CSS, Vitest.

**Design Spec:** `docs/superpowers/specs/2026-04-13-spending-insights-page-design.md`

**Worktree:** `.worktrees/spending-insights` on branch `feature/spending-insights`

**Baseline:** 430 tests passing across 26 test files.

---

## File Structure

### New Files (10)
| File | Responsibility |
|------|---------------|
| `src/server/services/insights.service.ts` | All 5 insight computations (SQL queries) |
| `src/app/api/insights/spending/route.ts` | API endpoint |
| `src/app/insights/page.tsx` | Page layout composing all widgets |
| `src/features/insights/useInsightsData.ts` | React Query hook |
| `src/features/insights/HealthScoreCard.tsx` | KPI ring + comparison |
| `src/features/insights/CategoryComparisonChart.tsx` | Horizontal bar chart (Recharts) |
| `src/features/insights/BiggestTransactionsCard.tsx` | Top 5 list card |
| `src/features/insights/DayOfWeekPills.tsx` | 7-pill intensity row |
| `src/features/insights/OutlierAlerts.tsx` | Outlier cards with amber border |
| `src/__tests__/insights.service.test.ts` | 13 service tests |

### Modified Files (5)
| File | Change |
|------|--------|
| `src/features/navigation/nav-config.ts` | Add Insights to Tools group (first position) |
| `src/components/layout/BottomNav.tsx` | Add Insights to More drawer |
| `src/lib/api/client.ts` | Add `insights.spending()` method |
| `src/lib/api/contracts.ts` | Add `SpendingInsightsResponse` type |
| `src/lib/i18n.ts` | 15 new translation keys |

---

## Tasks

### Task 1: Add SpendingInsightsResponse type, API contracts, and i18n keys

**Description:** Foundation task — add the response type to contracts.ts, 15 i18n keys, and all sub-types needed by the service and components.

**Files:**
- Modify: `src/lib/api/contracts.ts`
- Modify: `src/lib/i18n.ts`

**Dependencies:** None

- [ ] **Step 1: Add SpendingInsightsResponse to contracts.ts**

In `src/lib/api/contracts.ts`, append after the existing `NetWorthDataResponse` interface:

```typescript
export interface CategoryComparisonItem {
  categoryId: string;
  category: string;
  color: string;
  thisMonth: number;
  lastMonth: number;
  changePct: number | null;
  changeDelta: number;
}

export interface BiggestTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  color: string;
  paymentMethod: string;
}

export interface DayOfWeekItem {
  dayIndex: number;
  totalAmount: number;
  count: number;
  avgAmount: number;
}

export interface SpendingOutlier {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  color: string;
  categoryAvg: number;
  delta: number;
  multiplier: number;
}

export interface HealthScore {
  income: number;
  expense: number;
  savingsRate: number;
  lastMonthRate: number | null;
  rateChange: number | null;
}

export interface SpendingInsightsResponse {
  categoryComparison: CategoryComparisonItem[];
  biggestTransactions: BiggestTransaction[];
  dayOfWeekPattern: DayOfWeekItem[];
  outliers: SpendingOutlier[];
  healthScore: HealthScore;
  period: { month: number; year: number };
}
```

- [ ] **Step 2: Add 15 i18n keys**

In `src/lib/i18n.ts`, add key names to the `TranslationKeys` interface (after the existing `groupTools` key near the end):

```typescript
insights: string;
spendingInsights: string;
healthScore: string;
fromLastMonth: string;
topCategories: string;
vsLastMonth: string;
biggestTransactions: string;
spendingByDay: string;
youSpendMostOn: string;
unusualSpending: string;
noAnomalies: string;
timesTypical: string;
typicalSpend: string;
noExpensesThisMonth: string;
other: string;
```

Then add both EN and ID translations in the `translations` object:

```typescript
insights: { en: 'Insights', id: 'Analitik' },
spendingInsights: { en: 'Spending Insights', id: 'Analitik Pengeluaran' },
healthScore: { en: 'Monthly Health Score', id: 'Skor Kesehatan Bulanan' },
fromLastMonth: { en: 'from last month', id: 'dari bulan lalu' },
topCategories: { en: 'Category Comparison', id: 'Perbandingan Kategori' },
vsLastMonth: { en: 'vs last month', id: 'vs bulan lalu' },
biggestTransactions: { en: 'Biggest Transactions', id: 'Transaksi Terbesar' },
spendingByDay: { en: 'Spending by Day of Week', id: 'Pengeluaran per Hari' },
youSpendMostOn: { en: 'You spend most on', id: 'Paling banyak di hari' },
unusualSpending: { en: 'Unusual Spending', id: 'Pengeluaran Tidak Biasa' },
noAnomalies: { en: 'No unusual spending this month', id: 'Tidak ada pengeluaran tidak biasa' },
timesTypical: { en: 'your typical', id: 'biasanya' },
typicalSpend: { en: 'typical', id: 'tipikal' },
noExpensesThisMonth: { en: 'No expenses this month', id: 'Tidak ada pengeluaran bulan ini' },
other: { en: 'Other', id: 'Lainnya' },
```

Check for duplicates first — if `other` or `insights` already exists, skip adding those.

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/contracts.ts src/lib/i18n.ts
git commit -m "feat: add SpendingInsightsResponse types and 15 i18n keys"
```

---

### Task 2: Implement insights service — healthScore computation (TDD)

**Description:** Create the insights service with the healthScore query group. This establishes the service file, date helpers, and the overall function skeleton. TDD.

**Files:**
- Create: `src/__tests__/insights.service.test.ts`
- Create: `src/server/services/insights.service.ts`

**Dependencies:** Task 1

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/insights.service.test.ts` with the healthScore tests:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/sqlite';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { createTransaction } from '@/server/services/transaction.service';
import { getSpendingInsights } from '@/server/services/insights.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

// Helper: create expense transaction for a specific month
async function createExpense(month: number, year: number, day: number, amount: number, category = 'Food', categoryId = 'cat-food') {
  const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  await createTransaction({
    date,
    description: `Test expense ${date}`,
    category,
    categoryId,
    type: 'expense',
    amount,
    paymentMethod: 'Cash',
    notes: '',
  });
}

async function createIncome(month: number, year: number, day: number, amount: number) {
  const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  await createTransaction({
    date,
    description: `Test income ${date}`,
    category: 'Salary',
    categoryId: 'cat-salary',
    type: 'income',
    amount,
    paymentMethod: 'Bank',
    notes: '',
  });
}

describe('getSpendingInsights', () => {
  describe('healthScore', () => {
    it('computes savingsRate = 0 when income is 0', async () => {
      await createExpense(2, 2026, 5, 500000);
      const result = await getSpendingInsights(2, 2026);
      expect(result.error).toBeUndefined();
      expect(result.data!.healthScore.savingsRate).toBe(0);
      expect(result.data!.healthScore.income).toBe(0);
      expect(result.data!.healthScore.expense).toBe(500000);
    });

    it('returns lastMonthRate as null when no prior month data', async () => {
      await createIncome(2, 2026, 1, 5000000);
      await createExpense(2, 2026, 5, 3000000);
      const result = await getSpendingInsights(2, 2026);
      expect(result.data!.healthScore.savingsRate).toBe(40);
      expect(result.data!.healthScore.lastMonthRate).toBeNull();
      expect(result.data!.healthScore.rateChange).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests — must FAIL**

Run: `npx vitest run src/__tests__/insights.service.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create insights.service.ts with healthScore**

Create `src/server/services/insights.service.ts`. Implement the function skeleton with only `healthScore` populated (other sections return empty defaults):

```typescript
import { getDb } from '@/server/db/sqlite';
import { ensureSeeded } from '@/server/db/seed';

// Date helpers
function getMonthPrefix(month: number, year: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function getPrevMonth(month: number, year: number): { month: number; year: number } {
  return month === 0 ? { month: 11, year: year - 1 } : { month: month - 1, year };
}

// Health score computation
async function computeHealthScore(month: number, year: number) {
  const db = getDb();
  const prefix = getMonthPrefix(month, year);
  const prev = getPrevMonth(month, year);
  const prevPrefix = getMonthPrefix(prev.month, prev.year);

  const thisMonth = db.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
       COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
     FROM transactions WHERE date LIKE ? || '%'`
  ).get(prefix) as { income: number; expense: number };

  const lastMonth = db.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
       COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
     FROM transactions WHERE date LIKE ? || '%'`
  ).get(prevPrefix) as { income: number; expense: number };

  const savingsRate = thisMonth.income > 0
    ? Math.round(((thisMonth.income - thisMonth.expense) / thisMonth.income) * 100)
    : 0;

  const hasLastMonth = lastMonth.income > 0 || lastMonth.expense > 0;
  const lastMonthRate = hasLastMonth && lastMonth.income > 0
    ? Math.round(((lastMonth.income - lastMonth.expense) / lastMonth.income) * 100)
    : hasLastMonth ? 0 : null;

  return {
    income: thisMonth.income,
    expense: thisMonth.expense,
    savingsRate,
    lastMonthRate,
    rateChange: lastMonthRate !== null ? savingsRate - lastMonthRate : null,
  };
}

export async function getSpendingInsights(month: number, year: number) {
  await ensureSeeded();

  const healthScore = await computeHealthScore(month, year);

  return {
    data: {
      categoryComparison: [],
      biggestTransactions: [],
      dayOfWeekPattern: Array.from({ length: 7 }, (_, i) => ({
        dayIndex: i, totalAmount: 0, count: 0, avgAmount: 0,
      })),
      outliers: [],
      healthScore,
      period: { month, year },
    },
  };
}
```

**IMPORTANT:** Check how `getDb()` works in this codebase. It may return the DB synchronously (`getDb()`) or as a promise (`await getDb()`). Read `src/server/db/sqlite.ts` to confirm. The dashboard service and existing tests show the correct pattern. Use `db.prepare().get()` for better-sqlite3 (synchronous), not `db.query()` which is the async Neon pattern. Check which one the current repo uses by reading existing services.

- [ ] **Step 4: Run tests — must PASS**

Run: `npx vitest run src/__tests__/insights.service.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`
Expected: 432+ tests passing

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/insights.service.test.ts src/server/services/insights.service.ts
git commit -m "feat: add insights service with healthScore computation and tests"
```

---

### Task 3: Add categoryComparison to insights service (TDD)

**Description:** Add the category comparison query group — two GROUP BY queries (this month + last month), joined in JS, with max 8 categories + "Other" bucket.

**Files:**
- Modify: `src/__tests__/insights.service.test.ts` (add 3 tests)
- Modify: `src/server/services/insights.service.ts` (add computeCategoryComparison)

**Dependencies:** Task 2

- [ ] **Step 1: Write failing tests**

Add to the existing test file inside the `describe('getSpendingInsights')` block:

```typescript
describe('categoryComparison', () => {
  it('returns correct thisMonth/lastMonth totals with changePct', async () => {
    // Last month (Jan): Food = 500K
    await createExpense(0, 2026, 5, 500000, 'Food', 'cat-food');
    // This month (Feb): Food = 700K
    await createExpense(1, 2026, 5, 700000, 'Food', 'cat-food');

    const result = await getSpendingInsights(1, 2026);
    const food = result.data!.categoryComparison.find(c => c.categoryId === 'cat-food');
    expect(food).toBeDefined();
    expect(food!.thisMonth).toBe(700000);
    expect(food!.lastMonth).toBe(500000);
    expect(food!.changePct).toBe(40); // (700K-500K)/500K * 100
    expect(food!.changeDelta).toBe(200000);
  });

  it('returns changePct as null when lastMonth is 0', async () => {
    await createExpense(1, 2026, 5, 300000, 'Shopping', 'cat-shop');
    const result = await getSpendingInsights(1, 2026);
    const shop = result.data!.categoryComparison.find(c => c.categoryId === 'cat-shop');
    expect(shop!.changePct).toBeNull();
  });

  it('limits to 8 categories and buckets rest as Other', async () => {
    // Create 10 categories with expenses
    for (let i = 0; i < 10; i++) {
      await createExpense(1, 2026, 5, (10 - i) * 100000, `Cat${i}`, `cat-${i}`);
    }
    const result = await getSpendingInsights(1, 2026);
    expect(result.data!.categoryComparison.length).toBeLessThanOrEqual(8);
    // If there are more than 8 source categories, "Other" should be present
    if (result.data!.categoryComparison.length === 8) {
      const other = result.data!.categoryComparison.find(c => c.category === 'Other');
      expect(other).toBeDefined();
      expect(other!.thisMonth).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run tests — new tests must FAIL**

Run: `npx vitest run src/__tests__/insights.service.test.ts`
Expected: 3 new tests FAIL (categoryComparison returns empty array)

- [ ] **Step 3: Implement computeCategoryComparison**

Add a `computeCategoryComparison()` function to the service. Two `GROUP BY category_id` queries (this month + last month, expense only). Join results in JS. Compute changePct and changeDelta. Sort by thisMonth DESC. If > 8 categories, keep top 7 and bucket the rest into an "Other" entry.

Join categories table for the `color` field: `LEFT JOIN categories c ON c.id = t.category_id`.

Wire it into `getSpendingInsights()` replacing the `categoryComparison: []` placeholder.

- [ ] **Step 4: Run tests — all must PASS**

Run: `npx vitest run src/__tests__/insights.service.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/insights.service.test.ts src/server/services/insights.service.ts
git commit -m "feat: add categoryComparison to insights service with tests"
```

---

### Task 4: Add biggestTransactions and dayOfWeekPattern to insights service (TDD)

**Description:** Two simpler query groups combined into one task. biggestTransactions is a top-5 query. dayOfWeekPattern uses strftime GROUP BY.

**Files:**
- Modify: `src/__tests__/insights.service.test.ts` (add 4 tests)
- Modify: `src/server/services/insights.service.ts`

**Dependencies:** Task 3

- [ ] **Step 1: Write failing tests**

Add to the test file:

```typescript
describe('biggestTransactions', () => {
  it('returns top 5 expense transactions sorted by amount DESC', async () => {
    for (let i = 1; i <= 7; i++) {
      await createExpense(1, 2026, i, i * 100000);
    }
    const result = await getSpendingInsights(1, 2026);
    expect(result.data!.biggestTransactions).toHaveLength(5);
    expect(result.data!.biggestTransactions[0].amount).toBe(700000);
    expect(result.data!.biggestTransactions[4].amount).toBe(300000);
  });

  it('excludes income transactions', async () => {
    await createIncome(1, 2026, 1, 10000000);
    await createExpense(1, 2026, 5, 500000);
    const result = await getSpendingInsights(1, 2026);
    expect(result.data!.biggestTransactions).toHaveLength(1);
    expect(result.data!.biggestTransactions[0].amount).toBe(500000);
  });
});

describe('dayOfWeekPattern', () => {
  it('returns 7 items even if some days have 0 spend', async () => {
    // Create expense on a single day
    await createExpense(1, 2026, 2, 500000); // Feb 2, 2026 = Monday
    const result = await getSpendingInsights(1, 2026);
    expect(result.data!.dayOfWeekPattern).toHaveLength(7);
    // Most days should have 0
    const zeroDays = result.data!.dayOfWeekPattern.filter(d => d.totalAmount === 0);
    expect(zeroDays.length).toBe(6);
  });

  it('computes avgAmount = totalAmount / count for each day', async () => {
    // Create two expenses on same weekday
    await createExpense(1, 2026, 2, 400000); // Monday
    await createExpense(1, 2026, 9, 600000); // Next Monday
    const result = await getSpendingInsights(1, 2026);
    const monday = result.data!.dayOfWeekPattern.find(d => d.dayIndex === 1); // 1 = Monday
    expect(monday!.totalAmount).toBe(1000000);
    expect(monday!.count).toBe(2);
    expect(monday!.avgAmount).toBe(500000);
  });
});
```

- [ ] **Step 2: Run tests — new tests must FAIL**

- [ ] **Step 3: Implement computeBiggestTransactions and computeDayOfWeekPattern**

`computeBiggestTransactions`: SELECT top 5 expense transactions for month/year, ORDER BY amount DESC LIMIT 5. LEFT JOIN categories for color.

`computeDayOfWeekPattern`: `GROUP BY strftime('%w', date)` for expense transactions. strftime('%w') returns '0' (Sunday) to '6' (Saturday) in SQLite. Zero-fill missing days in JS. Compute avgAmount.

Wire both into `getSpendingInsights()`.

- [ ] **Step 4: Run tests — all must PASS**

Run: `npx vitest run src/__tests__/insights.service.test.ts`
Expected: 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/insights.service.test.ts src/server/services/insights.service.ts
git commit -m "feat: add biggestTransactions and dayOfWeekPattern to insights service"
```

---

### Task 5: Add outliers and empty-month edge case to insights service (TDD)

**Description:** The most complex query group — outlier detection by absolute delta from 3-month category average. Plus the final edge case test.

**Files:**
- Modify: `src/__tests__/insights.service.test.ts` (add 4 tests)
- Modify: `src/server/services/insights.service.ts`

**Dependencies:** Task 4

- [ ] **Step 1: Write failing tests**

Add to the test file:

```typescript
describe('outliers', () => {
  it('returns top 5 by absolute delta, filtered by Rp 50.000 minimum', async () => {
    // Build 3-month baseline: avg 200K per transaction in Food
    for (let m = 10; m <= 11; m++) {
      await createExpense(m, 2025, 5, 200000, 'Food', 'cat-food');
    }
    await createExpense(0, 2026, 5, 200000, 'Food', 'cat-food');
    // This month: one big outlier (500K, delta = 300K > 50K floor)
    await createExpense(1, 2026, 10, 500000, 'Food', 'cat-food');
    // One small outlier (220K, delta = 20K < 50K floor — should NOT appear)
    await createExpense(1, 2026, 15, 220000, 'Food', 'cat-food');

    const result = await getSpendingInsights(1, 2026);
    expect(result.data!.outliers.length).toBeGreaterThanOrEqual(1);
    const bigOutlier = result.data!.outliers.find(o => o.amount === 500000);
    expect(bigOutlier).toBeDefined();
    expect(bigOutlier!.delta).toBeGreaterThanOrEqual(50000);
    // Small outlier should not be present
    const smallOutlier = result.data!.outliers.find(o => o.amount === 220000);
    expect(smallOutlier).toBeUndefined();
  });

  it('returns empty array when less than 3 months of data', async () => {
    // Only 1 month of data
    await createExpense(1, 2026, 5, 500000, 'Food', 'cat-food');
    const result = await getSpendingInsights(1, 2026);
    expect(result.data!.outliers).toHaveLength(0);
  });

  it('computes multiplier = amount / categoryAvg correctly', async () => {
    // 3-month baseline: avg 100K
    for (let m = 10; m <= 11; m++) {
      await createExpense(m, 2025, 5, 100000, 'Food', 'cat-food');
    }
    await createExpense(0, 2026, 5, 100000, 'Food', 'cat-food');
    // This month: 400K (4× typical)
    await createExpense(1, 2026, 10, 400000, 'Food', 'cat-food');

    const result = await getSpendingInsights(1, 2026);
    const outlier = result.data!.outliers.find(o => o.amount === 400000);
    expect(outlier).toBeDefined();
    expect(outlier!.multiplier).toBeCloseTo(4, 0);
  });
});

describe('edge cases', () => {
  it('returns all sections empty/zeroed for a month with no transactions', async () => {
    const result = await getSpendingInsights(5, 2026);
    expect(result.error).toBeUndefined();
    expect(result.data!.categoryComparison).toHaveLength(0);
    expect(result.data!.biggestTransactions).toHaveLength(0);
    expect(result.data!.dayOfWeekPattern).toHaveLength(7);
    expect(result.data!.dayOfWeekPattern.every(d => d.totalAmount === 0)).toBe(true);
    expect(result.data!.outliers).toHaveLength(0);
    expect(result.data!.healthScore.savingsRate).toBe(0);
    expect(result.data!.healthScore.income).toBe(0);
    expect(result.data!.healthScore.expense).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests — new tests must FAIL**

- [ ] **Step 3: Implement computeOutliers**

Subquery: per-category average expense transaction amount over the 3 months before the target month. Use date LIKE prefix for each of the 3 prior months. If fewer than 3 months have data, return empty array.

Main query: this month's expense transactions. For each, compute delta = amount - categoryAvg. Filter delta >= 50000. Sort by delta DESC, LIMIT 5. Compute multiplier = amount / categoryAvg. LEFT JOIN categories for color.

Wire into `getSpendingInsights()`.

- [ ] **Step 4: Run tests — all 13 must PASS**

Run: `npx vitest run src/__tests__/insights.service.test.ts`
Expected: 13 tests PASS

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`
Expected: 443+ tests passing

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/insights.service.test.ts src/server/services/insights.service.ts
git commit -m "feat: add outlier detection and empty-month edge case to insights service"
```

---

### Task 6: Create API route

**Description:** Create `GET /api/insights/spending` endpoint.

**Files:**
- Create: `src/app/api/insights/spending/route.ts`

**Dependencies:** Task 5

- [ ] **Step 1: Create route handler**

Create `src/app/api/insights/spending/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSpendingInsights } from '@/server/services/insights.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get('month') ?? '0', 10);
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);

  if (isNaN(month) || month < 0 || month > 11 || isNaN(year)) {
    return NextResponse.json(
      { error: { message: 'Invalid month or year', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  const result = await getSpendingInsights(month, year);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ data: result.data });
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/insights/spending/route.ts
git commit -m "feat: add GET /api/insights/spending endpoint"
```

---

### Task 7: Add API client method and useInsightsData hook

**Description:** Add `insights.spending()` to the API client and create the React Query hook.

**Files:**
- Modify: `src/lib/api/client.ts`
- Create: `src/features/insights/useInsightsData.ts`

**Dependencies:** Task 6, Task 1

- [ ] **Step 1: Add insights namespace to API client**

In `src/lib/api/client.ts`, add after the `netWorth` namespace:

```typescript
insights: {
  spending(month: number, year: number) {
    return fetchApi<SpendingInsightsResponse>(
      `/insights/spending?month=${month}&year=${year}`
    );
  },
},
```

Import `SpendingInsightsResponse` from `./contracts`.

- [ ] **Step 2: Create useInsightsData hook**

Create `src/features/insights/useInsightsData.ts`:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export function useInsightsData(month: number, year: number) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['insights', 'spending', month, year],
    queryFn: async () => {
      const result = await api.insights.spending(month, year);
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
  });

  return { data: data ?? null, isLoading, error };
}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/client.ts src/features/insights/useInsightsData.ts
git commit -m "feat: add insights API client method and useInsightsData hook"
```

---

### Task 8: Create HealthScoreCard component

**Description:** KPI card with circular ring showing savings rate %, color-coded, with comparison to last month.

**Files:**
- Create: `src/features/insights/HealthScoreCard.tsx`

**Dependencies:** Task 1

- [ ] **Step 1: Create the component**

Create `src/features/insights/HealthScoreCard.tsx`. A `'use client'` component receiving `HealthScore` props + locale. Features:
- Circular SVG ring (stroke-dasharray technique) showing savings rate %
- Ring color: `text-emerald-500` if >20%, `text-amber-500` if 0-20%, `text-red-500` if <0%
- Rate text inside ring in monospace
- Comparison text: `+7% from last month` (green) or `-3% from last month` (red) or nothing if lastMonthRate is null
- Income/expense summary on the right (desktop) or below (mobile)
- Uses `fadeInUp` from motion.ts
- All text via `t(locale, key)`

```typescript
interface HealthScoreCardProps {
  healthScore: HealthScore;
  locale: 'en' | 'id';
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/features/insights/HealthScoreCard.tsx
git commit -m "feat: add HealthScoreCard component with savings rate ring"
```

---

### Task 9: Create CategoryComparisonChart component

**Description:** Recharts horizontal BarChart showing this month vs last month per category with % change badges.

**Files:**
- Create: `src/features/insights/CategoryComparisonChart.tsx`

**Dependencies:** Task 1

- [ ] **Step 1: Create the component**

Create `src/features/insights/CategoryComparisonChart.tsx`. A `'use client'` component. Features:
- Recharts `BarChart` with `layout="vertical"` inside `ResponsiveContainer`
- Two bars per category: blue `#3B82F6` (thisMonth) and gray `#475569` (lastMonth)
- Category name as Y-axis label
- Change % badge right-aligned: red background for increase (bad), green for decrease (good) — expenses, so less is better
- Custom tooltip showing both amounts formatted as IDR
- Empty state if categoryComparison array is empty
- Uses `fadeInUp` from motion.ts

```typescript
interface CategoryComparisonChartProps {
  data: CategoryComparisonItem[];
  locale: 'en' | 'id';
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/features/insights/CategoryComparisonChart.tsx
git commit -m "feat: add CategoryComparisonChart with horizontal bars and change badges"
```

---

### Task 10: Create BiggestTransactionsCard component

**Description:** Simple list card showing top 5 expense transactions.

**Files:**
- Create: `src/features/insights/BiggestTransactionsCard.tsx`

**Dependencies:** Task 1

- [ ] **Step 1: Create the component**

Create `src/features/insights/BiggestTransactionsCard.tsx`. Features:
- Card with title "Biggest Transactions" via i18n
- List of up to 5 items, each showing: description, `category · date` in muted text, amount in red monospace right-aligned
- Uses `staggerList` + `staggerListItem` from motion.ts
- Empty state: `t(locale, 'noExpensesThisMonth')`
- Format amounts with `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })`

```typescript
interface BiggestTransactionsCardProps {
  transactions: BiggestTransaction[];
  locale: 'en' | 'id';
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/features/insights/BiggestTransactionsCard.tsx
git commit -m "feat: add BiggestTransactionsCard component"
```

---

### Task 11: Create DayOfWeekPills component

**Description:** 7-pill intensity row with heatmap-style opacity and summary sentence. Pure Tailwind — no Recharts.

**Files:**
- Create: `src/features/insights/DayOfWeekPills.tsx`

**Dependencies:** Task 1

- [ ] **Step 1: Create the component**

Create `src/features/insights/DayOfWeekPills.tsx`. Features:
- 7 pill badges in a `flex` row with `gap-1.5`
- Each pill: day abbreviation (Mon–Sun via date-fns locale or simple array), amount below in monospace
- Background opacity = `totalAmount / maxDayAmount`, normalized to range 0.15–0.6
- Top 2 days by amount get amber highlight (bg-amber-500/opacity, border-amber-500/25)
- Other days use blue (bg-blue-500/opacity)
- Summary sentence below: `"You spend most on **Saturdays**"` using `t(locale, 'youSpendMostOn')` + localized day name
- If all days are 0: just show pills with 0 and no summary
- Format amounts with shortened IDR (e.g., "320K", "1.2M") — use `Intl.NumberFormat` with `notation: 'compact'`

```typescript
interface DayOfWeekPillsProps {
  data: DayOfWeekItem[];
  locale: 'en' | 'id';
}
```

Day name mapping: use a simple array `['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']` for EN, `['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']` for ID. Map by `dayIndex`.

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/features/insights/DayOfWeekPills.tsx
git commit -m "feat: add DayOfWeekPills component with heatmap-style intensity"
```

---

### Task 12: Create OutlierAlerts component

**Description:** Outlier cards with amber left border, multiplier text, and empty state.

**Files:**
- Create: `src/features/insights/OutlierAlerts.tsx`

**Dependencies:** Task 1

- [ ] **Step 1: Create the component**

Create `src/features/insights/OutlierAlerts.tsx`. Features:
- Card per outlier with `border-l-3 border-amber-500` left accent
- Each card shows: description, `category · date` in muted, `"4.2× your typical Shopping spend"` in amber text
- Right side: actual amount (red monospace) + `"typical: Rp 600.000"` in muted
- If no outliers: cheerful empty state with CheckCircle2 icon and `t(locale, 'noAnomalies')`
- Uses `staggerList` + `staggerListItem` from motion.ts
- Multiplier formatted to 1 decimal: `${multiplier.toFixed(1)}×`

```typescript
interface OutlierAlertsProps {
  outliers: SpendingOutlier[];
  locale: 'en' | 'id';
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/features/insights/OutlierAlerts.tsx
git commit -m "feat: add OutlierAlerts component with multiplier text"
```

---

### Task 13: Create insights page layout

**Description:** Compose all 5 widgets into the responsive grid page at `/insights`.

**Files:**
- Create: `src/app/insights/page.tsx`

**Dependencies:** Tasks 7, 8, 9, 10, 11, 12

- [ ] **Step 1: Create the page**

Create `src/app/insights/page.tsx`:
- `'use client'` directive
- Import `useInsightsData` from `@/features/insights/useInsightsData`
- Import all 5 widget components
- Import `useStore` from `@/store` for `ui.locale`, `ui.selectedMonth`, `ui.selectedYear`
- Import `t` from `@/lib/i18n`
- Import `PageHeader` from `@/components/layout/PageHeader` (if it exists, check first)
- Loading skeleton state when `isLoading`
- Responsive grid layout:
  - Row 1: `HealthScoreCard` (full width)
  - Row 2: `grid grid-cols-1 lg:grid-cols-3` — CategoryComparisonChart (col-span-2) + BiggestTransactionsCard (col-span-1)
  - Row 3: `DayOfWeekPills` (full width)
  - Row 4: `OutlierAlerts` (full width)
- Page wrapper: `mx-auto max-w-7xl px-4 py-6 space-y-4`
- Period header: `{monthName} {year} — {t(locale, 'spendingInsights')}`

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/insights/page.tsx
git commit -m "feat: add /insights page with 5 analytics widgets"
```

---

### Task 14: Add Insights to navigation (sidebar + bottom nav)

**Description:** Add Insights link to the Tools group in sidebar and to the More drawer in bottom nav.

**Files:**
- Modify: `src/features/navigation/nav-config.ts`
- Modify: `src/components/layout/BottomNav.tsx`

**Dependencies:** Task 1 (for i18n key `insights`)

- [ ] **Step 1: Add to sidebar nav config**

In `src/features/navigation/nav-config.ts`, find the Tools group `items` array. Add as the FIRST item:

```typescript
{ href: '/insights', labelKey: 'insights', icon: TrendingUp },
```

Import `TrendingUp` from `lucide-react` at the top of the file.

- [ ] **Step 2: Add to bottom nav More drawer**

In `src/components/layout/BottomNav.tsx`, find the `moreItems` array. Add before the Reports entry:

```typescript
{ href: '/insights', key: 'insights', icon: TrendingUp },
```

Import `TrendingUp` from `lucide-react`. If the `NavKey` type union needs updating, add `'insights'` to it.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: 443+ tests passing (no regressions)

- [ ] **Step 4: Commit**

```bash
git add src/features/navigation/nav-config.ts src/components/layout/BottomNav.tsx
git commit -m "feat: add Insights to sidebar Tools group and mobile More drawer"
```

---

## Parallel Execution Map

```
Task 1 (types + i18n, foundation)
  ↓
  ├── Task 2 (healthScore TDD)
  │     ↓
  │   Task 3 (categoryComparison TDD)
  │     ↓
  │   Task 4 (biggest + dayOfWeek TDD)
  │     ↓
  │   Task 5 (outliers TDD)
  │     ↓
  │   Task 6 (API route)
  │     ↓
  │   Task 7 (API client + hook)
  │
  ├── Parallel Group A: Tasks 8, 9, 10, 11, 12 (all components — independent)
  │
  └── Task 14 (navigation — only needs i18n)

Task 13 (page layout) — depends on Tasks 7 + 8 + 9 + 10 + 11 + 12
```

**Parallelizable groups:**
- **After Task 1:** Tasks 2 (start service chain) + Tasks 8–12 (all components, parallel) + Task 14 (navigation)
- **After Task 7:** Task 13 (page layout, once components and hook are ready)

**Service chain is strictly sequential:** Task 2 → 3 → 4 → 5 → 6 → 7 (each builds on prior service work in same file)

**Components (Tasks 8–12) are fully independent** — can run in parallel with each other AND with the service chain, since they only depend on types from Task 1.
