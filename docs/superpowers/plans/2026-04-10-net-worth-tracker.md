# Net Worth Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/net-worth` page with liabilities CRUD, monthly snapshot tracking, 12-month trend chart, and a dashboard KPI widget — giving users a full picture of assets minus liabilities over time.

**Architecture:** Two new DB tables (`liabilities`, `net_worth_snapshots`) backed by repositories → services → API routes → typed API client → `useNetWorth` hook consumed by a pure-render page. Auto-snapshot fires on first monthly page visit; manual re-record button overwrites mid-month. Chart tooltips show per-category asset/liability breakdown via stored `snapshot_data` JSON.

**Tech Stack:** SQLite/Neon (existing client), Zod v4, Vitest, Recharts, Framer Motion, shadcn/ui Dialog, Sonner toasts, `nanoid` for IDs.

**Worktree:** `.worktrees/net-worth-tracker` on branch `feature/net-worth-tracker`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/types.ts` | Modify | Add `Liability`, `NetWorthCurrent`, `NetWorthSnapshot` |
| `src/server/db/client.ts` | Modify | Add DDL for `liabilities` + `net_worth_snapshots` |
| `src/lib/i18n.ts` | Modify | Add 21 new translation keys |
| `src/lib/api/validation.ts` | Modify | Add `createLiabilitySchema` + `updateLiabilitySchema` |
| `src/lib/api/contracts.ts` | Modify | Add request/response contract types |
| `src/lib/api/client.ts` | Modify | Add `api.liabilities.*` + `api.netWorth.*` |
| `src/server/repositories/liability.repository.ts` | Create | CRUD SQL for liabilities table |
| `src/server/repositories/net-worth.repository.ts` | Create | History query + upsert for snapshots |
| `src/server/services/liability.service.ts` | Create | Zod-validated CRUD, ServiceResult pattern |
| `src/server/services/net-worth.service.ts` | Create | getCurrentNetWorth, recordSnapshot, getNetWorthHistory |
| `src/app/api/liabilities/route.ts` | Create | GET + POST handlers |
| `src/app/api/liabilities/[id]/route.ts` | Create | PATCH + DELETE handlers |
| `src/app/api/net-worth/route.ts` | Create | GET handler |
| `src/app/api/net-worth/snapshot/route.ts` | Create | POST handler |
| `src/features/net-worth/useNetWorth.ts` | Create | Central hook — data, CRUD, snapshot, form, deleteConfirm |
| `src/features/net-worth/NetWorthSummaryCard.tsx` | Create | Gradient KPI card |
| `src/features/net-worth/MonthOverMonthCard.tsx` | Create | Delta vs prior snapshot |
| `src/features/net-worth/AssetsList.tsx` | Create | Read-only breakdown of payment methods + savings |
| `src/features/net-worth/LiabilitiesList.tsx` | Create | CRUD list with badges |
| `src/features/net-worth/LiabilityDialog.tsx` | Create | 3-field centered dialog |
| `src/features/net-worth/NetWorthTrendChart.tsx` | Create | Recharts AreaChart with custom tooltip |
| `src/features/net-worth/SnapshotButton.tsx` | Create | Re-record button + last-recorded timestamp |
| `src/features/net-worth/NetWorthDashboardWidget.tsx` | Create | Compact dashboard card |
| `src/app/net-worth/page.tsx` | Create | Pure render tree |
| `src/features/navigation/nav-config.ts` | Modify | Add `/net-worth` to Finance group |
| `src/features/dashboard/useDashboardData.ts` | Modify | Add net worth fetch |
| `src/__tests__/liability.service.test.ts` | Create | 9 tests for liability CRUD |
| `src/__tests__/net-worth.service.test.ts` | Create | 6 tests for net worth computation + snapshots |

---

### Task 1: Foundation — Types + DB DDL

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/server/db/client.ts`

> **Note:** Pure data definitions — no runtime test exists before service tests exercise them. Verification is TypeScript compilation.

- [ ] **Step 1: Add three types to `src/lib/types.ts`** (append after `SavingsGoal` interface)

```typescript
export interface Liability {
  id: string;
  name: string;
  amount: number;
  category: 'loan' | 'credit_card' | 'other';
  createdAt: string;
}

export interface NetWorthCurrent {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  breakdown: {
    paymentMethodBalances: number;
    savingsGoals: number;
  };
}

export interface NetWorthSnapshot {
  id: string;
  month: number;
  year: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  snapshotData: {
    paymentMethodBalances: number;
    savingsGoals: number;
    liabilities: number;
  } | null;
  createdAt: string;
}
```

- [ ] **Step 2: Add two DDL statements to `src/server/db/client.ts`**

Find the `tables` array (the one with `CREATE TABLE IF NOT EXISTS budget_templates`). Append these two entries before the closing `];`:

```typescript
    `CREATE TABLE IF NOT EXISTS liabilities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'other',
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
    `CREATE TABLE IF NOT EXISTS net_worth_snapshots (
      id TEXT PRIMARY KEY,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      total_assets DOUBLE PRECISION NOT NULL,
      total_liabilities DOUBLE PRECISION NOT NULL,
      net_worth DOUBLE PRECISION NOT NULL,
      snapshot_data TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(month, year)
    )`,
```

- [ ] **Step 3: Verify TypeScript compiles and existing tests still pass**

```bash
cd .worktrees/net-worth-tracker
npm run typecheck
npm run test
```

Expected: 0 type errors, 357 tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/server/db/client.ts
git commit -m "feat: add Liability and NetWorthSnapshot types + DB schema"
```

---

### Task 2: i18n Keys + Zod Validation Schemas

**Files:**
- Modify: `src/lib/i18n.ts`
- Modify: `src/lib/api/validation.ts`

- [ ] **Step 1: Add 21 keys to the `TranslationKeys` type in `src/lib/i18n.ts`**

In the `type TranslationKeys = { ... }` block, add these entries (e.g., after the `savingsPage` section):

```typescript
  // Net Worth
  netWorth: string;
  netWorthPage: string;
  assets: string;
  liabilities: string;
  totalAssets: string;
  totalLiabilities: string;
  noLiabilities: string;
  addLiability: string;
  editLiability: string;
  deleteLiability: string;
  liabilityName: string;
  liabilityCategory: string;
  loanType: string;
  creditCardType: string;
  otherType: string;
  recordSnapshot: string;
  netWorthHistory: string;
  noSnapshotsYet: string;
  liabilityDeleted: string;
  liabilitySaved: string;
  snapshotRecorded: string;
```

- [ ] **Step 2: Add translations to both locale objects in `src/lib/i18n.ts`**

In the `en` translations object, add:

```typescript
    netWorth: 'Net Worth',
    netWorthPage: 'Net Worth',
    assets: 'Assets',
    liabilities: 'Liabilities',
    totalAssets: 'Total Assets',
    totalLiabilities: 'Total Liabilities',
    noLiabilities: 'No liabilities added yet',
    addLiability: 'Add Liability',
    editLiability: 'Edit Liability',
    deleteLiability: 'Delete Liability',
    liabilityName: 'Liability Name',
    liabilityCategory: 'Category',
    loanType: 'Loan',
    creditCardType: 'Credit Card Debt',
    otherType: 'Other',
    recordSnapshot: 'Re-record snapshot',
    netWorthHistory: 'Net Worth History',
    noSnapshotsYet: 'Visit this page monthly to build your net worth history.',
    liabilityDeleted: 'Liability deleted',
    liabilitySaved: 'Liability saved',
    snapshotRecorded: 'Snapshot recorded',
```

In the `id` translations object, add:

```typescript
    netWorth: 'Kekayaan Bersih',
    netWorthPage: 'Kekayaan Bersih',
    assets: 'Aset',
    liabilities: 'Kewajiban',
    totalAssets: 'Total Aset',
    totalLiabilities: 'Total Kewajiban',
    noLiabilities: 'Belum ada kewajiban',
    addLiability: 'Tambah Kewajiban',
    editLiability: 'Edit Kewajiban',
    deleteLiability: 'Hapus Kewajiban',
    liabilityName: 'Nama Kewajiban',
    liabilityCategory: 'Kategori',
    loanType: 'Pinjaman',
    creditCardType: 'Hutang Kartu Kredit',
    otherType: 'Lainnya',
    recordSnapshot: 'Catat ulang snapshot',
    netWorthHistory: 'Riwayat Kekayaan Bersih',
    noSnapshotsYet: 'Kunjungi halaman ini setiap bulan untuk membangun riwayat kekayaan bersih Anda.',
    liabilityDeleted: 'Kewajiban dihapus',
    liabilitySaved: 'Kewajiban disimpan',
    snapshotRecorded: 'Snapshot dicatat',
```

- [ ] **Step 3: Add Zod schemas to `src/lib/api/validation.ts`**

Append before the `// === Inferred types ===` comment:

```typescript
// === Liability schemas ===

export const createLiabilitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z.number().nonnegative('Amount must be 0 or greater'),
  category: z.enum(['loan', 'credit_card', 'other']).default('other'),
});

export const updateLiabilitySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.number().nonnegative().optional(),
  category: z.enum(['loan', 'credit_card', 'other']).optional(),
});
```

Then append to the inferred types section:

```typescript
export type CreateLiabilityInput = z.infer<typeof createLiabilitySchema>;
export type UpdateLiabilityInput = z.infer<typeof updateLiabilitySchema>;
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 type errors, 357 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts src/lib/api/validation.ts
git commit -m "feat: add net worth i18n keys and liability Zod schemas"
```

---

### Task 3: Liability Repository + Service + Tests (TDD)

**Files:**
- Create: `src/server/repositories/liability.repository.ts`
- Create: `src/server/services/liability.service.ts`
- Create: `src/__tests__/liability.service.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/__tests__/liability.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  listLiabilities,
  createLiability,
  updateLiability,
  deleteLiability,
} from '@/server/services/liability.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('createLiability', () => {
  it('creates a liability with valid data', async () => {
    const result = await createLiability({ name: 'KPR BCA', amount: 450_000_000, category: 'loan' });
    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBeDefined();
    expect(result.data?.name).toBe('KPR BCA');
    expect(result.data?.amount).toBe(450_000_000);
    expect(result.data?.category).toBe('loan');
  });

  it('defaults category to "other" when omitted', async () => {
    const result = await createLiability({ name: 'Misc', amount: 500_000 });
    expect(result.data?.category).toBe('other');
  });

  it('returns VALIDATION_ERROR for empty name', async () => {
    const result = await createLiability({ name: '', amount: 100_000, category: 'other' });
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for negative amount', async () => {
    const result = await createLiability({ name: 'Bad', amount: -100, category: 'other' });
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });
});

describe('listLiabilities', () => {
  it('returns empty array when no liabilities exist', async () => {
    const result = await listLiabilities();
    expect(result.data).toEqual([]);
  });

  it('returns liabilities sorted by amount DESC', async () => {
    await createLiability({ name: 'Small', amount: 1_000, category: 'other' });
    await createLiability({ name: 'Large', amount: 5_000_000, category: 'loan' });
    await createLiability({ name: 'Medium', amount: 100_000, category: 'credit_card' });

    const result = await listLiabilities();
    expect(result.data).toHaveLength(3);
    expect(result.data![0].name).toBe('Large');
    expect(result.data![1].name).toBe('Medium');
    expect(result.data![2].name).toBe('Small');
  });
});

describe('updateLiability', () => {
  it('updates name and amount, leaves category unchanged', async () => {
    const created = await createLiability({ name: 'Old', amount: 100_000, category: 'other' });
    const result = await updateLiability(created.data!.id, { name: 'New', amount: 200_000 });
    expect(result.data?.name).toBe('New');
    expect(result.data?.amount).toBe(200_000);
    expect(result.data?.category).toBe('other');
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await updateLiability('nonexistent', { name: 'X' });
    expect(result.error?.code).toBe('NOT_FOUND');
  });
});

describe('deleteLiability', () => {
  it('deletes the liability and returns success', async () => {
    const created = await createLiability({ name: 'ToDelete', amount: 50_000, category: 'other' });
    const del = await deleteLiability(created.data!.id);
    expect(del.data?.success).toBe(true);
    const list = await listLiabilities();
    expect(list.data).toHaveLength(0);
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await deleteLiability('nonexistent');
    expect(result.error?.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run test — expect RED (module not found)**

```bash
npm run test -- src/__tests__/liability.service.test.ts
```

Expected: FAIL — `Cannot find module '@/server/services/liability.service'`

- [ ] **Step 3: Create `src/server/repositories/liability.repository.ts`**

```typescript
import type { Liability } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface LiabilityRow {
  id: string;
  name: string;
  amount: number;
  category: string;
  created_at: string;
  updated_at: string;
}

function rowToLiability(row: LiabilityRow): Liability {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    category: row.category as 'loan' | 'credit_card' | 'other',
    createdAt: row.created_at,
  };
}

export function createLiabilityRepository() {
  return {
    async findAll(): Promise<Liability[]> {
      const db = await getDb();
      const result = await db.query<LiabilityRow>(
        'SELECT * FROM liabilities ORDER BY amount DESC'
      );
      return result.rows.map(rowToLiability);
    },

    async findById(id: string): Promise<Liability | undefined> {
      const db = await getDb();
      const result = await db.query<LiabilityRow>(
        'SELECT * FROM liabilities WHERE id = ?',
        [id]
      );
      return result.rows[0] ? rowToLiability(result.rows[0]) : undefined;
    },

    async create(data: { name: string; amount: number; category: string }): Promise<Liability> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        'INSERT INTO liabilities (id, name, amount, category) VALUES (?, ?, ?, ?)',
        [id, data.name, data.amount, data.category]
      );
      const result = await db.query<LiabilityRow>(
        'SELECT * FROM liabilities WHERE id = ?',
        [id]
      );
      return rowToLiability(result.rows[0]);
    },

    async update(
      id: string,
      data: Partial<{ name: string; amount: number; category: string }>
    ): Promise<Liability | undefined> {
      const db = await getDb();
      const existing = await db.query<LiabilityRow>(
        'SELECT * FROM liabilities WHERE id = ?',
        [id]
      );
      if (!existing.rows[0]) return undefined;
      const current = rowToLiability(existing.rows[0]);
      const updated = {
        name: data.name ?? current.name,
        amount: data.amount ?? current.amount,
        category: data.category ?? current.category,
      };
      await db.query(
        'UPDATE liabilities SET name = ?, amount = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [updated.name, updated.amount, updated.category, id]
      );
      return { ...current, ...updated };
    },

    async delete(id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM liabilities WHERE id = ?', [id]);
      return result.rowCount > 0;
    },
  };
}
```

- [ ] **Step 4: Create `src/server/services/liability.service.ts`**

```typescript
import { ensureSeeded } from '@/server/db/seed';
import { createLiabilityRepository } from '@/server/repositories/liability.repository';
import { createLiabilitySchema, updateLiabilitySchema } from '@/lib/api/validation';
import type { Liability } from '@/lib/types';

const repo = createLiabilityRepository();

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string; details?: Record<string, string[]> };
}

function formatZodError(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string[]> {
  const f: Record<string, string[]> = {};
  for (const i of error.issues) {
    const p = String(i.path.join('.') || '_root');
    if (!f[p]) f[p] = [];
    f[p].push(i.message);
  }
  return f;
}

export async function listLiabilities(): Promise<ServiceResult<Liability[]>> {
  await ensureSeeded();
  return { data: await repo.findAll() };
}

export async function createLiability(body: unknown): Promise<ServiceResult<Liability>> {
  await ensureSeeded();
  const parsed = createLiabilitySchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }
  return { data: await repo.create(parsed.data) };
}

export async function updateLiability(
  id: string,
  body: unknown
): Promise<ServiceResult<Liability>> {
  await ensureSeeded();
  const parsed = updateLiabilitySchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }
  const updated = await repo.update(id, parsed.data);
  if (!updated) {
    return { error: { message: 'Liability not found', code: 'NOT_FOUND' } };
  }
  return { data: updated };
}

export async function deleteLiability(
  id: string
): Promise<ServiceResult<{ success: true }>> {
  await ensureSeeded();
  const deleted = await repo.delete(id);
  if (!deleted) {
    return { error: { message: 'Liability not found', code: 'NOT_FOUND' } };
  }
  return { data: { success: true } };
}
```

- [ ] **Step 5: Run test — expect GREEN**

```bash
npm run test -- src/__tests__/liability.service.test.ts
```

Expected: 9 tests passing.

- [ ] **Step 6: Run full suite to confirm no regressions**

```bash
npm run test
```

Expected: 366 tests passing (357 + 9 new).

- [ ] **Step 7: Commit**

```bash
git add src/server/repositories/liability.repository.ts \
        src/server/services/liability.service.ts \
        src/__tests__/liability.service.test.ts
git commit -m "feat: add liability repository, service, and tests (TDD)"
```

---

### Task 4: Net-Worth Repository

**Files:**
- Create: `src/server/repositories/net-worth.repository.ts`

> **Note:** This repository is exercised by net-worth service tests in Task 5. No separate test file needed.

- [ ] **Step 1: Create `src/server/repositories/net-worth.repository.ts`**

```typescript
import type { NetWorthSnapshot } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface NetWorthSnapshotRow {
  id: string;
  month: number;
  year: number;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  snapshot_data: string | null;
  created_at: string;
}

function rowToSnapshot(row: NetWorthSnapshotRow): NetWorthSnapshot {
  return {
    id: row.id,
    month: Number(row.month),
    year: Number(row.year),
    totalAssets: Number(row.total_assets),
    totalLiabilities: Number(row.total_liabilities),
    netWorth: Number(row.net_worth),
    snapshotData: row.snapshot_data ? JSON.parse(row.snapshot_data) : null,
    createdAt: row.created_at,
  };
}

export function createNetWorthRepository() {
  return {
    async getHistory(limit = 12): Promise<NetWorthSnapshot[]> {
      const db = await getDb();
      const result = await db.query<NetWorthSnapshotRow>(
        'SELECT * FROM net_worth_snapshots ORDER BY year ASC, month ASC LIMIT ?',
        [limit]
      );
      return result.rows.map(rowToSnapshot);
    },

    async findByMonth(month: number, year: number): Promise<NetWorthSnapshot | undefined> {
      const db = await getDb();
      const result = await db.query<NetWorthSnapshotRow>(
        'SELECT * FROM net_worth_snapshots WHERE month = ? AND year = ?',
        [month, year]
      );
      return result.rows[0] ? rowToSnapshot(result.rows[0]) : undefined;
    },

    async upsert(data: {
      month: number;
      year: number;
      totalAssets: number;
      totalLiabilities: number;
      netWorth: number;
      snapshotData: string;
    }): Promise<NetWorthSnapshot> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        `INSERT INTO net_worth_snapshots
           (id, month, year, total_assets, total_liabilities, net_worth, snapshot_data)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(month, year) DO UPDATE SET
           total_assets    = excluded.total_assets,
           total_liabilities = excluded.total_liabilities,
           net_worth       = excluded.net_worth,
           snapshot_data   = excluded.snapshot_data`,
        [
          id,
          data.month,
          data.year,
          data.totalAssets,
          data.totalLiabilities,
          data.netWorth,
          data.snapshotData,
        ]
      );
      const result = await db.query<NetWorthSnapshotRow>(
        'SELECT * FROM net_worth_snapshots WHERE month = ? AND year = ?',
        [data.month, data.year]
      );
      return rowToSnapshot(result.rows[0]);
    },
  };
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/repositories/net-worth.repository.ts
git commit -m "feat: add net-worth repository with upsert and history query"
```

---

### Task 5: Net-Worth Service — getCurrentNetWorth (TDD)

**Files:**
- Create: `src/server/services/net-worth.service.ts`
- Create: `src/__tests__/net-worth.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/net-worth.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { nanoid } from 'nanoid';
import { resetDb, getDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { getCurrentNetWorth } from '@/server/services/net-worth.service';
import { createLiability } from '@/server/services/liability.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('getCurrentNetWorth', () => {
  it('returns zeros when no data exists', async () => {
    const result = await getCurrentNetWorth();
    expect(result.error).toBeUndefined();
    expect(result.data?.totalAssets).toBe(0);
    expect(result.data?.totalLiabilities).toBe(0);
    expect(result.data?.netWorth).toBe(0);
    expect(result.data?.breakdown.paymentMethodBalances).toBe(0);
    expect(result.data?.breakdown.savingsGoals).toBe(0);
  });

  it('includes savings goals in totalAssets', async () => {
    const db = await getDb();
    const id = nanoid();
    await db.query(
      'INSERT INTO savings_goals (id, name, target_amount, saved_amount, color) VALUES (?, ?, ?, ?, ?)',
      [id, 'Test', 1_000_000, 600_000, '#2563EB']
    );
    const result = await getCurrentNetWorth();
    expect(result.data?.breakdown.savingsGoals).toBe(600_000);
    expect(result.data?.totalAssets).toBe(600_000);
  });

  it('subtracts liabilities from assets for net worth', async () => {
    const db = await getDb();
    const id = nanoid();
    await db.query(
      'INSERT INTO savings_goals (id, name, target_amount, saved_amount, color) VALUES (?, ?, ?, ?, ?)',
      [id, 'Fund', 5_000_000, 1_000_000, '#10B981']
    );
    await createLiability({ name: 'Loan', amount: 300_000, category: 'loan' });

    const result = await getCurrentNetWorth();
    expect(result.data?.breakdown.savingsGoals).toBe(1_000_000);
    expect(result.data?.totalLiabilities).toBe(300_000);
    expect(result.data?.netWorth).toBe(700_000);
  });
});
```

- [ ] **Step 2: Run — expect RED**

```bash
npm run test -- src/__tests__/net-worth.service.test.ts
```

Expected: FAIL — `Cannot find module '@/server/services/net-worth.service'`

- [ ] **Step 3: Create `src/server/services/net-worth.service.ts`** with `getCurrentNetWorth`

```typescript
import { ensureSeeded } from '@/server/db/seed';
import { getDb } from '@/server/db/client';
import { listPaymentMethodBalances } from '@/server/services/balance.service';
import { createNetWorthRepository } from '@/server/repositories/net-worth.repository';
import type { NetWorthCurrent, NetWorthSnapshot } from '@/lib/types';

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string };
}

export async function getCurrentNetWorth(): Promise<ServiceResult<NetWorthCurrent>> {
  await ensureSeeded();

  const balancesResult = await listPaymentMethodBalances();
  if (balancesResult.error) return { error: balancesResult.error };
  const paymentMethodTotal = (balancesResult.data ?? []).reduce(
    (sum, b) => sum + b.balance,
    0
  );

  const db = await getDb();

  const savingsRow = await db.query<{ total: number }>(
    'SELECT COALESCE(SUM(saved_amount), 0) AS total FROM savings_goals'
  );
  const savingsTotal = Number(savingsRow.rows[0]?.total ?? 0);

  const liabRow = await db.query<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM liabilities'
  );
  const liabTotal = Number(liabRow.rows[0]?.total ?? 0);

  const totalAssets = paymentMethodTotal + savingsTotal;

  return {
    data: {
      totalAssets,
      totalLiabilities: liabTotal,
      netWorth: totalAssets - liabTotal,
      breakdown: {
        paymentMethodBalances: paymentMethodTotal,
        savingsGoals: savingsTotal,
      },
    },
  };
}

export async function recordSnapshot(): Promise<ServiceResult<NetWorthSnapshot>> {
  // Implemented in Task 6
  throw new Error('Not implemented yet');
}

export async function getNetWorthHistory(): Promise<ServiceResult<NetWorthSnapshot[]>> {
  // Implemented in Task 6
  throw new Error('Not implemented yet');
}
```

- [ ] **Step 4: Run — expect GREEN (3 tests)**

```bash
npm run test -- src/__tests__/net-worth.service.test.ts
```

Expected: 3 tests passing (only `getCurrentNetWorth` tests run; the others are added in Task 6).

- [ ] **Step 5: Commit**

```bash
git add src/server/services/net-worth.service.ts \
        src/__tests__/net-worth.service.test.ts
git commit -m "feat: implement getCurrentNetWorth with TDD"
```

---

### Task 6: Net-Worth Service — recordSnapshot + getNetWorthHistory (TDD)

**Files:**
- Modify: `src/server/services/net-worth.service.ts`
- Modify: `src/__tests__/net-worth.service.test.ts`

- [ ] **Step 1: Add failing tests to `src/__tests__/net-worth.service.test.ts`**

Add this import at the top (next to the existing import):

```typescript
import { recordSnapshot, getNetWorthHistory } from '@/server/services/net-worth.service';
```

Append these describe blocks at the end of the file:

```typescript
describe('recordSnapshot', () => {
  it('creates a snapshot for the current month with snapshotData', async () => {
    const now = new Date();
    const result = await recordSnapshot();
    expect(result.error).toBeUndefined();
    expect(result.data?.month).toBe(now.getMonth());
    expect(result.data?.year).toBe(now.getFullYear());
    expect(result.data?.netWorth).toBe(0);
    expect(result.data?.snapshotData).toMatchObject({
      paymentMethodBalances: 0,
      savingsGoals: 0,
      liabilities: 0,
    });
  });

  it('upserts: second call same month keeps only one row and reflects latest data', async () => {
    await recordSnapshot();
    await createLiability({ name: 'New Debt', amount: 100_000, category: 'other' });
    await recordSnapshot();

    const history = await getNetWorthHistory();
    expect(history.data).toHaveLength(1);
    expect(history.data![0].totalLiabilities).toBe(100_000);
    expect(history.data![0].netWorth).toBe(-100_000);
  });
});

describe('getNetWorthHistory', () => {
  it('returns empty array when no snapshots exist', async () => {
    const result = await getNetWorthHistory();
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([]);
  });

  it('returns snapshots sorted ASC by year then month', async () => {
    const db = await getDb();
    await db.query(
      'INSERT INTO net_worth_snapshots (id, month, year, total_assets, total_liabilities, net_worth) VALUES (?, ?, ?, ?, ?, ?)',
      [nanoid(), 11, 2025, 100, 50, 50]
    );
    await db.query(
      'INSERT INTO net_worth_snapshots (id, month, year, total_assets, total_liabilities, net_worth) VALUES (?, ?, ?, ?, ?, ?)',
      [nanoid(), 0, 2026, 200, 100, 100]
    );
    await db.query(
      'INSERT INTO net_worth_snapshots (id, month, year, total_assets, total_liabilities, net_worth) VALUES (?, ?, ?, ?, ?, ?)',
      [nanoid(), 5, 2025, 50, 10, 40]
    );

    const result = await getNetWorthHistory();
    expect(result.data).toHaveLength(3);
    expect(result.data![0]).toMatchObject({ month: 5, year: 2025 });
    expect(result.data![1]).toMatchObject({ month: 11, year: 2025 });
    expect(result.data![2]).toMatchObject({ month: 0, year: 2026 });
  });
});
```

- [ ] **Step 2: Run — expect RED (throw 'Not implemented yet')**

```bash
npm run test -- src/__tests__/net-worth.service.test.ts
```

Expected: 3 passing, 4 failing (the new tests hit the `throw new Error` stubs).

- [ ] **Step 3: Replace stubs in `src/server/services/net-worth.service.ts`**

Replace the two stub exports with real implementations:

```typescript
export async function recordSnapshot(): Promise<ServiceResult<NetWorthSnapshot>> {
  await ensureSeeded();
  const currentResult = await getCurrentNetWorth();
  if (currentResult.error) return { error: currentResult.error };
  const current = currentResult.data!;

  const now = new Date();
  const repo = createNetWorthRepository();

  const snapshot = await repo.upsert({
    month: now.getMonth(),
    year: now.getFullYear(),
    totalAssets: current.totalAssets,
    totalLiabilities: current.totalLiabilities,
    netWorth: current.netWorth,
    snapshotData: JSON.stringify({
      paymentMethodBalances: current.breakdown.paymentMethodBalances,
      savingsGoals: current.breakdown.savingsGoals,
      liabilities: current.totalLiabilities,
    }),
  });

  return { data: snapshot };
}

export async function getNetWorthHistory(): Promise<ServiceResult<NetWorthSnapshot[]>> {
  await ensureSeeded();
  const repo = createNetWorthRepository();
  return { data: await repo.getHistory(12) };
}
```

- [ ] **Step 4: Run — expect GREEN (all 7)**

```bash
npm run test -- src/__tests__/net-worth.service.test.ts
```

Expected: 7 tests passing.

- [ ] **Step 5: Run full suite**

```bash
npm run test
```

Expected: 373 tests passing (357 + 9 + 7).

- [ ] **Step 6: Commit**

```bash
git add src/server/services/net-worth.service.ts \
        src/__tests__/net-worth.service.test.ts
git commit -m "feat: implement recordSnapshot and getNetWorthHistory with TDD"
```

---

### Task 7: API Routes — /api/liabilities (GET + POST)

**Files:**
- Create: `src/app/api/liabilities/route.ts`

> **Note:** This project has no API route tests. TypeScript strict mode is the gate. Verification is typecheck + full test suite unchanged.

- [ ] **Step 1: Create `src/app/api/liabilities/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { listLiabilities, createLiability } from '@/server/services/liability.service';

export async function GET() {
  const result = await listLiabilities();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: { liabilities: result.data } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await createLiability(body);
  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/liabilities/route.ts
git commit -m "feat: add GET and POST handlers for /api/liabilities"
```

---

### Task 8: API Routes — /api/liabilities/[id] (PATCH + DELETE)

**Files:**
- Create: `src/app/api/liabilities/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/liabilities/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { updateLiability, deleteLiability } from '@/server/services/liability.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = await updateLiability(id, body);
  if (result.error) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await deleteLiability(id);
  if (result.error) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data });
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/liabilities/[id]/route.ts"
git commit -m "feat: add PATCH and DELETE handlers for /api/liabilities/[id]"
```

---

### Task 9: API Routes — /api/net-worth (GET)

**Files:**
- Create: `src/app/api/net-worth/route.ts`

- [ ] **Step 1: Create `src/app/api/net-worth/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getCurrentNetWorth, getNetWorthHistory } from '@/server/services/net-worth.service';

export async function GET() {
  const [currentResult, historyResult] = await Promise.all([
    getCurrentNetWorth(),
    getNetWorthHistory(),
  ]);

  if (currentResult.error) {
    return NextResponse.json({ error: currentResult.error }, { status: 500 });
  }
  if (historyResult.error) {
    return NextResponse.json({ error: historyResult.error }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      current: currentResult.data,
      history: historyResult.data,
    },
  });
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/net-worth/route.ts
git commit -m "feat: add GET handler for /api/net-worth"
```

---

### Task 10: API Routes — /api/net-worth/snapshot (POST)

**Files:**
- Create: `src/app/api/net-worth/snapshot/route.ts`

- [ ] **Step 1: Create `src/app/api/net-worth/snapshot/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { recordSnapshot } from '@/server/services/net-worth.service';

export async function POST() {
  const result = await recordSnapshot();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/net-worth/snapshot/route.ts
git commit -m "feat: add POST handler for /api/net-worth/snapshot"
```

---

### Task 11: API Contracts + Client

**Files:**
- Modify: `src/lib/api/contracts.ts`
- Modify: `src/lib/api/client.ts`

- [ ] **Step 1: Add contract types to `src/lib/api/contracts.ts`**

Add after the savings goal contracts section:

```typescript
// === Liability contracts ===

export interface LiabilityListResponse {
  liabilities: import('@/lib/types').Liability[];
}

export interface CreateLiabilityRequest {
  name: string;
  amount: number;
  category?: 'loan' | 'credit_card' | 'other';
}

export interface UpdateLiabilityRequest {
  name?: string;
  amount?: number;
  category?: 'loan' | 'credit_card' | 'other';
}

// === Net Worth contracts ===

export interface NetWorthDataResponse {
  current: import('@/lib/types').NetWorthCurrent;
  history: import('@/lib/types').NetWorthSnapshot[];
}
```

- [ ] **Step 2: Add imports to `src/lib/api/client.ts`**

At the top of `client.ts`, add to the existing import from `'./contracts'`:

```typescript
import type {
  // ... existing imports ...
  LiabilityListResponse,
  CreateLiabilityRequest,
  UpdateLiabilityRequest,
  NetWorthDataResponse,
} from './contracts';
```

Also add `Liability` and `NetWorthSnapshot` to the import from `'@/lib/types'`:

```typescript
import type { Transaction, Category, PaymentMethod, RecurringTransaction, Liability, NetWorthSnapshot } from '@/lib/types';
```

- [ ] **Step 3: Add two namespace objects to the `api` export in `src/lib/api/client.ts`**

Append after `budgetTemplates: { ... },`:

```typescript
  liabilities: {
    list() {
      return fetchApi<LiabilityListResponse>('/liabilities');
    },
    create(data: CreateLiabilityRequest) {
      return fetchApi<Liability>('/liabilities', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update(id: string, data: UpdateLiabilityRequest) {
      return fetchApi<Liability>(`/liabilities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete(id: string) {
      return fetchApi<{ success: boolean }>(`/liabilities/${id}`, {
        method: 'DELETE',
      });
    },
  },

  netWorth: {
    get() {
      return fetchApi<NetWorthDataResponse>('/net-worth');
    },
    recordSnapshot() {
      return fetchApi<NetWorthSnapshot>('/net-worth/snapshot', { method: 'POST' });
    },
  },
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/contracts.ts src/lib/api/client.ts
git commit -m "feat: add liability and net-worth API client methods"
```

---

### Task 12: useNetWorth Hook

**Files:**
- Create: `src/features/net-worth/useNetWorth.ts`

- [ ] **Step 1: Create `src/features/net-worth/useNetWorth.ts`**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { useStore } from '@/store';
import { useLocale, t } from '@/lib/i18n';
import type { Liability, NetWorthCurrent, NetWorthSnapshot } from '@/lib/types';

export function useNetWorth() {
  const locale = useLocale();
  const initialized = useStore((s) => s.initialized);

  // Data state
  const [current, setCurrent] = useState<NetWorthCurrent | null>(null);
  const [history, setHistory] = useState<NetWorthSnapshot[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [fetchKey, setFetchKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isLoading = loadedKey !== String(fetchKey);

  // Snapshot state
  const [isRecording, setIsRecording] = useState(false);

  // Form state (add/edit liability dialog)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<'loan' | 'credit_card' | 'other'>('other');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reload = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    Promise.all([api.netWorth.get(), api.liabilities.list()]).then(
      ([nwResult, liabResult]) => {
        if (cancelled) return;

        if (nwResult.data) {
          setCurrent(nwResult.data.current);
          setHistory(nwResult.data.history);
          setError(null);

          // Auto-snapshot: if no entry for current month, record one silently
          const now = new Date();
          const hasCurrentMonth = nwResult.data.history.some(
            (s) => s.month === now.getMonth() && s.year === now.getFullYear()
          );
          if (!hasCurrentMonth) {
            api.netWorth.recordSnapshot().then((snapResult) => {
              if (!cancelled && snapResult.data) {
                setHistory((prev) => {
                  const without = prev.filter(
                    (s) =>
                      !(
                        s.month === snapResult.data!.month &&
                        s.year === snapResult.data!.year
                      )
                  );
                  return [...without, snapResult.data!].sort((a, b) =>
                    a.year !== b.year ? a.year - b.year : a.month - b.month
                  );
                });
              }
            });
          }
        } else if (nwResult.error) {
          setError(nwResult.error.message);
        }

        if (liabResult.data) setLiabilities(liabResult.data.liabilities);
        setLoadedKey(String(fetchKey));
      }
    );

    return () => {
      cancelled = true;
    };
  }, [initialized, fetchKey]);

  // --- Snapshot ---

  const recordSnapshot = useCallback(async () => {
    setIsRecording(true);
    const result = await api.netWorth.recordSnapshot();
    setIsRecording(false);
    if (result.data) {
      setHistory((prev) => {
        const without = prev.filter(
          (s) => !(s.month === result.data!.month && s.year === result.data!.year)
        );
        return [...without, result.data!].sort((a, b) =>
          a.year !== b.year ? a.year - b.year : a.month - b.month
        );
      });
      // Also refresh current net worth after snapshot
      api.netWorth.get().then((r) => {
        if (r.data) setCurrent(r.data.current);
      });
      toast.success(t(locale, 'snapshotRecorded'));
    }
  }, [locale]);

  // --- Form helpers ---

  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormCategory('other');
    setFormErrors({});
    setEditingLiability(null);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (liability: Liability) => {
    setEditingLiability(liability);
    setFormName(liability.name);
    setFormAmount(String(liability.amount));
    setFormCategory(liability.category);
    setFormErrors({});
    setDialogOpen(true);
  };

  const closeForm = () => {
    setDialogOpen(false);
    resetForm();
  };

  const submitForm = async () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = t(locale, 'required');
    const amount = Number(formAmount);
    if (!formAmount || isNaN(amount) || amount < 0) errors.amount = t(locale, 'invalidAmount');
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = { name: formName.trim(), amount, category: formCategory };
    const result = editingLiability
      ? await api.liabilities.update(editingLiability.id, payload)
      : await api.liabilities.create(payload);

    if (result.data) {
      toast.success(t(locale, 'liabilitySaved'));
      reload();
      closeForm();
    } else {
      toast.error(t(locale, 'failedSave'));
    }
  };

  // --- Delete ---

  const confirmDelete = async () => {
    if (!deleteId) return;
    const deletedLiability = liabilities.find((l) => l.id === deleteId);
    const result = await api.liabilities.delete(deleteId);
    if (result.data) {
      setLiabilities((prev) => prev.filter((l) => l.id !== deleteId));
      toast.success(t(locale, 'liabilityDeleted'), {
        action: deletedLiability
          ? {
              label: t(locale, 'undo'),
              onClick: async () => {
                await api.liabilities.create({
                  name: deletedLiability.name,
                  amount: deletedLiability.amount,
                  category: deletedLiability.category,
                });
                reload();
                toast.success(t(locale, 'itemRestored'));
              },
            }
          : undefined,
      });
    }
    setDeleteId(null);
  };

  return {
    current,
    history,
    liabilities,
    isLoading,
    error,
    reload,

    recordSnapshot,
    isRecording,

    form: {
      open: dialogOpen,
      editingLiability,
      name: formName,
      setName: setFormName,
      amount: formAmount,
      setAmount: setFormAmount,
      category: formCategory,
      setCategory: setFormCategory,
      errors: formErrors,
      openAdd,
      openEdit,
      close: closeForm,
      submit: submitForm,
    },

    deleteConfirm: {
      id: deleteId,
      setId: setDeleteId,
      confirm: confirmDelete,
    },
  };
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/features/net-worth/useNetWorth.ts
git commit -m "feat: implement useNetWorth hook with data fetching, CRUD, and snapshot"
```

---

### Task 13: NetWorthSummaryCard + MonthOverMonthCard

**Files:**
- Create: `src/features/net-worth/NetWorthSummaryCard.tsx`
- Create: `src/features/net-worth/MonthOverMonthCard.tsx`

- [ ] **Step 1: Create `src/features/net-worth/NetWorthSummaryCard.tsx`**

```typescript
'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/motion';
import type { NetWorthCurrent } from '@/lib/types';

interface NetWorthSummaryCardProps {
  current: NetWorthCurrent | null;
  isLoading: boolean;
}

export function NetWorthSummaryCard({ current, isLoading }: NetWorthSummaryCardProps) {
  const locale = useLocale();

  if (isLoading) {
    return <div className="h-36 animate-pulse rounded-2xl bg-gradient-to-br from-blue-900 to-blue-600" />;
  }

  return (
    <motion.div
      {...fadeInUp}
      className="rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] p-6 text-white"
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
        {t(locale, 'netWorth')}
      </p>
      <p className="font-mono text-3xl font-extrabold">
        {formatCurrency(current?.netWorth ?? 0)}
      </p>
      <div className="mt-4 flex gap-6 border-t border-white/20 pt-4 text-xs">
        <div>
          <p className="opacity-60">{t(locale, 'totalAssets')}</p>
          <p className="font-mono font-semibold">{formatCurrency(current?.totalAssets ?? 0)}</p>
        </div>
        <div>
          <p className="opacity-60">{t(locale, 'totalLiabilities')}</p>
          <p className="font-mono font-semibold">{formatCurrency(current?.totalLiabilities ?? 0)}</p>
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create `src/features/net-worth/MonthOverMonthCard.tsx`**

```typescript
'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { NetWorthSnapshot } from '@/lib/types';

interface MonthOverMonthCardProps {
  history: NetWorthSnapshot[];
  isLoading: boolean;
}

export function MonthOverMonthCard({ history, isLoading }: MonthOverMonthCardProps) {
  const locale = useLocale();

  if (isLoading) {
    return <div className="border-border bg-card h-36 animate-pulse rounded-2xl border" />;
  }

  const lastTwo = history.slice(-2);
  const prev = lastTwo.length === 2 ? lastTwo[0] : null;
  const latest = lastTwo.length >= 1 ? lastTwo[lastTwo.length - 1] : null;
  const delta = prev && latest ? latest.netWorth - prev.netWorth : null;
  const pct =
    delta !== null && prev && prev.netWorth !== 0
      ? ((delta / Math.abs(prev.netWorth)) * 100).toFixed(1)
      : null;

  const positive = delta !== null && delta >= 0;

  return (
    <motion.div
      {...fadeInUp}
      className="border-border bg-card rounded-2xl border p-6"
    >
      <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
        {locale === 'id' ? 'vs Bulan Lalu' : 'vs Last Month'}
      </p>
      {delta === null ? (
        <p className="text-muted-foreground text-2xl font-bold">—</p>
      ) : (
        <>
          <p
            className={cn(
              'font-mono text-2xl font-extrabold',
              positive ? 'text-emerald-500' : 'text-destructive'
            )}
          >
            {positive ? '▲' : '▼'} {formatCurrency(Math.abs(delta))}
          </p>
          {pct && (
            <p className="text-muted-foreground mt-1 text-xs">
              {positive ? '+' : ''}{pct}% {locale === 'id' ? 'dari' : 'from'}{' '}
              {formatCurrency(prev!.netWorth)}
            </p>
          )}
        </>
      )}
      {latest && (
        <p className="text-muted-foreground mt-4 border-t pt-3 text-xs">
          {locale === 'id' ? 'Snapshot terakhir' : 'Last snapshot'}:{' '}
          {new Date(latest.year, latest.month).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US', {
            month: 'short',
            year: 'numeric',
          })}
        </p>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/features/net-worth/NetWorthSummaryCard.tsx \
        src/features/net-worth/MonthOverMonthCard.tsx
git commit -m "feat: add NetWorthSummaryCard and MonthOverMonthCard components"
```

---

### Task 14: AssetsList

**Files:**
- Create: `src/features/net-worth/AssetsList.tsx`

- [ ] **Step 1: Create `src/features/net-worth/AssetsList.tsx`**

```typescript
'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import type { NetWorthCurrent } from '@/lib/types';

interface AssetsListProps {
  current: NetWorthCurrent | null;
}

export function AssetsList({ current }: AssetsListProps) {
  const locale = useLocale();

  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <p className="text-muted-foreground mb-4 text-xs font-bold uppercase tracking-wide">
        {t(locale, 'assets')}
      </p>

      <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase">
        {t(locale, 'paymentMethods')}
      </p>
      <div className="mb-3 flex justify-between text-sm">
        <span className="text-muted-foreground">{locale === 'id' ? 'Semua rekening' : 'All accounts'}</span>
        <span className="font-mono">{formatCurrency(current?.breakdown.paymentMethodBalances ?? 0)}</span>
      </div>

      <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase">
        {t(locale, 'savingsGoals')}
      </p>
      <div className="mb-3 flex justify-between text-sm">
        <span className="text-muted-foreground">{locale === 'id' ? 'Total tabungan' : 'Total saved'}</span>
        <span className="font-mono">{formatCurrency(current?.breakdown.savingsGoals ?? 0)}</span>
      </div>

      <div className="border-border flex justify-between border-t pt-3 text-sm font-bold">
        <span>{t(locale, 'totalAssets')}</span>
        <span className="font-mono text-emerald-500">{formatCurrency(current?.totalAssets ?? 0)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/features/net-worth/AssetsList.tsx
git commit -m "feat: add AssetsList component"
```

---

### Task 15: LiabilitiesList + LiabilityDialog

**Files:**
- Create: `src/features/net-worth/LiabilitiesList.tsx`
- Create: `src/features/net-worth/LiabilityDialog.tsx`

- [ ] **Step 1: Create `src/features/net-worth/LiabilityDialog.tsx`**

```typescript
'use client';

import { t, useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Liability } from '@/lib/types';

interface LiabilityDialogProps {
  open: boolean;
  editingLiability: Liability | null;
  name: string;
  setName: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  category: 'loan' | 'credit_card' | 'other';
  setCategory: (v: 'loan' | 'credit_card' | 'other') => void;
  errors: Record<string, string>;
  close: () => void;
  submit: () => Promise<void>;
}

export function LiabilityDialog({
  open,
  editingLiability,
  name,
  setName,
  amount,
  setAmount,
  category,
  setCategory,
  errors,
  close,
  submit,
}: LiabilityDialogProps) {
  const locale = useLocale();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {editingLiability ? t(locale, 'editLiability') : t(locale, 'addLiability')}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="liab-name">{t(locale, 'liabilityName')}</Label>
            <Input
              id="liab-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={locale === 'id' ? 'cth. KPR BCA' : 'e.g. Mortgage BCA'}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="liab-amount">{locale === 'id' ? 'Jumlah (IDR)' : 'Amount (IDR)'}</Label>
            <Input
              id="liab-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="450000000"
            />
            {errors.amount && <p className="text-destructive text-xs">{errors.amount}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="liab-category">{t(locale, 'liabilityCategory')}</Label>
            <select
              id="liab-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as 'loan' | 'credit_card' | 'other')}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            >
              <option value="loan">{t(locale, 'loanType')}</option>
              <option value="credit_card">{t(locale, 'creditCardType')}</option>
              <option value="other">{t(locale, 'otherType')}</option>
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={submit} className="flex-1">
              {t(locale, 'save')}
            </Button>
            <Button variant="outline" onClick={close}>
              {t(locale, 'cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `src/features/net-worth/LiabilitiesList.tsx`**

```typescript
'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Liability } from '@/lib/types';

const CATEGORY_STYLES: Record<string, string> = {
  loan: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  credit_card: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  other: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

interface LiabilitiesListProps {
  liabilities: Liability[];
  onAdd: () => void;
  onEdit: (liability: Liability) => void;
  onDelete: (id: string) => void;
}

export function LiabilitiesList({
  liabilities,
  onAdd,
  onEdit,
  onDelete,
}: LiabilitiesListProps) {
  const locale = useLocale();

  const total = liabilities.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wide">
          {t(locale, 'liabilities')}
        </p>
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={onAdd}>
          <Plus className="h-3 w-3" />
          {t(locale, 'add')}
        </Button>
      </div>

      {liabilities.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">
          {t(locale, 'noLiabilities')}
        </p>
      ) : (
        <div className="space-y-2">
          {liabilities.map((liability) => (
            <div
              key={liability.id}
              className="group flex items-center justify-between rounded-xl bg-red-50 px-3 py-2.5 dark:bg-red-950/20"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{liability.name}</p>
                <span
                  className={cn(
                    'mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold',
                    CATEGORY_STYLES[liability.category]
                  )}
                >
                  {t(locale, liability.category === 'loan'
                    ? 'loanType'
                    : liability.category === 'credit_card'
                    ? 'creditCardType'
                    : 'otherType'
                  )}
                </span>
              </div>
              <div className="ml-3 flex items-center gap-1.5">
                <span className="font-mono text-xs text-red-600 dark:text-red-400">
                  {formatCurrency(liability.amount)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => onEdit(liability)}
                  aria-label={t(locale, 'edit')}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => onDelete(liability.id)}
                  aria-label={t(locale, 'delete')}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-border mt-3 flex justify-between border-t pt-3 text-sm font-bold">
        <span>{t(locale, 'totalLiabilities')}</span>
        <span className="font-mono text-red-600 dark:text-red-400">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/features/net-worth/LiabilitiesList.tsx \
        src/features/net-worth/LiabilityDialog.tsx
git commit -m "feat: add LiabilitiesList and LiabilityDialog components"
```

---

### Task 16: NetWorthTrendChart

**Files:**
- Create: `src/features/net-worth/NetWorthTrendChart.tsx`

- [ ] **Step 1: Create `src/features/net-worth/NetWorthTrendChart.tsx`**

```typescript
'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { NetWorthSnapshot } from '@/lib/types';

interface NetWorthTrendChartProps {
  history: NetWorthSnapshot[];
}

const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function CustomTooltip({
  active,
  payload,
  locale,
}: {
  active?: boolean;
  payload?: { payload: NetWorthSnapshot & { label: string } }[];
  locale: string;
}) {
  if (!active || !payload?.length) return null;
  const snap = payload[0].payload;

  return (
    <div className="bg-popover border-border rounded-xl border p-3 text-xs shadow-lg">
      <p className="mb-2 font-semibold">{snap.label} · {formatCurrency(snap.netWorth)}</p>
      {snap.snapshotData && (
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">{locale === 'id' ? 'Rekening' : 'Accounts'}</span>
            <span className="font-mono">{formatCurrency(snap.snapshotData.paymentMethodBalances)}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">{locale === 'id' ? 'Tabungan' : 'Savings'}</span>
            <span className="font-mono">{formatCurrency(snap.snapshotData.savingsGoals)}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">{locale === 'id' ? 'Kewajiban' : 'Liabilities'}</span>
            <span className="font-mono text-red-500">−{formatCurrency(snap.snapshotData.liabilities)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function NetWorthTrendChart({ history }: NetWorthTrendChartProps) {
  const locale = useLocale();
  const months = locale === 'id' ? MONTH_NAMES_ID : MONTH_NAMES_EN;

  const data = history.map((snap) => ({
    ...snap,
    label: `${months[snap.month]} ${snap.year}`,
  }));

  if (data.length === 0) {
    return (
      <div className="border-border bg-card rounded-2xl border p-6">
        <p className="mb-4 text-sm font-semibold">{t(locale, 'netWorthHistory')}</p>
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t(locale, 'noSnapshotsYet')}
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card rounded-2xl border p-6">
      <p className="mb-4 text-sm font-semibold">{t(locale, 'netWorthHistory')}</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => {
              if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
              if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
              return String(v);
            }}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip locale={locale} />} />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#nwGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/features/net-worth/NetWorthTrendChart.tsx
git commit -m "feat: add NetWorthTrendChart with snapshotData breakdown tooltip"
```

---

### Task 17: SnapshotButton

**Files:**
- Create: `src/features/net-worth/SnapshotButton.tsx`

- [ ] **Step 1: Create `src/features/net-worth/SnapshotButton.tsx`**

```typescript
'use client';

import { t, useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import type { NetWorthSnapshot } from '@/lib/types';

interface SnapshotButtonProps {
  history: NetWorthSnapshot[];
  isRecording: boolean;
  onRecord: () => Promise<void>;
}

export function SnapshotButton({ history, isRecording, onRecord }: SnapshotButtonProps) {
  const locale = useLocale();

  const now = new Date();
  const currentMonthSnap = history.find(
    (s) => s.month === now.getMonth() && s.year === now.getFullYear()
  );

  return (
    <div className="border-border bg-card flex items-center justify-between rounded-2xl border p-5">
      <div>
        <p className="text-sm font-semibold">
          {locale === 'id' ? 'Catat snapshot bulan ini' : "Record this month's snapshot"}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {currentMonthSnap
            ? `${locale === 'id' ? 'Terakhir dicatat' : 'Last recorded'}: ${new Date(currentMonthSnap.createdAt).toLocaleString(
                locale === 'id' ? 'id-ID' : 'en-US',
                { dateStyle: 'medium', timeStyle: 'short' }
              )}`
            : locale === 'id'
            ? 'Belum ada snapshot bulan ini'
            : 'No snapshot for this month yet'}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={isRecording}
        onClick={onRecord}
        className="gap-2"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRecording ? 'animate-spin' : ''}`} />
        {t(locale, 'recordSnapshot')}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/features/net-worth/SnapshotButton.tsx
git commit -m "feat: add SnapshotButton with last-recorded timestamp"
```

---

### Task 18: /net-worth Page + Navigation

**Files:**
- Create: `src/app/net-worth/page.tsx`
- Modify: `src/features/navigation/nav-config.ts`

- [ ] **Step 1: Create `src/app/net-worth/page.tsx`**

```typescript
'use client';

import { t, useLocale } from '@/lib/i18n';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useNetWorth } from '@/features/net-worth/useNetWorth';
import { NetWorthSummaryCard } from '@/features/net-worth/NetWorthSummaryCard';
import { MonthOverMonthCard } from '@/features/net-worth/MonthOverMonthCard';
import { AssetsList } from '@/features/net-worth/AssetsList';
import { LiabilitiesList } from '@/features/net-worth/LiabilitiesList';
import { LiabilityDialog } from '@/features/net-worth/LiabilityDialog';
import { NetWorthTrendChart } from '@/features/net-worth/NetWorthTrendChart';
import { SnapshotButton } from '@/features/net-worth/SnapshotButton';

export default function NetWorthPage() {
  const locale = useLocale();
  const { current, history, liabilities, isLoading, error, form, deleteConfirm, recordSnapshot, isRecording } =
    useNetWorth();

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t(locale, 'netWorthPage')} />
        <p className="text-destructive py-8 text-center text-sm">{t(locale, 'error')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      <PageHeader title={t(locale, 'netWorthPage')} />

      {/* Row 1: Summary + MoM */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NetWorthSummaryCard current={current} isLoading={isLoading} />
        <MonthOverMonthCard history={history} isLoading={isLoading} />
      </div>

      {/* Row 2: Assets + Liabilities */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AssetsList current={current} />
        <LiabilitiesList
          liabilities={liabilities}
          onAdd={form.openAdd}
          onEdit={form.openEdit}
          onDelete={deleteConfirm.setId}
        />
      </div>

      {/* Row 3: Trend Chart */}
      <NetWorthTrendChart history={history} />

      {/* Row 4: Snapshot Button */}
      <SnapshotButton
        history={history}
        isRecording={isRecording}
        onRecord={recordSnapshot}
      />

      {/* Liability add/edit dialog */}
      <LiabilityDialog
        open={form.open}
        editingLiability={form.editingLiability}
        name={form.name}
        setName={form.setName}
        amount={form.amount}
        setAmount={form.setAmount}
        category={form.category}
        setCategory={form.setCategory}
        errors={form.errors}
        close={form.close}
        submit={form.submit}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm.id}
        onOpenChange={(open) => !open && deleteConfirm.setId(null)}
        title={t(locale, 'deleteLiability')}
        description={t(locale, 'deleteConfirmDescription')}
        confirmLabel={t(locale, 'delete')}
        cancelLabel={t(locale, 'cancel')}
        onConfirm={deleteConfirm.confirm}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add `/net-worth` to Finance group in `src/features/navigation/nav-config.ts`**

Add `TrendingUp` to the import from `lucide-react`:

```typescript
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
  TrendingUp,
} from 'lucide-react';
```

In the `finance` group's `items` array, add after the savings entry:

```typescript
      { href: '/net-worth', labelKey: 'netWorth', icon: TrendingUp },
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/app/net-worth/page.tsx src/features/navigation/nav-config.ts
git commit -m "feat: add /net-worth page and sidebar navigation entry"
```

---

### Task 19: NetWorthDashboardWidget

**Files:**
- Create: `src/features/net-worth/NetWorthDashboardWidget.tsx`

- [ ] **Step 1: Create `src/features/net-worth/NetWorthDashboardWidget.tsx`**

```typescript
'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { NetWorthCurrent, NetWorthSnapshot } from '@/lib/types';

interface NetWorthDashboardWidgetProps {
  current: NetWorthCurrent | null;
  history: NetWorthSnapshot[];
  isLoading: boolean;
}

export function NetWorthDashboardWidget({
  current,
  history,
  isLoading,
}: NetWorthDashboardWidgetProps) {
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="h-28 animate-pulse rounded-2xl bg-gradient-to-br from-blue-900 to-blue-600" />
    );
  }

  const lastTwo = history.slice(-2);
  const prev = lastTwo.length === 2 ? lastTwo[0] : null;
  const latest = lastTwo.length >= 1 ? lastTwo[lastTwo.length - 1] : null;
  const delta = prev && latest ? latest.netWorth - prev.netWorth : null;
  const positive = delta !== null && delta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Link href="/net-worth" className="block">
        <div className="rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] p-5 text-white transition-opacity hover:opacity-90">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
            {t(locale, 'netWorth')}
          </p>
          <p className="font-mono text-2xl font-extrabold">
            {formatCurrency(current?.netWorth ?? 0)}
          </p>
          {delta !== null && (
            <p
              className={cn(
                'mt-2 text-xs',
                positive ? 'text-emerald-300' : 'text-red-300'
              )}
            >
              {positive ? '▲' : '▼'} {formatCurrency(Math.abs(delta))}{' '}
              {locale === 'id' ? 'vs bulan lalu' : 'vs last month'}
            </p>
          )}
          <div className="mt-3 flex gap-4 border-t border-white/20 pt-3 text-[10px]">
            <div>
              <span className="opacity-60">{t(locale, 'assets')}: </span>
              <span className="font-mono font-semibold">
                {formatCurrency(current?.totalAssets ?? 0)}
              </span>
            </div>
            <div>
              <span className="opacity-60">{t(locale, 'liabilities')}: </span>
              <span className="font-mono font-semibold">
                {formatCurrency(current?.totalLiabilities ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/features/net-worth/NetWorthDashboardWidget.tsx
git commit -m "feat: add NetWorthDashboardWidget for dashboard integration"
```

---

### Task 20: Dashboard Integration

**Files:**
- Modify: `src/features/dashboard/useDashboardData.ts`
- Modify: `src/app/page.tsx` (dashboard page — add widget)

> **Note:** Read `src/app/page.tsx` before editing to find the correct insertion point for the widget.

- [ ] **Step 1: Add net worth fetch to `src/features/dashboard/useDashboardData.ts`**

In the `queryFn` `Promise.all` call, add `api.netWorth.get()` as a fifth parallel fetch:

```typescript
const [summaryResult, catResult, billsResult, savingsResult, netWorthResult] = await Promise.all([
  api.dashboard.summary(month, year),
  api.categories.list(),
  api.bills.list({ month, year }),
  api.savings.list(),
  api.netWorth.get(),
]);
```

Add `netWorthCurrent` and `netWorthHistory` to the returned `DashboardData` object:

```typescript
// In the DashboardData interface at the top of the file:
interface DashboardData {
  summary: DashboardSummaryResponse | null;
  categories: Category[];
  bills: Bill[];
  savingsGoals: SavingsGoal[];
  netWorthCurrent: import('@/lib/types').NetWorthCurrent | null;
  netWorthHistory: import('@/lib/types').NetWorthSnapshot[];
}
```

```typescript
// In the queryFn return:
return {
  summary: summaryResult.data ?? null,
  categories: catResult.data?.categories ?? [],
  bills: billsResult.data?.bills ?? [],
  savingsGoals: savingsResult.data?.goals ?? [],
  netWorthCurrent: netWorthResult.data?.current ?? null,
  netWorthHistory: netWorthResult.data?.history ?? [],
};
```

Add `netWorthCurrent` and `netWorthHistory` to the hook's return value:

```typescript
const netWorthCurrent = data?.netWorthCurrent ?? null;
const netWorthHistory = data?.netWorthHistory ?? [];

// Add to return object:
return {
  // ... existing returns ...
  netWorthCurrent,
  netWorthHistory,
};
```

- [ ] **Step 2: Add `NetWorthDashboardWidget` to dashboard page**

Read `src/app/page.tsx` to find where widgets are rendered, then add the widget after `AccountBalancesWidget` (or the savings goals widget). Import and render:

```typescript
import { NetWorthDashboardWidget } from '@/features/net-worth/NetWorthDashboardWidget';
```

In the JSX, after the existing account balances or savings section, add:

```typescript
<NetWorthDashboardWidget
  current={netWorthCurrent}
  history={netWorthHistory}
  isLoading={isLoading}
/>
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run test
```

Expected: 0 errors, 373 tests passing.

- [ ] **Step 4: Run preflight**

```bash
npm run preflight
```

Expected: format check, typecheck, lint, build all pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/useDashboardData.ts \
        src/app/page.tsx
git commit -m "feat: integrate NetWorthDashboardWidget into dashboard"
```

---

## Parallel Execution Map

```
Parallel Group 1 (no dependencies):
  Task 1 — Types + DB DDL
  Task 2 — i18n keys + Zod schemas

Sequential: Task 3 — Liability repository + service + tests (depends on Tasks 1, 2)
Sequential: Task 4 — Net-worth repository (depends on Task 1)
Sequential: Task 5 — Net-worth service getCurrentNetWorth (depends on Tasks 3, 4)
Sequential: Task 6 — Net-worth service recordSnapshot + history (depends on Task 5)

Parallel Group 2 (all depend on Tasks 5-6, independent of each other):
  Task 7  — GET/POST /api/liabilities
  Task 8  — PATCH/DELETE /api/liabilities/[id]
  Task 9  — GET /api/net-worth
  Task 10 — POST /api/net-worth/snapshot

Sequential: Task 11 — API client + contracts (depends on Tasks 7-10)
Sequential: Task 12 — useNetWorth hook (depends on Task 11)

Parallel Group 3 (Tasks 13-17 all depend on Task 1 for types; independent of each other):
  Task 13 — NetWorthSummaryCard + MonthOverMonthCard
  Task 14 — AssetsList
  Task 15 — LiabilitiesList + LiabilityDialog
  Task 16 — NetWorthTrendChart
  Task 17 — SnapshotButton

Note: Tasks 13-17 can start after Task 1 since they only need types + i18n.
      They don't need Tasks 2-12 (no API calls). But Task 18 needs Task 12.

Sequential: Task 18 — /net-worth page + navigation (depends on Tasks 12-17)
Sequential: Task 19 — NetWorthDashboardWidget (depends on Task 11)
Sequential: Task 20 — Dashboard integration (depends on Tasks 12, 19)
```
