# Recurring Transaction Auto-Generate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add daily Vercel Cron auto-generation of recurring transactions + a dashboard banner for manual one-click generation, with source-tracking idempotency.

**Architecture:** Two mechanisms (Cron job + dashboard banner) share the same service layer. Idempotency via `source_recurring_id` + `source_due_date` columns on the transactions table. New `getDueItems()` service powers the banner; existing `generateDueTransactions()` is enhanced with source tracking. Cron endpoint uses dual auth (CRON_SECRET Bearer token OR Vercel header), whitelisted from JWT middleware.

**Tech Stack:** Next.js App Router, SQLite (better-sqlite3), React Query, Framer Motion, Zustand (UI state only), Vitest, Sonner toasts.

**Design Spec:** `docs/superpowers/specs/2026-04-13-recurring-auto-generate-design.md`

**Worktree:** `.worktrees/recurring-auto-generate` on branch `feature/recurring-auto-generate`

**Baseline:** 410 tests passing across 23 test files.

---

## File Structure

### New Files (5)
| File | Responsibility |
|------|---------------|
| `vercel.json` | Vercel Cron job configuration (daily 01:00 WIB) |
| `src/app/api/cron/generate-recurring/route.ts` | Cron endpoint with dual auth check |
| `src/app/api/recurring-transactions/due/route.ts` | Due items endpoint for dashboard banner |
| `src/features/dashboard/RecurringDueBanner.tsx` | 4-state banner component (hidden/showing/generating/success) |
| `src/features/dashboard/useDueRecurring.ts` | React Query hook for banner data + generate + dismiss |

### Modified Files (9)
| File | Change |
|------|--------|
| `middleware.ts` | Add `/api/cron` to PUBLIC_PATHS array |
| `src/server/db/client.ts` | ALTER TABLE migration for source columns + index |
| `src/lib/types.ts` | Add source fields to Transaction; add DueItem, GenerateResult, DueRecurringResponse |
| `src/server/repositories/transaction.repository.ts` | Accept `sourceRecurringId`/`sourceDueDate` in create() INSERT |
| `src/server/services/recurring-transaction.service.ts` | Idempotency in generate + new getDueItems() |
| `src/lib/api/client.ts` | Add `recurringTransactions.due()`, update `generate()` return type |
| `src/lib/api/contracts.ts` | Add `DueRecurringResponse`, `GenerateResult` types |
| `src/lib/i18n.ts` | 8 new translation keys |
| `src/app/page.tsx` | Render RecurringDueBanner above dashboard content |

---

## Tasks

### Task 1: Add source tracking columns to schema and types

**Description:** Add `source_recurring_id` and `source_due_date` nullable columns to the transactions table via ALTER TABLE migration, create the partial index, and update TypeScript types.

**Files:**
- Modify: `src/server/db/client.ts` (column migration block ~line 189)
- Modify: `src/lib/types.ts` (Transaction interface ~line 52)
- Modify: `src/lib/api/contracts.ts` (add new response types)

**Dependencies:** None

- [ ] **Step 1: Add ALTER TABLE migrations to client.ts**

In `src/server/db/client.ts`, find the column migrations section (the array of ALTER TABLE statements near line 189 that includes the `beginning_balance` migration). Add two new entries to that same array:

```sql
ALTER TABLE transactions ADD COLUMN source_recurring_id TEXT DEFAULT NULL
ALTER TABLE transactions ADD COLUMN source_due_date TEXT DEFAULT NULL
```

Then in the index creation section (~line 207), add:

```sql
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source_recurring_id, source_due_date) WHERE source_recurring_id IS NOT NULL
```

- [ ] **Step 2: Add source fields to Transaction type**

In `src/lib/types.ts`, add to the Transaction interface (after the `notes` field):

```typescript
sourceRecurringId?: string;
sourceDueDate?: string;
```

- [ ] **Step 3: Add new types to contracts.ts**

In `src/lib/api/contracts.ts`, add after the existing recurring transaction contracts:

```typescript
export interface DueItem {
  id: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  frequency: string;
  paymentMethod: string;
  overdueCount: number;
  totalAmount: number;
}

export interface DueRecurringResponse {
  dueItems: DueItem[];
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
}

export interface GenerateResult {
  generated: number;
  skipped: number;
  totalIncome: number;
  totalExpense: number;
}
```

- [ ] **Step 4: Verify existing tests still pass**

Run: `npx vitest run`
Expected: 410 tests passing (no regressions — columns are nullable with defaults)

- [ ] **Step 5: Commit**

```bash
git add src/server/db/client.ts src/lib/types.ts src/lib/api/contracts.ts
git commit -m "feat: add source tracking columns to transactions schema and types"
```

---

### Task 2: Update transaction repository to accept source columns

**Description:** Modify the `create()` method in the transaction repository to pass through `sourceRecurringId` and `sourceDueDate` to the INSERT statement. Also add a `findBySource()` method for idempotency checks.

**Files:**
- Modify: `src/server/repositories/transaction.repository.ts`

**Dependencies:** Task 1

- [ ] **Step 1: Update create() to include source columns**

In `src/server/repositories/transaction.repository.ts`, find the `create()` method. Update the INSERT SQL to include the two new columns, and add them to the parameters array. The columns default to `NULL` when not provided:

```typescript
// In the create() method, update the SQL:
'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, source_recurring_id, source_due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'

// Add to the parameters array (at the end):
data.sourceRecurringId ?? null,
data.sourceDueDate ?? null,
```

- [ ] **Step 2: Add findBySource() method**

Add a new method to the repository for the idempotency check:

```typescript
async findBySource(sourceRecurringId: string, sourceDueDate: string): Promise<Transaction | null> {
  const db = await getDb();
  const result = await db.query<TransactionRow>(
    'SELECT * FROM transactions WHERE source_recurring_id = ? AND source_due_date = ? LIMIT 1',
    [sourceRecurringId, sourceDueDate]
  );
  return result.rows.length > 0 ? rowToTransaction(result.rows[0]) : null;
}
```

- [ ] **Step 3: Update rowToTransaction() mapper**

In the `rowToTransaction()` function, add mappings for the new columns:

```typescript
sourceRecurringId: row.source_recurring_id ?? undefined,
sourceDueDate: row.source_due_date ?? undefined,
```

- [ ] **Step 4: Verify existing tests still pass**

Run: `npx vitest run`
Expected: 410 tests passing (existing callers pass undefined for new fields → NULL in DB)

- [ ] **Step 5: Commit**

```bash
git add src/server/repositories/transaction.repository.ts
git commit -m "feat: add source tracking columns to transaction repository create and findBySource"
```

---

### Task 3: Add getDueItems() service with tests

**Description:** Add the `getDueItems()` service method that computes overdue counts per rule for the dashboard banner. TDD — write tests first.

**Files:**
- Create: `src/__tests__/recurring-transaction-due.service.test.ts`
- Modify: `src/server/services/recurring-transaction.service.ts`

**Dependencies:** Task 1

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/recurring-transaction-due.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/sqlite';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  createRecurringTransaction,
  getDueItems,
} from '@/server/services/recurring-transaction.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

const baseRule = {
  description: 'Test Rule',
  category: 'Salary',
  categoryId: 'cat-1',
  type: 'income' as const,
  amount: 1000000,
  paymentMethod: 'BCA',
  notes: '',
  frequency: 'monthly' as const,
  startDate: '2026-01-01',
  endDate: null,
  isActive: true,
};

describe('getDueItems', () => {
  it('returns empty array when no rules are due', async () => {
    await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2099-12-01',
    });
    const result = await getDueItems();
    expect(result.error).toBeUndefined();
    expect(result.data!.dueItems).toHaveLength(0);
    expect(result.data!.totalTransactions).toBe(0);
  });

  it('computes correct overdueCount for a monthly rule', async () => {
    await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-01-01',
      frequency: 'monthly',
    });
    const result = await getDueItems();
    expect(result.error).toBeUndefined();
    expect(result.data!.dueItems).toHaveLength(1);
    const item = result.data!.dueItems[0];
    expect(item.overdueCount).toBeGreaterThanOrEqual(1);
    expect(item.totalAmount).toBe(item.amount * item.overdueCount);
    expect(item.description).toBe('Test Rule');
    expect(item.type).toBe('income');
    expect(item.frequency).toBe('monthly');
  });

  it('computes totalAmount as amount × overdueCount', async () => {
    await createRecurringTransaction({
      ...baseRule,
      amount: 500000,
      nextDueDate: '2026-01-01',
      frequency: 'monthly',
    });
    const result = await getDueItems();
    const item = result.data!.dueItems[0];
    expect(item.totalAmount).toBe(500000 * item.overdueCount);
  });

  it('aggregates totalTransactions, totalIncome, totalExpense', async () => {
    await createRecurringTransaction({
      ...baseRule,
      type: 'income',
      amount: 1000000,
      nextDueDate: '2026-03-01',
      frequency: 'monthly',
    });
    await createRecurringTransaction({
      ...baseRule,
      description: 'Expense Rule',
      type: 'expense',
      amount: 200000,
      nextDueDate: '2026-03-01',
      frequency: 'monthly',
    });
    const result = await getDueItems();
    expect(result.data!.dueItems).toHaveLength(2);
    expect(result.data!.totalTransactions).toBe(
      result.data!.dueItems.reduce((sum, i) => sum + i.overdueCount, 0)
    );
    expect(result.data!.totalIncome).toBeGreaterThan(0);
    expect(result.data!.totalExpense).toBeGreaterThan(0);
  });

  it('excludes inactive rules', async () => {
    const created = await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-01-01',
      isActive: true,
    });
    // Deactivate it
    const { updateRecurringTransaction } = await import(
      '@/server/services/recurring-transaction.service'
    );
    await updateRecurringTransaction(created.data!.id, { isActive: false });
    const result = await getDueItems();
    expect(result.data!.dueItems).toHaveLength(0);
  });

  it('stops counting at endDate', async () => {
    await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-01-01',
      endDate: '2026-02-15',
      frequency: 'monthly',
    });
    const result = await getDueItems();
    if (result.data!.dueItems.length > 0) {
      // Should only count periods up to endDate
      expect(result.data!.dueItems[0].overdueCount).toBeLessThanOrEqual(2);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/recurring-transaction-due.service.test.ts`
Expected: FAIL — `getDueItems` is not exported from the service module

- [ ] **Step 3: Implement getDueItems()**

In `src/server/services/recurring-transaction.service.ts`, add the new exported function. It reuses the existing `advanceDate()` helper and `repo.findDue()`:

```typescript
export async function getDueItems(): Promise<
  ServiceResult<{
    dueItems: Array<{
      id: string;
      description: string;
      type: 'income' | 'expense';
      amount: number;
      frequency: string;
      paymentMethod: string;
      overdueCount: number;
      totalAmount: number;
    }>;
    totalTransactions: number;
    totalIncome: number;
    totalExpense: number;
  }>
> {
  await ensureSeeded();
  const today = new Date().toISOString().slice(0, 10);
  const dueRules = await repo.findDue(today);

  const dueItems = dueRules.map((rule) => {
    let count = 0;
    let date = rule.nextDueDate;
    while (date <= today) {
      if (rule.endDate && date > rule.endDate) break;
      count++;
      date = advanceDate(date, rule.frequency);
    }
    return {
      id: rule.id,
      description: rule.description,
      type: rule.type,
      amount: rule.amount,
      frequency: rule.frequency,
      paymentMethod: rule.paymentMethod,
      overdueCount: count,
      totalAmount: rule.amount * count,
    };
  });

  const totalTransactions = dueItems.reduce((s, i) => s + i.overdueCount, 0);
  const totalIncome = dueItems
    .filter((i) => i.type === 'income')
    .reduce((s, i) => s + i.totalAmount, 0);
  const totalExpense = dueItems
    .filter((i) => i.type === 'expense')
    .reduce((s, i) => s + i.totalAmount, 0);

  return { data: { dueItems, totalTransactions, totalIncome, totalExpense } };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/recurring-transaction-due.service.test.ts`
Expected: 6 tests PASS

- [ ] **Step 5: Run full suite to check for regressions**

Run: `npx vitest run`
Expected: 416+ tests passing

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/recurring-transaction-due.service.test.ts src/server/services/recurring-transaction.service.ts
git commit -m "feat: add getDueItems() service with tests for dashboard banner"
```

---

### Task 4: Update generateDueTransactions() with idempotency and source tracking

**Description:** Modify the existing generation loop to use source tracking for idempotency, wrap operations in SQLite transactions, and return enriched results. TDD — write tests first.

**Files:**
- Create: `src/__tests__/recurring-transaction-generate.service.test.ts`
- Modify: `src/server/services/recurring-transaction.service.ts`

**Dependencies:** Task 2

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/recurring-transaction-generate.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/sqlite';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  createRecurringTransaction,
  generateRecurringTransactions,
} from '@/server/services/recurring-transaction.service';
import { listTransactions } from '@/server/services/transaction.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

const baseRule = {
  description: 'Monthly Salary',
  category: 'Salary',
  categoryId: 'cat-1',
  type: 'income' as const,
  amount: 5000000,
  paymentMethod: 'BCA',
  notes: '',
  frequency: 'monthly' as const,
  startDate: '2026-01-01',
  endDate: null,
  isActive: true,
};

describe('generateDueTransactions with idempotency', () => {
  it('sets source_recurring_id and source_due_date on generated transactions', async () => {
    const rule = await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-03-01',
      frequency: 'monthly',
    });
    const result = await generateRecurringTransactions();
    expect(result.data!.generated).toBeGreaterThan(0);

    const txResult = await listTransactions({});
    const generated = txResult.data!.transactions.filter(
      (tx) => tx.sourceRecurringId === rule.data!.id
    );
    expect(generated.length).toBeGreaterThan(0);
    expect(generated[0].sourceDueDate).toBe('2026-03-01');
  });

  it('skips when transaction already exists for same rule + due date', async () => {
    await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-03-01',
      frequency: 'monthly',
    });

    const first = await generateRecurringTransactions();
    const firstGenerated = first.data!.generated;
    expect(firstGenerated).toBeGreaterThan(0);

    // Run again — should skip all
    const second = await generateRecurringTransactions();
    expect(second.data!.generated).toBe(0);
    expect(second.data!.skipped).toBe(0); // no due items left (nextDueDate advanced past today)
  });

  it('returns skipped count when duplicates exist', async () => {
    const rule = await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-03-01',
      frequency: 'monthly',
    });

    // Generate once
    await generateRecurringTransactions();

    // Reset nextDueDate back to force re-processing
    const { updateRecurringTransaction } = await import(
      '@/server/services/recurring-transaction.service'
    );
    await updateRecurringTransaction(rule.data!.id, {
      nextDueDate: '2026-03-01',
    });

    // Generate again — should skip the already-existing ones
    const result = await generateRecurringTransactions();
    expect(result.data!.skipped).toBeGreaterThan(0);
    expect(result.data!.generated).toBe(0);
  });

  it('advances next_due_date even when transaction is skipped', async () => {
    const rule = await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-03-01',
      frequency: 'monthly',
    });

    await generateRecurringTransactions();

    // Reset and re-generate
    const { updateRecurringTransaction, getRecurringTransaction } =
      await import('@/server/services/recurring-transaction.service');
    await updateRecurringTransaction(rule.data!.id, {
      nextDueDate: '2026-03-01',
    });

    await generateRecurringTransactions();

    // nextDueDate should still be advanced past today
    const updated = await getRecurringTransaction(rule.data!.id);
    const today = new Date().toISOString().slice(0, 10);
    expect(updated.data!.nextDueDate > today).toBe(true);
  });

  it('returns correct totalIncome and totalExpense', async () => {
    await createRecurringTransaction({
      ...baseRule,
      type: 'income',
      amount: 1000000,
      nextDueDate: '2026-03-01',
      frequency: 'monthly',
    });
    await createRecurringTransaction({
      ...baseRule,
      description: 'Netflix',
      type: 'expense',
      amount: 186000,
      nextDueDate: '2026-03-01',
      frequency: 'monthly',
    });

    const result = await generateRecurringTransactions();
    expect(result.data!.totalIncome).toBeGreaterThan(0);
    expect(result.data!.totalExpense).toBeGreaterThan(0);
    expect(result.data!.generated).toBeGreaterThan(0);
  });

  it('returns zeros when no rules are due', async () => {
    await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2099-12-01',
    });
    const result = await generateRecurringTransactions();
    expect(result.data!.generated).toBe(0);
    expect(result.data!.skipped).toBe(0);
    expect(result.data!.totalIncome).toBe(0);
    expect(result.data!.totalExpense).toBe(0);
  });

  it('respects endDate and deactivates expired rules', async () => {
    const rule = await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-01-01',
      endDate: '2026-02-15',
      frequency: 'monthly',
    });

    await generateRecurringTransactions();

    const { getRecurringTransaction } = await import(
      '@/server/services/recurring-transaction.service'
    );
    const updated = await getRecurringTransaction(rule.data!.id);
    expect(updated.data!.isActive).toBe(false);
  });

  it('catches up multiple missed periods in one call', async () => {
    await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-01-01',
      frequency: 'monthly',
    });
    const result = await generateRecurringTransactions();
    // From Jan 2026 to today (Apr 2026) = at least 3 months
    expect(result.data!.generated).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/recurring-transaction-generate.service.test.ts`
Expected: FAIL — `skipped`, `totalIncome`, `totalExpense` are not in the return type

- [ ] **Step 3: Update generateDueTransactions() implementation**

In `src/server/services/recurring-transaction.service.ts`, replace the existing `generateDueTransactions()` function with the idempotent version. Key changes:
1. Import `findBySource` from the transaction repository
2. Before each insert, call `txRepo.findBySource(rule.id, nextDate)`
3. If found, increment `skipped` instead of inserting
4. Pass `sourceRecurringId: rule.id` and `sourceDueDate: nextDate` to `txRepo.create()`
5. Track `totalIncome` and `totalExpense`
6. Update return type to `{ generated, skipped, totalIncome, totalExpense }`

```typescript
export async function generateRecurringTransactions(): Promise<
  ServiceResult<{
    generated: number;
    skipped: number;
    totalIncome: number;
    totalExpense: number;
  }>
> {
  await ensureSeeded();
  const today = new Date().toISOString().slice(0, 10);
  const dueRules = await repo.findDue(today);

  let generated = 0;
  let skipped = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  for (const rule of dueRules) {
    let nextDate = rule.nextDueDate;

    while (nextDate <= today) {
      if (rule.endDate && nextDate > rule.endDate) break;

      // Idempotency check
      const existing = await txRepo.findBySource(rule.id, nextDate);
      if (existing) {
        skipped++;
      } else {
        await txRepo.create({
          date: nextDate,
          description: rule.description,
          category: rule.category,
          categoryId: rule.categoryId,
          type: rule.type,
          amount: rule.amount,
          paymentMethod: rule.paymentMethod,
          notes: rule.notes,
          sourceRecurringId: rule.id,
          sourceDueDate: nextDate,
        });
        generated++;
        if (rule.type === 'income') totalIncome += rule.amount;
        else totalExpense += rule.amount;
      }

      nextDate = advanceDate(nextDate, rule.frequency);
    }

    if (rule.endDate && nextDate > rule.endDate) {
      await repo.update(rule.id, { isActive: false, nextDueDate: nextDate });
    } else {
      await repo.update(rule.id, { nextDueDate: nextDate });
    }
  }

  return { data: { generated, skipped, totalIncome, totalExpense } };
}
```

- [ ] **Step 4: Run new tests to verify they pass**

Run: `npx vitest run src/__tests__/recurring-transaction-generate.service.test.ts`
Expected: 8 tests PASS

- [ ] **Step 5: Run full suite to check for regressions**

Run: `npx vitest run`
Expected: 424+ tests passing (410 baseline + 6 getDueItems + 8 generate)

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/recurring-transaction-generate.service.test.ts src/server/services/recurring-transaction.service.ts
git commit -m "feat: add source tracking idempotency to generateDueTransactions with tests"
```

---

### Task 5: Create due items API route

**Description:** Create `GET /api/recurring-transactions/due` endpoint that calls `getDueItems()` and returns the response for the dashboard banner.

**Files:**
- Create: `src/app/api/recurring-transactions/due/route.ts`

**Dependencies:** Task 3

- [ ] **Step 1: Create the route handler**

Create `src/app/api/recurring-transactions/due/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getDueItems } from '@/server/services/recurring-transaction.service';

export async function GET() {
  const result = await getDueItems();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ data: result.data });
}
```

- [ ] **Step 2: Verify it doesn't break the build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/recurring-transactions/due/route.ts
git commit -m "feat: add GET /api/recurring-transactions/due endpoint"
```

---

### Task 6: Update existing generate route response

**Description:** Update the existing `POST /api/recurring-transactions/generate` route to pass through the enriched response (skipped, totalIncome, totalExpense).

**Files:**
- Modify: `src/app/api/recurring-transactions/generate/route.ts`

**Dependencies:** Task 4

- [ ] **Step 1: Update the route handler**

The existing route at `src/app/api/recurring-transactions/generate/route.ts` already calls `generateRecurringTransactions()` and returns `{ data: result.data }`. Since we changed the service return type in Task 4 to include `skipped`, `totalIncome`, `totalExpense`, the route automatically passes them through. **Verify the existing code still works:**

```typescript
import { NextResponse } from 'next/server';
import { generateRecurringTransactions } from '@/server/services/recurring-transaction.service';

export async function POST() {
  const result = await generateRecurringTransactions();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: result.data });
}
```

If the route already spreads `result.data` directly, no code change is needed — the new fields pass through automatically. Verify by reading the file.

- [ ] **Step 2: Verify type check passes**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit (only if changes were needed)**

```bash
git add src/app/api/recurring-transactions/generate/route.ts
git commit -m "feat: update generate route to pass through enriched response"
```

---

### Task 7: Create cron endpoint with dual auth and tests

**Description:** Create `POST /api/cron/generate-recurring` with dual auth (CRON_SECRET Bearer token OR Vercel header). Add `/api/cron` to middleware public paths. Write tests for the auth logic.

**Files:**
- Create: `src/app/api/cron/generate-recurring/route.ts`
- Modify: `middleware.ts`
- Create: `src/__tests__/cron-generate.route.test.ts`

**Dependencies:** Task 4

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/cron-generate.route.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/cron/generate-recurring/route';

// Mock the service to isolate route auth logic
vi.mock('@/server/services/recurring-transaction.service', () => ({
  generateRecurringTransactions: vi.fn().mockResolvedValue({
    data: { generated: 3, skipped: 0, totalIncome: 5000000, totalExpense: 0 },
  }),
}));

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/cron/generate-recurring', {
    method: 'POST',
    headers,
  });
}

describe('POST /api/cron/generate-recurring', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-secret-12345');
  });

  it('returns 401 without any auth header', async () => {
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 with wrong CRON_SECRET', async () => {
    const response = await POST(
      makeRequest({ authorization: 'Bearer wrong-secret' })
    );
    expect(response.status).toBe(401);
  });

  it('returns 200 with correct Bearer token', async () => {
    const response = await POST(
      makeRequest({ authorization: 'Bearer test-secret-12345' })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.generated).toBe(3);
    expect(body.data.skipped).toBe(0);
  });

  it('returns 200 with x-vercel-cron-signature header', async () => {
    const response = await POST(
      makeRequest({ 'x-vercel-cron-signature': 'some-vercel-value' })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.generated).toBe(3);
  });

  it('returns generated and skipped counts in response', async () => {
    const response = await POST(
      makeRequest({ authorization: 'Bearer test-secret-12345' })
    );
    const body = await response.json();
    expect(body.data).toHaveProperty('generated');
    expect(body.data).toHaveProperty('skipped');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/cron-generate.route.test.ts`
Expected: FAIL — module `@/app/api/cron/generate-recurring/route` does not exist

- [ ] **Step 3: Create the cron route handler**

Create `src/app/api/cron/generate-recurring/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { generateRecurringTransactions } from '@/server/services/recurring-transaction.service';

if (!process.env.CRON_SECRET) {
  console.warn(
    'CRON_SECRET not set — cron endpoint will reject all requests unless Vercel header is present'
  );
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const vercelHeader = request.headers.get('x-vercel-cron-signature');

  const isSecretValid =
    !!process.env.CRON_SECRET &&
    authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isVercelCron = vercelHeader != null;

  if (!isSecretValid && !isVercelCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await generateRecurringTransactions();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      generated: result.data?.generated ?? 0,
      skipped: result.data?.skipped ?? 0,
    },
  });
}
```

- [ ] **Step 4: Add /api/cron to middleware public paths**

In `middleware.ts`, find the `PUBLIC_PATHS` array and add `'/api/cron'`:

```typescript
const PUBLIC_PATHS = ['/login', '/register', '/api/auth', '/api/health', '/api/cron'];
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/cron-generate.route.test.ts`
Expected: 5 tests PASS

- [ ] **Step 6: Run full suite**

Run: `npx vitest run`
Expected: 429+ tests passing

- [ ] **Step 7: Commit**

```bash
git add src/app/api/cron/generate-recurring/route.ts middleware.ts src/__tests__/cron-generate.route.test.ts
git commit -m "feat: add cron endpoint with dual auth check and middleware whitelist"
```

---

### Task 8: Create vercel.json and add CRON_SECRET to .env.local

**Description:** Create the Vercel Cron configuration file and add CRON_SECRET to the local environment.

**Files:**
- Create: `vercel.json`
- Modify: `.env.local` (if it exists, add CRON_SECRET)

**Dependencies:** Task 7

- [ ] **Step 1: Create vercel.json**

Create `vercel.json` at the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-recurring",
      "schedule": "0 18 * * *"
    }
  ]
}
```

- [ ] **Step 2: Add CRON_SECRET to .env.local**

If `.env.local` exists, append:

```
CRON_SECRET=dev-cron-secret-replace-in-prod
```

If `.env.local` doesn't exist, create it with the above content. Do NOT commit `.env.local` (verify it's in `.gitignore`).

- [ ] **Step 3: Commit vercel.json only**

```bash
git add vercel.json
git commit -m "feat: add vercel.json with daily cron job at 01:00 WIB"
```

---

### Task 9: Add API client method and i18n keys

**Description:** Add the `recurringTransactions.due()` method to the API client, update the `generate()` return type, and add 8 new i18n translation keys.

**Files:**
- Modify: `src/lib/api/client.ts`
- Modify: `src/lib/i18n.ts`

**Dependencies:** Task 1 (for types), Task 5 (for due endpoint)

- [ ] **Step 1: Add due() method and update generate() return type in API client**

In `src/lib/api/client.ts`, find the `recurringTransactions` namespace object. Add the `due()` method and update the `generate()` return type:

```typescript
// Add after the existing generate() method:
due() {
  return fetchApi<DueRecurringResponse>('/recurring-transactions/due');
},
```

Update the existing `generate()` method return type from `{ generated: number }` to `GenerateResult`:

```typescript
generate() {
  return fetchApi<GenerateResult>('/recurring-transactions/generate', {
    method: 'POST',
  });
},
```

Add the imports at the top of the file:

```typescript
import type { DueRecurringResponse, GenerateResult } from './contracts';
```

- [ ] **Step 2: Add i18n keys**

In `src/lib/i18n.ts`, first add the key names to the `TranslationKeys` interface (in the appropriate section near the existing recurring keys):

```typescript
recurringDue: string;
recurringDueDesc: string;
generateAll: string;
generating: string;
transactionsGenerated: string;
moreRules: string;
showAll: string;
showLess: string;
failedGenerate: string;
```

Then add the translations in the `translations` object (both EN and ID):

```typescript
recurringDue: { en: 'Recurring Transactions Due', id: 'Transaksi Berulang Jatuh Tempo' },
recurringDueDesc: { en: 'Generate to add them to your records', id: 'Buat untuk menambahkan ke catatan Anda' },
generateAll: { en: 'Generate All', id: 'Buat Semua' },
generating: { en: 'Generating...', id: 'Membuat...' },
transactionsGenerated: { en: 'transactions generated', id: 'transaksi dibuat' },
moreRules: { en: 'more rules', id: 'aturan lagi' },
showAll: { en: 'Show all', id: 'Tampilkan semua' },
showLess: { en: 'Show less', id: 'Tampilkan sedikit' },
failedGenerate: { en: 'Failed to generate transactions', id: 'Gagal membuat transaksi' },
```

Check for duplicates first — `generateNow` and `generated` already exist (different purpose), so the new keys are safe. Verify `income` and `expense` keys exist for the success state labels (they should already be in i18n).

- [ ] **Step 3: Verify type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/client.ts src/lib/i18n.ts
git commit -m "feat: add API client due() method and 8 i18n keys for recurring banner"
```

---

### Task 10: Create useDueRecurring hook

**Description:** Create the React Query hook that powers the dashboard banner. Handles data fetching, generation action, and sessionStorage dismiss.

**Files:**
- Create: `src/features/dashboard/useDueRecurring.ts`

**Dependencies:** Task 9

- [ ] **Step 1: Create the hook**

Create `src/features/dashboard/useDueRecurring.ts`:

```typescript
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { DueItem, GenerateResult } from '@/lib/api/contracts';

function getDismissKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `recurring-banner-dismissed-${today}`;
}

function isDismissedToday(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(getDismissKey()) === 'true';
}

export function useDueRecurring() {
  const queryClient = useQueryClient();
  const [isDismissed, setIsDismissed] = useState(isDismissedToday);

  const { data, isLoading } = useQuery({
    queryKey: ['recurring-transactions', 'due'],
    queryFn: async () => {
      const result = await api.recurringTransactions.due();
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
  });

  const mutation = useMutation({
    mutationFn: async (): Promise<GenerateResult> => {
      const result = await api.recurringTransactions.generate();
      if (result.error) throw new Error(result.error.message);
      return result.data! as GenerateResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const dismiss = useCallback(() => {
    sessionStorage.setItem(getDismissKey(), 'true');
    setIsDismissed(true);
  }, []);

  const dueItems: DueItem[] = data?.dueItems ?? [];
  const totalTransactions = data?.totalTransactions ?? 0;
  const totalIncome = data?.totalIncome ?? 0;
  const totalExpense = data?.totalExpense ?? 0;

  const hasDueItems = useMemo(
    () => dueItems.length > 0 && !isDismissed,
    [dueItems.length, isDismissed]
  );

  return {
    dueItems,
    totalTransactions,
    totalIncome,
    totalExpense,
    isLoading,
    generate: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    isDismissed,
    dismiss,
    hasDueItems,
  };
}
```

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/useDueRecurring.ts
git commit -m "feat: add useDueRecurring hook for dashboard banner"
```

---

### Task 11: Create RecurringDueBanner component

**Description:** Build the 4-state banner component (hidden/showing/generating/success) with card design, item list with overflow toggle, responsive layout, and accessibility.

**Files:**
- Create: `src/features/dashboard/RecurringDueBanner.tsx`

**Dependencies:** Task 10

- [ ] **Step 1: Create the banner component**

Create `src/features/dashboard/RecurringDueBanner.tsx`. This is the largest single component. Key implementation details:

- Import `motion` and `AnimatePresence` from `framer-motion`
- Import `fadeInUp`, `staggerList` from `@/lib/motion`
- Import `cn` from `@/lib/utils`
- Import `t` from `@/lib/i18n`
- Import `formatCurrency` from `@/lib/formatters` (or equivalent)
- Import `Button` from `@/components/ui/button`
- Import `Clock`, `Check`, `X`, `Loader2`, `ChevronDown` from `lucide-react`
- Import `toast` from `sonner`
- Import `DueItem`, `GenerateResult` from `@/lib/api/contracts`

Component structure:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { fadeInUp, staggerList } from '@/lib/motion';
import { toast } from 'sonner';
import type { DueItem, GenerateResult } from '@/lib/api/contracts';

const MAX_VISIBLE = 5;

interface RecurringDueBannerProps {
  dueItems: DueItem[];
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
  onGenerate: () => Promise<GenerateResult>;
  onDismiss: () => void;
  isGenerating: boolean;
  locale: 'en' | 'id';
}

type BannerState = 'showing' | 'generating' | 'success';

export function RecurringDueBanner({
  dueItems,
  totalTransactions,
  totalIncome,
  totalExpense,
  onGenerate,
  onDismiss,
  isGenerating,
  locale,
}: RecurringDueBannerProps) {
  const [state, setState] = useState<BannerState>('showing');
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const visibleItems = expanded ? dueItems : dueItems.slice(0, MAX_VISIBLE);
  const hiddenCount = dueItems.length - MAX_VISIBLE;

  const handleGenerate = useCallback(async () => {
    setState('generating');
    try {
      const res = await onGenerate();
      setResult(res);
      setState('success');
      toast.success(`${res.generated} ${t(locale, 'transactionsGenerated')}`);
      setTimeout(() => {
        onDismiss();
      }, 2000);
    } catch {
      setState('showing');
      toast.error(t(locale, 'failedGenerate'));
    }
  }, [onGenerate, onDismiss, locale]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (state === 'success' && result) {
    return (
      <motion.div
        role="status"
        aria-live="polite"
        initial={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
      >
        <div className="rounded-2xl bg-gradient-to-br from-emerald-950 to-slate-950 border border-emerald-500/25 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
            <Check className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="text-emerald-500 font-semibold text-lg">
            {result.generated} {t(locale, 'transactionsGenerated')}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {result.totalIncome > 0 && `+${formatAmount(result.totalIncome)} ${t(locale, 'income')}`}
            {result.totalIncome > 0 && result.totalExpense > 0 && ' · '}
            {result.totalExpense > 0 && `-${formatAmount(result.totalExpense)} ${t(locale, 'expense')}`}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      role="region"
      aria-label={t(locale, 'recurringDue')}
      {...fadeInUp}
      className="mb-4"
    >
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 p-4 sm:p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15">
              <Clock className="h-[18px] w-[18px] text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">
                {totalTransactions} {t(locale, 'recurringDue')}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(locale, 'recurringDueDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            disabled={state === 'generating'}
            className={cn(
              'p-1 text-slate-500 hover:text-slate-300 transition-colors',
              state === 'generating' && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="Dismiss recurring transactions banner for today"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Item list */}
        <div className="flex flex-col gap-1.5 mb-3">
          {visibleItems.map((item, index) => (
            <motion.div
              key={item.id}
              variants={staggerList}
              custom={index}
              className="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full flex-shrink-0',
                    item.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'
                  )}
                />
                <span className="text-sm text-slate-300 truncate">
                  {item.description}
                </span>
                {item.overdueCount > 1 && (
                  <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
                    ×{item.overdueCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-sm font-mono flex-shrink-0 ml-3',
                  item.type === 'income' ? 'text-emerald-500' : 'text-red-500'
                )}
              >
                {item.type === 'income' ? '+' : '-'}
                {formatAmount(item.totalAmount)}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Overflow toggle */}
        {dueItems.length > MAX_VISIBLE && (
          <div className="text-center mb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
            >
              {expanded
                ? t(locale, 'showLess')
                : `+ ${hiddenCount} ${t(locale, 'moreRules')} · ${t(locale, 'showAll')}`}
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDismiss}
            disabled={state === 'generating'}
            className={cn(
              'text-slate-400 border-slate-700',
              state === 'generating' && 'opacity-50'
            )}
          >
            {t(locale, 'dismiss')}
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={state === 'generating'}
            aria-busy={state === 'generating'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {state === 'generating' ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                {t(locale, 'generating')}
              </>
            ) : (
              `${t(locale, 'generateAll')} (${totalTransactions})`
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/RecurringDueBanner.tsx
git commit -m "feat: add RecurringDueBanner component with 4-state design"
```

---

### Task 12: Integrate banner into dashboard page

**Description:** Wire the `useDueRecurring` hook and `RecurringDueBanner` component into the dashboard page, rendering the banner above all existing content.

**Files:**
- Modify: `src/app/page.tsx`

**Dependencies:** Task 11

- [ ] **Step 1: Add banner to dashboard page**

In `src/app/page.tsx`, import and render the banner above the existing `FolderNavigator`. The page currently renders just `<FolderNavigator />`. Add the hook and banner:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { FolderNavigator } from '@/components/folders/FolderNavigator';
import { AnimatePresence } from 'framer-motion';
import { useDueRecurring } from '@/features/dashboard/useDueRecurring';
import { RecurringDueBanner } from '@/features/dashboard/RecurringDueBanner';
import { useStore } from '@/store';

export default function DashboardPage() {
  const router = useRouter();
  const locale = useStore((s) => s.ui.locale);
  useKeyboardShortcuts({
    onNewTransaction: () => router.push('/transactions/new'),
  });

  const {
    dueItems,
    totalTransactions,
    totalIncome,
    totalExpense,
    generate,
    isGenerating,
    dismiss,
    hasDueItems,
  } = useDueRecurring();

  return (
    <>
      <AnimatePresence>
        {hasDueItems && (
          <div className="mx-auto max-w-7xl px-4 pt-4">
            <RecurringDueBanner
              dueItems={dueItems}
              totalTransactions={totalTransactions}
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              onGenerate={generate}
              onDismiss={dismiss}
              isGenerating={isGenerating}
              locale={locale}
            />
          </div>
        )}
      </AnimatePresence>
      <FolderNavigator />
    </>
  );
}
```

**Note:** The exact placement may need adjustment based on how `FolderNavigator` and the dashboard layout work. The banner should appear inside the scrollable content area, above the dashboard widgets. If the current page structure doesn't allow this (e.g., `FolderNavigator` manages its own layout), the banner may need to go inside `FolderNavigator` or the dashboard content component instead. Read the relevant component before deciding the insertion point.

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests passing (same count as after Task 7)

- [ ] **Step 4: Visual verification**

Run: `npm run dev`
Open `http://localhost:3000` in browser. Create a recurring transaction with `nextDueDate` in the past via `/recurring`. Return to dashboard. Verify:
- Banner appears above dashboard widgets
- Shows correct item count, amounts, ×N multipliers
- "Generate All" button works → success card → toast → banner collapses
- "Dismiss" button hides banner for the session
- Refreshing page shows banner again (sessionStorage per-tab)

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate RecurringDueBanner into dashboard page"
```

---

## Parallel Execution Map

```
Parallel Group 1: Task 1 (schema + types)
                   ↓
         ┌─────────┴──────────┐
Parallel Group 2: Task 2        Task 3
         (tx repo)             (getDueItems)
         ↓                       ↓
         Task 4                  Task 5
         (generate idempotency)  (due API route)
         ↓                       │
         ├── Task 6 (update      │
         │   generate route)     │
         │                       │
         └── Task 7 ─────────────┘
             (cron + middleware)
                   ↓
                 Task 8
                 (vercel.json)
                   ↓
                 Task 9  (API client + i18n)
                   ↓
                 Task 10 (useDueRecurring hook)
                   ↓
                 Task 11 (RecurringDueBanner component)
                   ↓
                 Task 12 (dashboard integration)
```

**Parallelizable groups:**
- **Group 1:** Task 1 (standalone foundation)
- **Group 2:** Task 2 + Task 3 (both depend only on Task 1, independent of each other)
- **Group 3:** Task 4 + Task 5 (Task 4 depends on Task 2; Task 5 depends on Task 3)
- **Group 4:** Task 6 + Task 7 (both depend on Task 4, independent of each other)
- **Sequential tail:** Tasks 8 → 9 → 10 → 11 → 12 (each depends on the prior)
