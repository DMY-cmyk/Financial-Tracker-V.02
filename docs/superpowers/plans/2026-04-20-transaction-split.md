# Transaction Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add transaction split functionality so a single transaction can be allocated across multiple categories while appearing as one row in all lists.

**Architecture:** Normalized `transaction_splits` table linked to the parent transaction via FK. The parent gains an `is_split` flag; category is set to `''` (empty string) on the parent when split — the `isSplit` flag drives all UI and calculation logic. Splits are loaded via a two-query approach (no dialect-specific aggregation): fetch transactions, then batch-load splits for `isSplit=true` rows in a second query and merge in application code.

**Tech Stack:** better-sqlite3 / Neon Postgres (via shared `DbClient`), Zod v4, Vitest, React + Framer Motion, Tailwind v4, shadcn/ui, Lucide icons.

**Worktree:** `.worktrees/transaction-split` on branch `feature/transaction-split`.

---

## Task 1: DB Schema — Add `is_split` column + `transaction_splits` table

**Files:**
- Modify: `src/server/db/client.ts`
- Test: `src/__tests__/db-schema.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/db-schema.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, getDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('transaction_splits schema', () => {
  it('transaction_splits table exists and is queryable', async () => {
    const db = await getDb();
    const result = await db.query('SELECT * FROM transaction_splits LIMIT 0');
    expect(result.rows).toEqual([]);
  });

  it('transactions.is_split column defaults to 0', async () => {
    const db = await getDb();
    const id = 'test-schema-1';
    await db.query(
      'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, '2026-01-01', 'Test', 'Food', 'cat-1', 'expense', 10000, 'Cash', '']
    );
    const result = await db.query<{ is_split: number }>(
      'SELECT is_split FROM transactions WHERE id = ?',
      [id]
    );
    expect(result.rows[0].is_split).toBe(0);
  });

  it('transaction_splits enforces ON DELETE CASCADE', async () => {
    const db = await getDb();
    const txId = 'test-schema-2';
    const splitId = 'split-schema-1';
    await db.query(
      'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, is_split) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [txId, '2026-01-01', 'Test', '', '', 'expense', 10000, 'Cash', '', 1]
    );
    await db.query(
      'INSERT INTO transaction_splits (id, transaction_id, category_id, category, amount, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [splitId, txId, 'cat-1', 'Food', 10000, '2026-01-01T00:00:00Z']
    );
    await db.query('DELETE FROM transactions WHERE id = ?', [txId]);
    const splits = await db.query('SELECT * FROM transaction_splits WHERE transaction_id = ?', [txId]);
    expect(splits.rows).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd .worktrees/transaction-split
npm test -- --reporter=verbose src/__tests__/db-schema.test.ts
```

Expected: FAIL — `transaction_splits table does not exist`

- [ ] **Step 3: Add schema to `src/server/db/client.ts`**

In the `tables` array (after the last existing table, before the closing `]`), add:

```typescript
    `CREATE TABLE IF NOT EXISTS transaction_splits (
      id             TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      category_id    TEXT,
      category       TEXT NOT NULL DEFAULT '',
      amount         DOUBLE PRECISION NOT NULL CHECK (amount > 0),
      description    TEXT,
      created_at     TEXT NOT NULL
    )`,
```

In the `columnMigrations` array, add:

```typescript
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_split INTEGER NOT NULL DEFAULT 0`,
```

In the `indexes` array, add:

```typescript
    'CREATE INDEX IF NOT EXISTS idx_splits_transaction_id ON transaction_splits(transaction_id)',
    'CREATE INDEX IF NOT EXISTS idx_splits_category_id ON transaction_splits(category_id)',
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose src/__tests__/db-schema.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Run full suite to confirm no regressions**

```bash
npm test
```

Expected: 448 existing tests + 3 new = 451 passing, 0 failing

- [ ] **Step 6: Commit**

```bash
git add src/server/db/client.ts src/__tests__/db-schema.test.ts
git commit -m "feat: add is_split column and transaction_splits table to schema"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/lib/types.ts`

**Dependencies:** None (pure types; verified by typecheck)

- [ ] **Step 1: Write the failing test**

In `src/__tests__/transaction-split.repository.test.ts` (new file, also used in Task 5 — create it now with just the import):

```typescript
import { describe, it, expect } from 'vitest';
import type { TransactionSplit, TransactionSplitInput } from '@/lib/types';

describe('TransactionSplit types', () => {
  it('TransactionSplitInput can be constructed', () => {
    const input: TransactionSplitInput = {
      categoryId: 'cat-food',
      category: 'Food',
      amount: 200000,
    };
    expect(input.amount).toBe(200000);
    expect(input.description).toBeUndefined();
  });

  it('TransactionSplit has all required fields', () => {
    const split: TransactionSplit = {
      id: 'split-1',
      transactionId: 'tx-1',
      categoryId: 'cat-food',
      category: 'Food',
      amount: 200000,
      description: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(split.id).toBe('split-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose src/__tests__/transaction-split.repository.test.ts
```

Expected: FAIL — `TransactionSplit` and `TransactionSplitInput` are not exported from `@/lib/types`

- [ ] **Step 3: Add types to `src/lib/types.ts`**

After the closing brace of the `Transaction` interface, add:

```typescript
export interface TransactionSplit {
  id: string;
  transactionId: string;
  categoryId: string | null;
  category: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface TransactionSplitInput {
  categoryId: string | null;
  category: string;
  amount: number;
  description?: string | null;
}
```

Extend the existing `Transaction` interface by adding two fields after `sourceDueDate?`:

```typescript
  isSplit: boolean;
  splits?: TransactionSplit[];
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose src/__tests__/transaction-split.repository.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors (existing code still treats `isSplit` as optional via existing data paths — fix any errors by adding `isSplit: false` defaults in `rowToTransaction` in Task 6)

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/__tests__/transaction-split.repository.test.ts
git commit -m "feat: add TransactionSplit types and extend Transaction interface"
```

---

## Task 3: Zod Validation Schemas

**Files:**
- Modify: `src/lib/api/validation.ts`
- Modify: `src/__tests__/validation.test.ts`

**Dependencies:** Task 2

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/validation.test.ts` (before the last closing line):

```typescript
import {
  transactionSplitInputSchema,
  createTransactionWithSplitsSchema,
  updateTransactionWithSplitsSchema,
} from '@/lib/api/validation';

describe('transactionSplitInputSchema', () => {
  it('accepts valid split line', () => {
    const result = transactionSplitInputSchema.safeParse({
      categoryId: 'cat-food',
      category: 'Food',
      amount: 200000,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null categoryId', () => {
    const result = transactionSplitInputSchema.safeParse({
      categoryId: null,
      category: 'Food',
      amount: 200000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty category string', () => {
    const result = transactionSplitInputSchema.safeParse({
      categoryId: null,
      category: '',
      amount: 200000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero amount', () => {
    const result = transactionSplitInputSchema.safeParse({
      categoryId: 'cat-food',
      category: 'Food',
      amount: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('createTransactionWithSplitsSchema', () => {
  const base = {
    date: '2026-01-15',
    description: 'Test',
    type: 'expense' as const,
    amount: 500000,
    paymentMethod: 'Cash',
  };

  it('accepts request with splits (no category required)', () => {
    const result = createTransactionWithSplitsSchema.safeParse({
      ...base,
      splits: [
        { categoryId: 'cat-food', category: 'Food', amount: 300000 },
        { categoryId: 'cat-home', category: 'Household', amount: 200000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('requires category when no splits', () => {
    const result = createTransactionWithSplitsSchema.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('category');
    }
  });

  it('rejects splits array with only one item', () => {
    const result = createTransactionWithSplitsSchema.safeParse({
      ...base,
      splits: [{ categoryId: 'cat-food', category: 'Food', amount: 500000 }],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose src/__tests__/validation.test.ts
```

Expected: FAIL — schemas not exported from validation.ts

- [ ] **Step 3: Add schemas to `src/lib/api/validation.ts`**

Add after the `bulkDeleteTransactionSchema` export:

```typescript
export const transactionSplitInputSchema = z.object({
  categoryId: z.string().nullable(),
  category: z.string().min(1, 'Category name is required'),
  amount: z.number().positive('Split amount must be greater than zero'),
  description: z.string().nullable().optional(),
});

export const createTransactionWithSplitsSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    description: z.string().min(1, 'Description is required').max(200),
    category: z.string().optional().default(''),
    categoryId: z.string().optional().default(''),
    type: z.enum(['income', 'expense']),
    amount: z.number().positive('Amount must be positive'),
    paymentMethod: z.string().min(1, 'Payment method is required'),
    notes: z.string().max(500).optional().default(''),
    splits: z.array(transactionSplitInputSchema).min(2).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.splits) {
      if (!data.category) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['category'],
          message: 'Category is required',
        });
      }
      if (!data.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['categoryId'],
          message: 'Category ID is required',
        });
      }
    }
  });

export const updateTransactionWithSplitsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().min(1).max(200).optional(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
  amount: z.number().positive().optional(),
  paymentMethod: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
  splits: z.array(transactionSplitInputSchema).min(2).nullable().optional(),
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose src/__tests__/validation.test.ts
```

Expected: all tests pass (44 existing + new split schema tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/validation.ts src/__tests__/validation.test.ts
git commit -m "feat: add Zod schemas for transaction split input and validation"
```

---

## Task 4: i18n Keys

**Files:**
- Modify: `src/lib/i18n.ts`

**Dependencies:** None

- [ ] **Step 1: Write the failing test**

Run typecheck — it will fail once we add keys to the `TranslationKeys` type without adding them to the dictionaries.

```bash
npm run typecheck
```

Expected: currently passes. After adding keys to the type definition but not the dictionaries → FAIL.

- [ ] **Step 2: Add keys to `TranslationKeys` type in `src/lib/i18n.ts`**

In the `type TranslationKeys = { ... }` block, add the new keys (alphabetically within a logical group):

```typescript
  // Split transactions
  splitTransaction: string;
  splitAllocation: string;
  addSplit: string;
  removeSplit: string;
  removeSplitConfirm: string;
  splitDescription: string;
  remainingAmount: string;
  multipleCategoriesSplit: string;
  totalMustMatch: string;
  expandSplits: string;
```

- [ ] **Step 3: Run typecheck to verify it fails (RED)**

```bash
npm run typecheck
```

Expected: FAIL — EN and ID translation objects are missing the new keys.

- [ ] **Step 4: Add translations to both locale objects**

Find the `en:` translation object and add (within its braces, near other transaction-related keys):

```typescript
  splitTransaction: 'Split this transaction',
  splitAllocation: 'Split Allocation',
  addSplit: 'Add split line',
  removeSplit: 'Remove split',
  removeSplitConfirm: 'Remove all splits and revert to single category?',
  splitDescription: 'Sub-description (optional)',
  remainingAmount: 'Remaining',
  multipleCategoriesSplit: 'Multiple',
  totalMustMatch: 'Split amounts must equal total',
  expandSplits: 'Expand split transactions in export',
```

Find the `id:` translation object and add:

```typescript
  splitTransaction: 'Pisah transaksi ini',
  splitAllocation: 'Alokasi Pisahan',
  addSplit: 'Tambah baris pisahan',
  removeSplit: 'Hapus pisahan',
  removeSplitConfirm: 'Hapus semua pisahan dan kembalikan ke satu kategori?',
  splitDescription: 'Sub-deskripsi (opsional)',
  remainingAmount: 'Sisa',
  multipleCategoriesSplit: 'Beberapa kategori',
  totalMustMatch: 'Jumlah pisahan harus sama dengan total',
  expandSplits: 'Perluas transaksi pisahan saat ekspor',
```

- [ ] **Step 5: Run typecheck to verify it passes (GREEN)**

```bash
npm run typecheck
```

Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat: add i18n keys for transaction split UI"
```

---

## Task 5: TransactionSplit Repository

**Files:**
- Create: `src/server/repositories/transaction-split.repository.ts`
- Modify: `src/__tests__/transaction-split.repository.test.ts` (expand from Task 2)

**Dependencies:** Tasks 1, 2

- [ ] **Step 1: Expand the test file with repository tests**

Replace the contents of `src/__tests__/transaction-split.repository.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, getDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import type { TransactionSplit, TransactionSplitInput } from '@/lib/types';
import { createTransactionSplitRepository } from '@/server/repositories/transaction-split.repository';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

async function insertParentTx(db: Awaited<ReturnType<typeof getDb>>, id: string) {
  await db.query(
    'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, is_split) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, '2026-01-15', 'Test', '', '', 'expense', 500000, 'Cash', '', 1]
  );
}

describe('createTransactionSplitRepository', () => {
  it('createSplits inserts lines and getSplitsByTransactionId retrieves them', async () => {
    const db = await getDb();
    const repo = createTransactionSplitRepository();
    await insertParentTx(db, 'tx-1');

    const inputs: TransactionSplitInput[] = [
      { categoryId: 'cat-food', category: 'Food', amount: 200000, description: 'Groceries' },
      { categoryId: 'cat-home', category: 'Household', amount: 300000, description: null },
    ];
    await repo.createSplits('tx-1', inputs);

    const splits = await repo.getSplitsByTransactionId('tx-1');
    expect(splits).toHaveLength(2);
    expect(splits[0].category).toBe('Food');
    expect(splits[0].amount).toBe(200000);
    expect(splits[1].category).toBe('Household');
    expect(splits[1].transactionId).toBe('tx-1');
  });

  it('deleteSplits removes all lines for a transaction', async () => {
    const db = await getDb();
    const repo = createTransactionSplitRepository();
    await insertParentTx(db, 'tx-2');

    await repo.createSplits('tx-2', [
      { categoryId: 'cat-a', category: 'A', amount: 100000 },
      { categoryId: 'cat-b', category: 'B', amount: 200000 },
    ]);
    await repo.deleteSplits('tx-2');

    const splits = await repo.getSplitsByTransactionId('tx-2');
    expect(splits).toHaveLength(0);
  });

  it('getSplitsForTransactions returns a Map keyed by transactionId', async () => {
    const db = await getDb();
    const repo = createTransactionSplitRepository();
    await insertParentTx(db, 'tx-3');
    await insertParentTx(db, 'tx-4');

    await repo.createSplits('tx-3', [
      { categoryId: 'cat-a', category: 'A', amount: 50000 },
      { categoryId: 'cat-b', category: 'B', amount: 50000 },
    ]);
    await repo.createSplits('tx-4', [
      { categoryId: 'cat-c', category: 'C', amount: 75000 },
      { categoryId: 'cat-d', category: 'D', amount: 25000 },
    ]);

    const map = await repo.getSplitsForTransactions(['tx-3', 'tx-4']);
    expect(map.get('tx-3')).toHaveLength(2);
    expect(map.get('tx-4')).toHaveLength(2);
    expect(map.get('tx-3')![0].category).toBe('A');
  });

  it('getSplitsForTransactions returns empty Map for empty input', async () => {
    const repo = createTransactionSplitRepository();
    const map = await repo.getSplitsForTransactions([]);
    expect(map.size).toBe(0);
  });

  it('countByCategory returns number of splits using a category', async () => {
    const db = await getDb();
    const repo = createTransactionSplitRepository();
    await insertParentTx(db, 'tx-5');

    await repo.createSplits('tx-5', [
      { categoryId: 'cat-food', category: 'Food', amount: 200000 },
      { categoryId: 'cat-home', category: 'Household', amount: 300000 },
    ]);

    expect(await repo.countByCategory('cat-food')).toBe(1);
    expect(await repo.countByCategory('cat-home')).toBe(1);
    expect(await repo.countByCategory('cat-other')).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose src/__tests__/transaction-split.repository.test.ts
```

Expected: FAIL — `createTransactionSplitRepository` not found

- [ ] **Step 3: Create `src/server/repositories/transaction-split.repository.ts`**

```typescript
import type { TransactionSplit, TransactionSplitInput } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface SplitRow {
  id: string;
  transaction_id: string;
  category_id: string | null;
  category: string;
  amount: number;
  description: string | null;
  created_at: string;
}

function rowToSplit(row: SplitRow): TransactionSplit {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    categoryId: row.category_id,
    category: row.category,
    amount: row.amount,
    description: row.description,
    createdAt: row.created_at,
  };
}

export function createTransactionSplitRepository() {
  return {
    async createSplits(transactionId: string, splits: TransactionSplitInput[]): Promise<void> {
      const db = await getDb();
      const now = new Date().toISOString();
      for (const split of splits) {
        await db.query(
          'INSERT INTO transaction_splits (id, transaction_id, category_id, category, amount, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            nanoid(),
            transactionId,
            split.categoryId,
            split.category,
            split.amount,
            split.description ?? null,
            now,
          ]
        );
      }
    },

    async deleteSplits(transactionId: string): Promise<void> {
      const db = await getDb();
      await db.query('DELETE FROM transaction_splits WHERE transaction_id = ?', [transactionId]);
    },

    async getSplitsByTransactionId(transactionId: string): Promise<TransactionSplit[]> {
      const db = await getDb();
      const result = await db.query<SplitRow>(
        'SELECT * FROM transaction_splits WHERE transaction_id = ? ORDER BY created_at',
        [transactionId]
      );
      return result.rows.map(rowToSplit);
    },

    async getSplitsForTransactions(
      transactionIds: string[]
    ): Promise<Map<string, TransactionSplit[]>> {
      if (transactionIds.length === 0) return new Map();
      const db = await getDb();
      const placeholders = transactionIds.map(() => '?').join(', ');
      const result = await db.query<SplitRow>(
        `SELECT * FROM transaction_splits WHERE transaction_id IN (${placeholders}) ORDER BY created_at`,
        transactionIds
      );
      const map = new Map<string, TransactionSplit[]>();
      for (const row of result.rows) {
        const split = rowToSplit(row);
        const existing = map.get(split.transactionId) ?? [];
        existing.push(split);
        map.set(split.transactionId, existing);
      }
      return map;
    },

    async countByCategory(categoryId: string): Promise<number> {
      const db = await getDb();
      const result = await db.query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM transaction_splits WHERE category_id = ?',
        [categoryId]
      );
      return result.rows[0]?.cnt ?? 0;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose src/__tests__/transaction-split.repository.test.ts
```

Expected: PASS (5 repository tests + 2 type tests = 7 total)

- [ ] **Step 5: Commit**

```bash
git add src/server/repositories/transaction-split.repository.ts src/__tests__/transaction-split.repository.test.ts
git commit -m "feat: add TransactionSplit repository with CRUD and batch-load methods"
```

---

## Task 6: Transaction Repository — `is_split` mapping + split enrichment

**Files:**
- Modify: `src/server/repositories/transaction.repository.ts`

**Dependencies:** Tasks 1, 2, 5

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/transaction-split.repository.test.ts` (append a new describe block):

```typescript
import { createTransactionRepository } from '@/server/repositories/transaction.repository';

describe('transaction repository split enrichment', () => {
  it('findAll populates splits on isSplit=true rows only', async () => {
    const txRepo = createTransactionRepository();
    const splitRepo = createTransactionSplitRepository();

    // Create a regular transaction
    const regular = await txRepo.create({
      date: '2026-01-10',
      description: 'Regular',
      category: 'Food',
      categoryId: 'cat-food',
      type: 'expense',
      amount: 50000,
      paymentMethod: 'Cash',
      notes: '',
      isSplit: false,
    });

    // Create a split transaction directly via DB
    const db = await getDb();
    const splitTxId = 'tx-split-enrichment';
    await db.query(
      'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, is_split) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [splitTxId, '2026-01-12', 'Supermarket', '', '', 'expense', 500000, 'BCA', '', 1]
    );
    await splitRepo.createSplits(splitTxId, [
      { categoryId: 'cat-food', category: 'Food', amount: 200000 },
      { categoryId: 'cat-home', category: 'Household', amount: 300000 },
    ]);

    const all = await txRepo.findAll();
    const splitTx = all.find((t) => t.id === splitTxId);
    const regularTx = all.find((t) => t.id === regular.id);

    expect(splitTx?.isSplit).toBe(true);
    expect(splitTx?.splits).toHaveLength(2);
    expect(regularTx?.isSplit).toBe(false);
    expect(regularTx?.splits).toBeUndefined();
  });

  it('findById populates splits for split transaction', async () => {
    const txRepo = createTransactionRepository();
    const splitRepo = createTransactionSplitRepository();
    const db = await getDb();

    const splitTxId = 'tx-findbyid-split';
    await db.query(
      'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, is_split) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [splitTxId, '2026-01-15', 'Market', '', '', 'expense', 300000, 'Cash', '', 1]
    );
    await splitRepo.createSplits(splitTxId, [
      { categoryId: 'cat-a', category: 'A', amount: 150000 },
      { categoryId: 'cat-b', category: 'B', amount: 150000 },
    ]);

    const tx = await txRepo.findById(splitTxId);
    expect(tx?.isSplit).toBe(true);
    expect(tx?.splits).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose src/__tests__/transaction-split.repository.test.ts
```

Expected: FAIL — `isSplit` and `splits` not on Transaction objects

- [ ] **Step 3: Update `src/server/repositories/transaction.repository.ts`**

**a) Update `TxRow` interface** — add `is_split` field:

```typescript
interface TxRow {
  id: string;
  date: string;
  description: string;
  category: string;
  category_id: string;
  type: string;
  amount: number;
  payment_method: string;
  notes: string;
  source_recurring_id: string | null;
  source_due_date: string | null;
  is_split: number; // ← add this
}
```

**b) Update `rowToTransaction`** — add `isSplit` mapping:

```typescript
function rowToTransaction(row: TxRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    category: row.category,
    categoryId: row.category_id || '',
    type: row.type as 'income' | 'expense',
    amount: row.amount,
    paymentMethod: row.payment_method,
    notes: row.notes || '',
    sourceRecurringId: row.source_recurring_id ?? undefined,
    sourceDueDate: row.source_due_date ?? undefined,
    isSplit: row.is_split === 1, // ← add this
  };
}
```

**c) Add import** at the top of the file:

```typescript
import { createTransactionSplitRepository } from './transaction-split.repository';
```

**d) Add `enrichWithSplits` helper** after `rowToTransaction`:

```typescript
async function enrichWithSplits(transactions: Transaction[]): Promise<Transaction[]> {
  const splitIds = transactions.filter((t) => t.isSplit).map((t) => t.id);
  if (splitIds.length === 0) return transactions;
  const splitRepo = createTransactionSplitRepository();
  const splitsMap = await splitRepo.getSplitsForTransactions(splitIds);
  return transactions.map((t) =>
    t.isSplit ? { ...t, splits: splitsMap.get(t.id) ?? [] } : t
  );
}
```

**e) Update `create` method** — add `is_split` to the INSERT:

Replace the INSERT query string and params array:

```typescript
async create(data: Omit<Transaction, 'id'>): Promise<Transaction> {
  const id = nanoid();
  const db = await getDb();
  await db.query(
    'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, source_recurring_id, source_due_date, is_split) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      data.date,
      data.description,
      data.category,
      data.categoryId,
      data.type,
      data.amount,
      data.paymentMethod,
      data.notes,
      data.sourceRecurringId ?? null,
      data.sourceDueDate ?? null,
      data.isSplit ? 1 : 0,
    ]
  );
  return { ...data, id };
},
```

**f) Update `update` method** — add `is_split` to the UPDATE:

Replace the UPDATE query string and params array:

```typescript
async update(id: string, data: Partial<Transaction>): Promise<Transaction | undefined> {
  const db = await getDb();
  const existing = await db.query<TxRow>('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!existing.rows[0]) return undefined;

  const updated = { ...rowToTransaction(existing.rows[0]), ...data };
  await db.query(
    'UPDATE transactions SET date=?, description=?, category=?, category_id=?, type=?, amount=?, payment_method=?, notes=?, is_split=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [
      updated.date,
      updated.description,
      updated.category,
      updated.categoryId,
      updated.type,
      updated.amount,
      updated.paymentMethod,
      updated.notes,
      updated.isSplit ? 1 : 0,
      id,
    ]
  );
  return updated;
},
```

**g) Update `findAll`, `findById`, `findByMonth`** — call `enrichWithSplits`:

```typescript
async findAll(): Promise<Transaction[]> {
  const db = await getDb();
  const result = await db.query<TxRow>('SELECT * FROM transactions ORDER BY date DESC');
  return enrichWithSplits(result.rows.map(rowToTransaction));
},

async findById(id: string): Promise<Transaction | undefined> {
  const db = await getDb();
  const result = await db.query<TxRow>('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!result.rows[0]) return undefined;
  const [enriched] = await enrichWithSplits([rowToTransaction(result.rows[0])]);
  return enriched;
},

async findByMonth(month: number, year: number): Promise<Transaction[]> {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const db = await getDb();
  const result = await db.query<TxRow>(
    "SELECT * FROM transactions WHERE date LIKE ? || '%' ORDER BY date DESC",
    [prefix]
  );
  return enrichWithSplits(result.rows.map(rowToTransaction));
},
```

**h) Update `findFiltered`** — add `enrichWithSplits` at the end before returning. Find the `findFiltered` method and at its `return` statement, wrap the rows:

```typescript
// At the end of findFiltered, change:
//   return { rows: result.rows.map(rowToTransaction), total, income, expense };
// To:
const transactions = await enrichWithSplits(result.rows.map(rowToTransaction));
return { rows: transactions, total, income, expense };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose src/__tests__/transaction-split.repository.test.ts
```

Expected: all tests pass

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: 448 + all new tests passing, 0 failures

- [ ] **Step 6: Commit**

```bash
git add src/server/repositories/transaction.repository.ts src/__tests__/transaction-split.repository.test.ts
git commit -m "feat: enrich transaction repository with split data via two-query approach"
```

---

## Task 7: Category Service — Extend Delete Guard

**Files:**
- Modify: `src/server/services/category.service.ts`
- Modify: `src/__tests__/category.service.test.ts`

**Dependencies:** Task 5

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/category.service.test.ts` (append inside the `deleteCategory` describe block):

```typescript
import { createTransactionSplitRepository } from '@/server/repositories/transaction-split.repository';

  it('blocks deletion when splits reference the category', async () => {
    const cat = await createCategory({
      name: 'Food',
      type: 'expense',
      color: '#F59E0B',
      icon: 'circle',
      budget: 500000,
    });

    // Insert a parent split transaction directly
    const txRepo = createTransactionRepository();
    const db = await (await import('@/server/db/client')).getDb();
    const txId = 'tx-cat-guard-split';
    await db.query(
      'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, is_split) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [txId, '2026-01-01', 'Split tx', '', '', 'expense', 500000, 'Cash', '', 1]
    );

    const splitRepo = createTransactionSplitRepository();
    await splitRepo.createSplits(txId, [
      { categoryId: cat.data!.id, category: 'Food', amount: 300000 },
      { categoryId: null, category: 'Other', amount: 200000 },
    ]);

    const result = await deleteCategory(cat.data!.id);
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('CONFLICT');
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose src/__tests__/category.service.test.ts
```

Expected: FAIL — delete succeeds when it should be blocked

- [ ] **Step 3: Update `src/server/services/category.service.ts`**

Add import at the top:

```typescript
import { createTransactionSplitRepository } from '@/server/repositories/transaction-split.repository';
```

Replace the `deleteCategory` function body after the `NOT_FOUND` check:

```typescript
  const txRepo = createTransactionRepository();
  const splitRepo = createTransactionSplitRepository();

  const [txCount, splitCount] = await Promise.all([
    txRepo.countByCategory(id),
    splitRepo.countByCategory(id),
  ]);

  if (txCount > 0 || splitCount > 0) {
    return {
      error: {
        message: `Cannot delete "${category.name}" — ${txCount + splitCount} transaction(s) still use it`,
        code: 'CONFLICT',
      },
    };
  }

  await repo.delete(id);
  return { data: { success: true } };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose src/__tests__/category.service.test.ts
```

Expected: all tests pass including new guard test

- [ ] **Step 5: Commit**

```bash
git add src/server/services/category.service.ts src/__tests__/category.service.test.ts
git commit -m "feat: block category deletion when category is used in split lines"
```

---

## Task 8: Split-Aware `categoryTotals` in calculations.ts

**Files:**
- Modify: `src/lib/calculations.ts`
- Modify: `src/__tests__/dashboard.service.test.ts`

**Dependencies:** Task 6 (split enrichment in repository)

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/dashboard.service.test.ts` (append a new describe block):

```typescript
describe('getDashboardSummary with split transactions', () => {
  it('includes split line amounts in category totals, not parent total', async () => {
    // Create a split transaction via the DB directly (service not yet updated)
    const db = await (await import('@/server/db/client')).getDb();
    const { createTransactionSplitRepository } =
      await import('@/server/repositories/transaction-split.repository');
    const splitRepo = createTransactionSplitRepository();

    const txId = 'tx-dash-split';
    await db.query(
      'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, is_split) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [txId, '2026-01-20', 'Supermarket', '', '', 'expense', 500000, 'Cash', '', 1]
    );
    await splitRepo.createSplits(txId, [
      { categoryId: 'cat-food', category: 'Food', amount: 200000 },
      { categoryId: 'cat-home', category: 'Household', amount: 150000 },
      { categoryId: 'cat-personal', category: 'Personal Care', amount: 150000 },
    ]);

    const result = await getDashboardSummary({ month: 0, year: 2026 });
    const data = result.data!;

    // Total expense still uses parent amount (correct)
    expect(data.expense).toBe(500000);

    // Category totals use split line amounts, not parent
    expect(data.categoryTotals['cat-food']).toBe(200000);
    expect(data.categoryTotals['cat-home']).toBe(150000);
    expect(data.categoryTotals['cat-personal']).toBe(150000);

    // Empty-string parent category must NOT appear
    expect(data.categoryTotals['']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose src/__tests__/dashboard.service.test.ts
```

Expected: FAIL — `categoryTotals['cat-food']` is undefined; `categoryTotals['']` = 500000

- [ ] **Step 3: Update `categoryTotals` in `src/lib/calculations.ts`**

Replace the `categoryTotals` function:

```typescript
export function categoryTotals(
  transactions: Transaction[],
  type: 'income' | 'expense' = 'expense'
): Record<string, number> {
  const totals: Record<string, number> = {};
  transactions
    .filter((t) => t.type === type)
    .forEach((t) => {
      if (t.isSplit && t.splits && t.splits.length > 0) {
        t.splits.forEach((s) => {
          const key = s.categoryId || s.category;
          if (key) totals[key] = (totals[key] || 0) + s.amount;
        });
      } else if (!t.isSplit) {
        const key = t.categoryId || t.category;
        if (key) totals[key] = (totals[key] || 0) + t.amount;
      }
    });
  return totals;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose src/__tests__/dashboard.service.test.ts
```

Expected: all tests pass including new split category test

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: all tests passing

- [ ] **Step 6: Commit**

```bash
git add src/lib/calculations.ts src/__tests__/dashboard.service.test.ts
git commit -m "feat: make categoryTotals split-aware — aggregate split lines instead of parent amount"
```

---

## Task 9: Transaction Service — `createTransaction` Split Path

**Files:**
- Modify: `src/server/services/transaction.service.ts`
- Modify: `src/__tests__/transaction.service.test.ts`

**Dependencies:** Tasks 3, 5, 6

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/transaction.service.test.ts` (append a new describe block):

```typescript
describe('createTransaction with splits', () => {
  const splitBase = {
    date: '2026-03-27',
    description: 'Indomaret',
    type: 'expense' as const,
    amount: 500000,
    paymentMethod: 'Cash',
  };

  it('creates a split transaction with valid splits', async () => {
    const result = await createTransaction({
      ...splitBase,
      splits: [
        { categoryId: 'cat-food', category: 'Food', amount: 200000, description: 'Groceries' },
        { categoryId: 'cat-home', category: 'Household', amount: 150000, description: null },
        { categoryId: 'cat-personal', category: 'Personal Care', amount: 150000 },
      ],
    });

    expect(result.error).toBeUndefined();
    const tx = result.data!;
    expect(tx.isSplit).toBe(true);
    expect(tx.category).toBe('');
    expect(tx.categoryId).toBe('');
    expect(tx.splits).toHaveLength(3);
    expect(tx.splits![0].category).toBe('Food');
    expect(tx.splits![0].amount).toBe(200000);
  });

  it('returns SPLIT_SUM_MISMATCH when splits do not sum to total', async () => {
    const result = await createTransaction({
      ...splitBase,
      splits: [
        { categoryId: 'cat-food', category: 'Food', amount: 100000 },
        { categoryId: 'cat-home', category: 'Household', amount: 100000 },
      ],
    });
    expect(result.error?.code).toBe('SPLIT_SUM_MISMATCH');
  });

  it('returns INVALID_SPLIT_COUNT when only one split line provided', async () => {
    const result = await createTransaction({
      ...splitBase,
      splits: [{ categoryId: 'cat-food', category: 'Food', amount: 500000 }],
    });
    expect(result.error?.code).toBe('INVALID_SPLIT_COUNT');
  });

  it('returns INVALID_SPLIT_AMOUNT when a split amount is zero', async () => {
    const result = await createTransaction({
      ...splitBase,
      splits: [
        { categoryId: 'cat-food', category: 'Food', amount: 500000 },
        { categoryId: 'cat-home', category: 'Household', amount: 0 },
      ],
    });
    expect(result.error?.code).toBe('INVALID_SPLIT_AMOUNT');
  });

  it('creates a single-category transaction when splits absent', async () => {
    const result = await createTransaction({
      ...splitBase,
      category: 'Food',
      categoryId: 'cat-food',
    });
    expect(result.error).toBeUndefined();
    expect(result.data!.isSplit).toBe(false);
    expect(result.data!.splits).toBeUndefined();
  });

  it('uses ±1 IDR tolerance for sum check', async () => {
    const result = await createTransaction({
      ...splitBase,
      amount: 333333,
      splits: [
        { categoryId: 'cat-a', category: 'A', amount: 111111 },
        { categoryId: 'cat-b', category: 'B', amount: 111111 },
        { categoryId: 'cat-c', category: 'C', amount: 111111 },
      ],
    });
    // Sum = 333333, total = 333333, within tolerance
    expect(result.error).toBeUndefined();
    expect(result.data!.isSplit).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose src/__tests__/transaction.service.test.ts
```

Expected: FAIL — `createTransaction` doesn't handle `splits` field

- [ ] **Step 3: Update `src/server/services/transaction.service.ts`**

Add imports at the top:

```typescript
import { createTransactionSplitRepository } from '@/server/repositories/transaction-split.repository';
import {
  createTransactionWithSplitsSchema,
  updateTransactionWithSplitsSchema,
} from '@/lib/api/validation';
import type { TransactionSplitInput } from '@/lib/types';
```

Replace the `createTransaction` function:

```typescript
export async function createTransaction(body: unknown): Promise<ServiceResult<Transaction>> {
  await ensureSeeded();

  const parsed = createTransactionWithSplitsSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }

  const { splits, ...txData } = parsed.data;

  if (!splits) {
    // No splits — standard single-category path
    const transaction = await repo.create({ ...txData, isSplit: false });
    return { data: transaction };
  }

  // Split path — validate business rules
  if (splits.length < 2) {
    return { error: { message: 'A split requires at least 2 lines', code: 'INVALID_SPLIT_COUNT' } };
  }

  for (const s of splits) {
    if (s.amount <= 0) {
      return {
        error: { message: 'Each split amount must be greater than zero', code: 'INVALID_SPLIT_AMOUNT' },
      };
    }
  }

  const splitSum = splits.reduce((sum, s) => sum + s.amount, 0);
  if (Math.abs(splitSum - txData.amount) > 1) {
    return {
      error: {
        message: `Split amounts (${splitSum}) must equal transaction total (${txData.amount})`,
        code: 'SPLIT_SUM_MISMATCH',
      },
    };
  }

  const db = await (await import('@/server/db/client')).getDb();
  const splitRepo = createTransactionSplitRepository();

  await db.exec('BEGIN');
  try {
    const transaction = await repo.create({
      ...txData,
      category: '',
      categoryId: '',
      isSplit: true,
    });
    await splitRepo.createSplits(transaction.id, splits as TransactionSplitInput[]);
    await db.exec('COMMIT');
    return { data: { ...transaction, splits: await splitRepo.getSplitsByTransactionId(transaction.id) } };
  } catch (err) {
    await db.exec('ROLLBACK');
    throw err;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose src/__tests__/transaction.service.test.ts
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/server/services/transaction.service.ts src/__tests__/transaction.service.test.ts
git commit -m "feat: createTransaction supports split lines with sum validation and atomic DB write"
```

---

## Task 10: Transaction Service — `updateTransaction` Split Path

**Files:**
- Modify: `src/server/services/transaction.service.ts`
- Modify: `src/__tests__/transaction.service.test.ts`

**Dependencies:** Task 9 (imports and helpers are already in place)

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/transaction.service.test.ts`:

```typescript
describe('updateTransaction with splits', () => {
  async function createSplitTx() {
    return createTransaction({
      date: '2026-03-27',
      description: 'Supermarket',
      type: 'expense' as const,
      amount: 500000,
      paymentMethod: 'Cash',
      splits: [
        { categoryId: 'cat-food', category: 'Food', amount: 300000 },
        { categoryId: 'cat-home', category: 'Household', amount: 200000 },
      ],
    });
  }

  it('updates split lines atomically (delete-then-recreate)', async () => {
    const created = await createSplitTx();
    const id = created.data!.id;

    const result = await updateTransaction(id, {
      splits: [
        { categoryId: 'cat-food', category: 'Food', amount: 100000 },
        { categoryId: 'cat-home', category: 'Household', amount: 200000 },
        { categoryId: 'cat-personal', category: 'Personal Care', amount: 200000 },
      ],
    });

    expect(result.error).toBeUndefined();
    expect(result.data!.splits).toHaveLength(3);
    expect(result.data!.splits![0].amount).toBe(100000);
  });

  it('reverts to single-category when splits: null + categoryId provided', async () => {
    const created = await createSplitTx();
    const id = created.data!.id;

    const result = await updateTransaction(id, {
      splits: null,
      category: 'Food',
      categoryId: 'cat-food',
    });

    expect(result.error).toBeUndefined();
    const tx = result.data!;
    expect(tx.isSplit).toBe(false);
    expect(tx.category).toBe('Food');
    expect(tx.splits).toBeUndefined();
  });

  it('returns CATEGORY_REQUIRED when reverting without categoryId', async () => {
    const created = await createSplitTx();
    const result = await updateTransaction(created.data!.id, { splits: null });
    expect(result.error?.code).toBe('CATEGORY_REQUIRED');
  });

  it('returns INVALID_SPLIT_COUNT when splits array has only 1 item', async () => {
    const created = await createSplitTx();
    const result = await updateTransaction(created.data!.id, {
      splits: [{ categoryId: 'cat-food', category: 'Food', amount: 500000 }],
    });
    expect(result.error?.code).toBe('INVALID_SPLIT_COUNT');
  });

  it('returns SPLIT_SUM_MISMATCH on update with wrong sum', async () => {
    const created = await createSplitTx();
    const result = await updateTransaction(created.data!.id, {
      splits: [
        { categoryId: 'cat-food', category: 'Food', amount: 100000 },
        { categoryId: 'cat-home', category: 'Household', amount: 100000 },
      ],
    });
    expect(result.error?.code).toBe('SPLIT_SUM_MISMATCH');
  });

  it('normal field update without splits key leaves splits unchanged', async () => {
    const created = await createSplitTx();
    const result = await updateTransaction(created.data!.id, { description: 'Updated Desc' });
    expect(result.error).toBeUndefined();
    expect(result.data!.description).toBe('Updated Desc');
    expect(result.data!.splits).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose src/__tests__/transaction.service.test.ts
```

Expected: FAIL — `updateTransaction` doesn't handle splits

- [ ] **Step 3: Replace `updateTransaction` in `src/server/services/transaction.service.ts`**

```typescript
export async function updateTransaction(
  id: string,
  body: unknown
): Promise<ServiceResult<Transaction>> {
  await ensureSeeded();

  const parsed = updateTransactionWithSplitsSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }

  const existing = await repo.findById(id);
  if (!existing) {
    return { error: { message: 'Transaction not found', code: 'NOT_FOUND' } };
  }

  const { splits, ...txFields } = parsed.data;
  const db = await (await import('@/server/db/client')).getDb();
  const splitRepo = createTransactionSplitRepository();

  // splits: null → revert to single category
  if (splits === null) {
    if (!txFields.categoryId && !existing.categoryId) {
      return { error: { message: 'categoryId is required when reverting a split', code: 'CATEGORY_REQUIRED' } };
    }
    if (!txFields.categoryId) {
      return { error: { message: 'categoryId is required when reverting a split', code: 'CATEGORY_REQUIRED' } };
    }
    await db.exec('BEGIN');
    try {
      await splitRepo.deleteSplits(id);
      const updated = await repo.update(id, { ...txFields, isSplit: false });
      await db.exec('COMMIT');
      return { data: updated! };
    } catch (err) {
      await db.exec('ROLLBACK');
      throw err;
    }
  }

  // splits: [...] → set/replace splits
  if (Array.isArray(splits)) {
    if (splits.length < 2) {
      return { error: { message: 'A split requires at least 2 lines', code: 'INVALID_SPLIT_COUNT' } };
    }
    for (const s of splits) {
      if (s.amount <= 0) {
        return { error: { message: 'Each split amount must be greater than zero', code: 'INVALID_SPLIT_AMOUNT' } };
      }
    }
    const total = txFields.amount ?? existing.amount;
    const splitSum = splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitSum - total) > 1) {
      return {
        error: {
          message: `Split amounts (${splitSum}) must equal transaction total (${total})`,
          code: 'SPLIT_SUM_MISMATCH',
        },
      };
    }
    await db.exec('BEGIN');
    try {
      await splitRepo.deleteSplits(id);
      await splitRepo.createSplits(id, splits as TransactionSplitInput[]);
      const updated = await repo.update(id, { ...txFields, category: '', categoryId: '', isSplit: true });
      await db.exec('COMMIT');
      return { data: { ...updated!, splits: await splitRepo.getSplitsByTransactionId(id) } };
    } catch (err) {
      await db.exec('ROLLBACK');
      throw err;
    }
  }

  // splits absent → normal field update, preserve existing split state
  const updated = await repo.update(id, txFields);
  if (!updated) return { error: { message: 'Transaction not found', code: 'NOT_FOUND' } };
  if (updated.isSplit) {
    return { data: { ...updated, splits: await splitRepo.getSplitsByTransactionId(id) } };
  }
  return { data: updated };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose src/__tests__/transaction.service.test.ts
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/server/services/transaction.service.ts src/__tests__/transaction.service.test.ts
git commit -m "feat: updateTransaction handles splits array, null revert, and normal field updates"
```

---

## Task 11: Report Service — Category Grouping Fix for Split Transactions

**Files:**
- Modify: `src/server/services/report.service.ts`
- Modify: `src/__tests__/report.service.test.ts`

**Dependencies:** Task 6 (split enrichment in repository)

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/report.service.test.ts` (append a new describe block):

```typescript
describe('getMonthlyReportData with split transactions', () => {
  it('uses split line amounts for category breakdown, not parent total', async () => {
    const db = await (await import('@/server/db/client')).getDb();
    const { createTransactionSplitRepository } =
      await import('@/server/repositories/transaction-split.repository');
    const splitRepo = createTransactionSplitRepository();

    const txId = 'tx-report-split';
    await db.query(
      'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, is_split) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [txId, '2026-03-15', 'Supermarket', '', '', 'expense', 500000, 'Cash', '', 1]
    );
    await splitRepo.createSplits(txId, [
      { categoryId: 'cat-food', category: 'Food', amount: 200000 },
      { categoryId: 'cat-home', category: 'Household', amount: 150000 },
      { categoryId: 'cat-personal', category: 'Personal Care', amount: 150000 },
    ]);

    const result = await getMonthlyReportData(2, 2026); // month=2 = March
    const data = result.data!;

    // Total expense = parent amount (authoritative)
    expect(data.totalExpense).toBe(500000);

    // Category breakdown uses split lines
    const food = data.expenseSummaryByCategory.find((c) => c.category === 'Food');
    const household = data.expenseSummaryByCategory.find((c) => c.category === 'Household');
    const personal = data.expenseSummaryByCategory.find((c) => c.category === 'Personal Care');

    expect(food?.total).toBe(200000);
    expect(household?.total).toBe(150000);
    expect(personal?.total).toBe(150000);

    // Empty-string parent category must NOT appear
    const emptyCategory = data.expenseSummaryByCategory.find((c) => c.category === '');
    expect(emptyCategory).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose src/__tests__/report.service.test.ts
```

Expected: FAIL — split parent with category='' appears in breakdown

- [ ] **Step 3: Update `src/server/services/report.service.ts`**

Replace the expense category grouping loop (around line 40–45):

```typescript
  // Group expenses by category — split-aware
  const categoryMap = new Map<string, number>();
  for (const tx of expenseTransactions) {
    if (tx.isSplit && tx.splits && tx.splits.length > 0) {
      for (const s of tx.splits) {
        if (s.category) {
          categoryMap.set(s.category, (categoryMap.get(s.category) ?? 0) + s.amount);
        }
      }
    } else if (!tx.isSplit && tx.category) {
      categoryMap.set(tx.category, (categoryMap.get(tx.category) ?? 0) + tx.amount);
    }
  }
```

Replace the income category grouping loop similarly:

```typescript
  const incomeCategoryMap = new Map<string, number>();
  for (const tx of incomeTransactions) {
    if (tx.isSplit && tx.splits && tx.splits.length > 0) {
      for (const s of tx.splits) {
        if (s.category) {
          incomeCategoryMap.set(s.category, (incomeCategoryMap.get(s.category) ?? 0) + s.amount);
        }
      }
    } else if (!tx.isSplit && tx.category) {
      incomeCategoryMap.set(tx.category, (incomeCategoryMap.get(tx.category) ?? 0) + tx.amount);
    }
  }
```

In `getAnnualReportData`, update the `catMap` and `expenseCatMap` loops similarly:

```typescript
  // Top categories (all types, top 10)
  const catMap = new Map<string, { total: number; type: 'income' | 'expense' }>();
  for (const tx of allYearResult.rows) {
    if (tx.isSplit && tx.splits && tx.splits.length > 0) {
      for (const s of tx.splits) {
        if (s.category) {
          const existing = catMap.get(s.category);
          if (existing) existing.total += s.amount;
          else catMap.set(s.category, { total: s.amount, type: tx.type });
        }
      }
    } else if (!tx.isSplit && tx.category) {
      const existing = catMap.get(tx.category);
      if (existing) existing.total += tx.amount;
      else catMap.set(tx.category, { total: tx.amount, type: tx.type });
    }
  }

  // Top expense categories (expense-only, top 5)
  const expenseCatMap = new Map<string, number>();
  for (const tx of allYearResult.rows) {
    if (tx.type === 'expense') {
      if (tx.isSplit && tx.splits && tx.splits.length > 0) {
        for (const s of tx.splits) {
          if (s.category) {
            expenseCatMap.set(s.category, (expenseCatMap.get(s.category) ?? 0) + s.amount);
          }
        }
      } else if (!tx.isSplit && tx.category) {
        expenseCatMap.set(tx.category, (expenseCatMap.get(tx.category) ?? 0) + tx.amount);
      }
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose src/__tests__/report.service.test.ts
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/server/services/report.service.ts src/__tests__/report.service.test.ts
git commit -m "feat: fix report service category grouping to use split lines for split transactions"
```

---

## Task 12: API Route — POST `/api/transactions` Accepts Splits

**Files:**
- Modify: `src/app/api/transactions/route.ts`

**Dependencies:** Task 9

- [ ] **Step 1: Write the failing test**

No new unit test (service is already tested). Verify behavior by running the full test suite and checking typecheck:

```bash
npm run typecheck
```

Expected: currently passes. After the change — still passes.

- [ ] **Step 2: Update `src/app/api/transactions/route.ts`**

Find the POST handler. The route currently calls `createTransaction(body)` from the service. Since the service now accepts `splits` in the body (via `createTransactionWithSplitsSchema`), no change to the service call is needed — it already handles the `splits` field.

Verify the route passes the raw body through:

```typescript
// In POST handler — should already look like:
const body = await request.json();
const result = await createTransaction(body);
```

If it passes body through, no change needed. If it filters fields, ensure `splits` is not stripped.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/api/transactions/route.ts
git commit -m "feat: POST /api/transactions passes splits field through to service"
```

---

## Task 13: API Route — PATCH `/api/transactions/[id]` Accepts `splits`

**Files:**
- Modify: `src/app/api/transactions/[id]/route.ts`

**Dependencies:** Task 10

- [ ] **Step 1: Inspect and update the PATCH route**

Same approach as Task 12 — the service's `updateTransaction` already handles the `splits` field. Verify the PATCH route passes the raw body through without stripping `splits`.

Read `src/app/api/transactions/[id]/route.ts` and confirm:

```typescript
// In PATCH handler — should be:
const body = await request.json();
const result = await updateTransaction(id, body);
```

If body is passed through, no change needed. If body is spread/filtered, ensure `splits` and `splits: null` are preserved.

- [ ] **Step 2: Run typecheck + full test suite**

```bash
npm run typecheck && npm test
```

Expected: all passing

- [ ] **Step 3: Commit**

```bash
git add src/app/api/transactions/[id]/route.ts
git commit -m "feat: PATCH /api/transactions/[id] passes splits field through to service"
```

---

## Task 14: SplitBadge Component

**Files:**
- Create: `src/components/transactions/SplitBadge.tsx`

**Dependencies:** Tasks 2, 4

- [ ] **Step 1: Write the failing test**

```bash
npm run typecheck
```

Expected: will fail once `SplitBadge` is imported in `TransactionTable` (Task 18). Writing the component first makes typecheck pass.

Create `src/components/transactions/SplitBadge.tsx` — the test is that `typecheck` passes after Task 18 imports it.

- [ ] **Step 2: Create `src/components/transactions/SplitBadge.tsx`**

```typescript
'use client';

import { PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

interface SplitBadgeProps {
  locale: Locale;
  className?: string;
}

export function SplitBadge({ locale, className }: SplitBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
        className
      )}
    >
      <PieChart className="h-2.5 w-2.5" />
      {t(locale, 'multipleCategoriesSplit')}
    </span>
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/components/transactions/SplitBadge.tsx
git commit -m "feat: add SplitBadge component with PieChart icon for multiple-category indicator"
```

---

## Task 15: SplitLineRow Component

**Files:**
- Create: `src/components/transactions/SplitLineRow.tsx`

**Dependencies:** Tasks 2, 4

- [ ] **Step 1: Create `src/components/transactions/SplitLineRow.tsx`**

```typescript
'use client';

import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Category, TransactionSplitInput } from '@/lib/types';
import { tapScale } from '@/lib/motion';

interface SplitLineRowProps {
  index: number;
  split: TransactionSplitInput;
  categories: Category[];
  transactionType: 'income' | 'expense';
  locale: Locale;
  onChange: (index: number, updated: TransactionSplitInput) => void;
  onRemove: (index: number) => void;
}

export function SplitLineRow({
  index,
  split,
  categories,
  transactionType,
  locale,
  onChange,
  onRemove,
}: SplitLineRowProps) {
  const filtered = categories.filter((c) => c.type === transactionType);

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const cat = categories.find((c) => c.id === e.target.value);
    onChange(index, {
      ...split,
      categoryId: cat?.id ?? null,
      category: cat?.name ?? '',
    });
  }

  function handleAmountBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value.replace(/[^\d.]/g, ''));
    onChange(index, { ...split, amount: isNaN(val) ? 0 : val });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="grid grid-cols-[2fr_2fr_1.5fr_auto] gap-2 items-center sm:grid-cols-[2fr_2fr_1.5fr_auto]
                 max-sm:grid-cols-1 max-sm:gap-1 max-sm:border-b max-sm:border-border max-sm:pb-3"
    >
      <select
        value={split.categoryId ?? ''}
        onChange={handleCategoryChange}
        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">{t(locale, 'category')}</option>
        {filtered.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <Input
        placeholder={t(locale, 'splitDescription')}
        value={split.description ?? ''}
        onChange={(e) => onChange(index, { ...split, description: e.target.value || null })}
        className="text-sm"
      />

      <Input
        type="text"
        inputMode="numeric"
        value={split.amount === 0 ? '' : split.amount.toLocaleString('id-ID')}
        onChange={(e) => {
          const val = parseFloat(e.target.value.replace(/[^\d]/g, ''));
          onChange(index, { ...split, amount: isNaN(val) ? 0 : val });
        }}
        onBlur={handleAmountBlur}
        className="text-right font-mono text-sm"
        placeholder="0"
      />

      <motion.button
        {...tapScale}
        type="button"
        onClick={() => onRemove(index)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Remove split line"
      >
        <X className="h-3.5 w-3.5" />
      </motion.button>
    </motion.div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/transactions/SplitLineRow.tsx
git commit -m "feat: add SplitLineRow component — category select, description, amount, remove"
```

---

## Task 16: SplitEditor Component

**Files:**
- Create: `src/components/transactions/SplitEditor.tsx`

**Dependencies:** Tasks 4, 15

- [ ] **Step 1: Create `src/components/transactions/SplitEditor.tsx`**

```typescript
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Plus, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Category, TransactionSplitInput } from '@/lib/types';
import { SplitLineRow } from './SplitLineRow';
import { fadeInUp, staggerList } from '@/lib/motion';

interface SplitEditorProps {
  splits: TransactionSplitInput[];
  totalAmount: number;
  categories: Category[];
  transactionType: 'income' | 'expense';
  locale: Locale;
  onChange: (splits: TransactionSplitInput[]) => void;
  onRemoveSplit: () => void;
}

export function SplitEditor({
  splits,
  totalAmount,
  categories,
  transactionType,
  locale,
  onChange,
  onRemoveSplit,
}: SplitEditorProps) {
  const allocated = splits.reduce((sum, s) => sum + s.amount, 0);
  const remaining = totalAmount - allocated;
  const isBalanced = Math.abs(remaining) <= 1;

  function handleChange(index: number, updated: TransactionSplitInput) {
    const next = splits.map((s, i) => (i === index ? updated : s));
    onChange(next);
  }

  function handleRemove(index: number) {
    onChange(splits.filter((_, i) => i !== index));
  }

  function handleAddLine() {
    onChange([...splits, { categoryId: null, category: '', amount: 0, description: null }]);
  }

  const remainingColor = isBalanced
    ? 'text-emerald-600 dark:text-emerald-400'
    : remaining < 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-amber-600 dark:text-amber-400';

  const fmt = (n: number) =>
    'Rp ' + Math.abs(n).toLocaleString('id-ID');

  return (
    <motion.div
      {...fadeInUp}
      className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-200 bg-blue-100 px-3 py-2 dark:border-blue-900 dark:bg-blue-900/40 rounded-t-xl">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
          <PieChart className="h-3 w-3" />
          {t(locale, 'splitAllocation')}
        </span>
        <button
          type="button"
          onClick={onRemoveSplit}
          className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
        >
          {t(locale, 'removeSplit')}
        </button>
      </div>

      {/* Lines */}
      <div className="space-y-2 p-3">
        <AnimatePresence initial={false}>
          {splits.map((split, i) => (
            <SplitLineRow
              key={i}
              index={i}
              split={split}
              categories={categories}
              transactionType={transactionType}
              locale={locale}
              onChange={handleChange}
              onRemove={handleRemove}
            />
          ))}
        </AnimatePresence>

        <button
          type="button"
          onClick={handleAddLine}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          <Plus className="h-3.5 w-3.5" />
          {t(locale, 'addSplit')}
        </button>

        {/* Running total */}
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs dark:border-blue-800 dark:bg-blue-950/50">
          <span className="text-muted-foreground">
            Total:{' '}
            <span className="font-mono font-semibold text-foreground">{fmt(totalAmount)}</span>
          </span>
          <span className="text-muted-foreground">
            Allocated:{' '}
            <span className="font-mono font-semibold text-foreground">{fmt(allocated)}</span>
          </span>
          <span className={cn('font-semibold', remainingColor)}>
            {t(locale, 'remainingAmount')}: {remaining === 0 ? '✓ 0' : fmt(remaining)}
          </span>
        </div>

        {splits.length === 1 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t(locale, 'totalMustMatch')} — add another line or remove the split.
          </p>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/transactions/SplitEditor.tsx
git commit -m "feat: add SplitEditor component with split lines, running total, and add/remove"
```

---

## Task 17: TransactionForm — Split Toggle + AlertDialog

**Files:**
- Modify: `src/components/transactions/TransactionForm.tsx`

**Dependencies:** Tasks 4, 16

- [ ] **Step 1: Read the current form structure**

Open `src/components/transactions/TransactionForm.tsx` to identify:
1. Where category `<select>` is rendered (between date and description)
2. Where to insert the split toggle button
3. The submit handler signature
4. Import section

- [ ] **Step 2: Add split state and imports**

Add to the imports at the top:

```typescript
import { useState } from 'react';
import { SplitEditor } from './SplitEditor';
import { SplitBadge } from './SplitBadge';
import type { TransactionSplitInput } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { t } from '@/lib/i18n';
```

Add split state inside the component (after existing state declarations):

```typescript
const [isSplitMode, setIsSplitMode] = useState<boolean>(
  initialData?.isSplit ?? false
);
const [splits, setSplits] = useState<TransactionSplitInput[]>(
  initialData?.splits?.map((s) => ({
    categoryId: s.categoryId,
    category: s.category,
    amount: s.amount,
    description: s.description,
  })) ?? []
);
```

- [ ] **Step 3: Add split toggle UI between category row and description**

After the category `<select>` closing tag and before the description `<Input>`, insert:

```typescript
{/* Split toggle */}
{!isSplitMode ? (
  <div className="flex justify-center border-y border-dashed border-border py-2">
    <button
      type="button"
      onClick={() => {
        setIsSplitMode(true);
        setSplits([
          {
            categoryId: form.categoryId || null,
            category: form.category || '',
            amount: form.amount ?? 0,
            description: null,
          },
          { categoryId: null, category: '', amount: 0, description: null },
        ]);
      }}
      className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
    >
      <PieChart className="h-3.5 w-3.5" />
      {t(locale, 'splitTransaction')}
    </button>
  </div>
) : (
  <AlertDialog>
    <SplitEditor
      splits={splits}
      totalAmount={form.amount ?? 0}
      categories={categories}
      transactionType={form.type}
      locale={locale}
      onChange={setSplits}
      onRemoveSplit={() => {/* trigger AlertDialog */}}
    />
  </AlertDialog>
)}
```

Note: Wire the `onRemoveSplit` to open the `AlertDialog`. The confirm action calls:

```typescript
() => {
  setIsSplitMode(false);
  setSplits([]);
}
```

- [ ] **Step 4: Update submit handler to include splits**

In the form submission, pass splits when `isSplitMode`:

```typescript
const payload = isSplitMode
  ? { ...formData, splits }
  : { ...formData };
```

Hide the category `<select>` row when `isSplitMode` is true:

```typescript
{!isSplitMode && (
  <div>
    {/* existing category select */}
  </div>
)}
```

Disable the Save button when split mode is active and splits are unbalanced:

```typescript
const splitUnbalanced =
  isSplitMode &&
  (splits.length < 2 || Math.abs(splits.reduce((s, x) => s + x.amount, 0) - (form.amount ?? 0)) > 1);

<Button type="submit" disabled={splitUnbalanced || isSubmitting}>
  {t(locale, 'save')}
</Button>
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/components/transactions/TransactionForm.tsx
git commit -m "feat: add split toggle and SplitEditor to TransactionForm with AlertDialog confirmation"
```

---

## Task 18: TransactionTable — Expandable Rows + SplitBadge

**Files:**
- Modify: `src/components/transactions/TransactionTable.tsx`

**Dependencies:** Tasks 14, 16

- [ ] **Step 1: Add expand state and imports**

Add to imports:

```typescript
import { ChevronRight } from 'lucide-react';
import { SplitBadge } from './SplitBadge';
import { AnimatePresence, motion } from 'framer-motion';
```

Add expand state inside the component:

```typescript
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

function toggleRow(id: string) {
  setExpandedRows((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}
```

- [ ] **Step 2: Update row rendering**

In the transaction row render, before the description column:

```typescript
{/* Expand chevron — only for split transactions */}
<div className="w-5 flex items-center justify-center">
  {tx.isSplit && (
    <button
      type="button"
      onClick={() => toggleRow(tx.id)}
      className="text-muted-foreground hover:text-foreground"
    >
      <ChevronRight
        className={cn('h-4 w-4 transition-transform', expandedRows.has(tx.id) && 'rotate-90')}
      />
    </button>
  )}
</div>
```

In the category column, render `SplitBadge` for split rows:

```typescript
{tx.isSplit ? (
  <SplitBadge locale={locale} />
) : (
  <CategoryChip category={tx.category} categoryId={tx.categoryId} />
)}
```

Update the row subtitle to show split count:

```typescript
<span className="text-xs text-muted-foreground">
  {tx.paymentMethod}
  {tx.isSplit && tx.splits && ` · ${tx.splits.length} ${t(locale, 'categories')}`}
</span>
```

- [ ] **Step 3: Add the expanded split detail panel**

After each transaction row, conditionally render the split detail:

```typescript
<AnimatePresence>
  {tx.isSplit && expandedRows.has(tx.id) && tx.splits && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="border-b border-border bg-muted/30 pl-10 pr-4"
    >
      <div className="border-l-2 border-blue-200 py-2 pl-4 dark:border-blue-800">
        {tx.splits.map((split, i) => (
          <div
            key={split.id}
            className="flex items-center justify-between py-1 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <CategoryChip category={split.category} categoryId={split.categoryId ?? ''} />
              {split.description && (
                <span className="text-xs">{split.description}</span>
              )}
            </div>
            <span className="font-mono text-xs">
              {split.amount.toLocaleString('id-ID')}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/components/transactions/TransactionTable.tsx
git commit -m "feat: add expandable split rows and SplitBadge to TransactionTable"
```

---

## Task 19: Export — CSV `expandSplits` Option + ExportOptions Checkbox

**Files:**
- Modify: `src/lib/export-utils.ts`
- Modify: `src/components/export/ExportOptions.tsx`

**Dependencies:** Tasks 2, 6

- [ ] **Step 1: Write the failing test**

No new service test needed. Verify with typecheck:

```bash
npm run typecheck
```

- [ ] **Step 2: Update `exportCSV` in `src/lib/export-utils.ts`**

Update the `exportCSV` function signature to accept `expandSplits`:

```typescript
export function exportCSV(
  transactions: Transaction[],
  filename: string,
  scopeLabel: string,
  totalIncome: number,
  totalExpense: number,
  totalAssets: number,
  expandSplits = false
): void {
```

Replace the `rows` construction:

```typescript
  const rows: string[] = [];

  for (const tx of transactions) {
    if (expandSplits && tx.isSplit && tx.splits && tx.splits.length > 0) {
      // Expand: one row per split line, parent row omitted
      for (const s of tx.splits) {
        const desc = s.description
          ? `${tx.description} — ${s.description}`
          : tx.description;
        rows.push(
          `${formatDateID(tx.date)},"${desc.replace(/"/g, '""')}","${s.category}",${tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'},"${fmtAmount(s.amount)}","${tx.paymentMethod}","${(tx.notes || '').replace(/"/g, '""')}"`
        );
      }
    } else {
      // Collapsed (default): one row, category blank for split transactions
      const category = tx.isSplit ? '' : tx.category;
      rows.push(
        `${formatDateID(tx.date)},"${tx.description.replace(/"/g, '""')}","${category}",${tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'},"${fmtAmount(tx.amount)}","${tx.paymentMethod}","${(tx.notes || '').replace(/"/g, '""')}"`
      );
    }
  }
```

- [ ] **Step 3: Add "Expand split transactions" checkbox to `ExportOptions`**

In `src/components/export/ExportOptions.tsx`, find where format-specific options are rendered (or where the format selector is). Add the checkbox when CSV is selected:

```typescript
{format === 'csv' && (
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      id="expand-splits"
      checked={expandSplits}
      onChange={(e) => onExpandSplitsChange(e.target.checked)}
      className="rounded"
    />
    <label htmlFor="expand-splits" className="text-sm text-muted-foreground cursor-pointer">
      {t(locale, 'expandSplits')}
    </label>
  </div>
)}
```

Add `expandSplits: boolean` and `onExpandSplitsChange: (v: boolean) => void` to the component's props interface. Pass these down from the export page and forward to `exportCSV`.

- [ ] **Step 4: Run typecheck + full test suite**

```bash
npm run typecheck && npm test
```

Expected: 0 type errors, all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/export-utils.ts src/components/export/ExportOptions.tsx
git commit -m "feat: CSV export supports expandSplits option — expand split lines or collapse to one row"
```

---

## Task 20: Final Verification — Preflight

**Files:** None (verification only)

**Dependencies:** All tasks complete

- [ ] **Step 1: Run full test suite**

```bash
cd .worktrees/transaction-split
npm test
```

Expected: All tests pass (448 baseline + ~35 new tests)

- [ ] **Step 2: Run preflight**

```bash
npm run preflight
```

Expected: typecheck ✓, lint ✓, format ✓, build ✓

- [ ] **Step 3: Manual smoke test** (start dev server, open browser)

```bash
npm run dev
```

- Navigate to `/transactions/new` — verify split toggle appears between Category and Notes
- Create a Rp 500.000 expense, split into 3 categories summing to 500.000
- Save → verify transaction list shows one row with PieChart "Multiple" badge
- Expand the row → verify 3 split lines with correct amounts
- Navigate to Dashboard → verify category breakdown shows split amounts (not 500.000 in "")
- Navigate to `/budget` → verify budget progress uses split amounts
- Navigate to `/export` → select CSV → verify "Expand split transactions" checkbox appears
- Export collapsed and expanded → verify row counts

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete transaction split implementation — all tasks done"
```

---

## Parallel Execution Map

```
Parallel Group 1 (no dependencies — start all 4 simultaneously):
  Task 1: DB Schema
  Task 2: TypeScript Types
  Task 3: Zod Validation
  Task 4: i18n Keys

Sequential barrier: wait for Tasks 1 + 2 to complete

Parallel Group 2 (depend on 1 + 2):
  Task 5: TransactionSplit Repository
  Task 6: Transaction Repository Enrichment

Sequential barrier: wait for Tasks 5 + 6 to complete

Parallel Group 3 (mixed dependencies, can run in parallel):
  Task 7: Category Service Delete Guard  (needs Task 5)
  Task 8: categoryTotals split-aware    (needs Task 6)
  Task 9: createTransaction split path  (needs Tasks 3, 5, 6)
  Task 14: SplitBadge component         (needs Tasks 2, 4)
  Task 15: SplitLineRow component       (needs Tasks 2, 4)

Sequential after Task 9:
  Task 10: updateTransaction split path (needs Task 9)

Sequential after Task 6:
  Task 11: Report Service fix           (needs Task 6)

Parallel Group 4 (after Tasks 9 + 10):
  Task 12: POST route                   (needs Task 9)
  Task 13: PATCH route                  (needs Task 10)

Sequential after Task 15:
  Task 16: SplitEditor                  (needs Task 15)

Parallel Group 5 (after Task 16):
  Task 17: TransactionForm              (needs Tasks 4, 16)
  Task 18: TransactionTable             (needs Tasks 14, 16)

Parallel Group 6 (after Tasks 2, 6):
  Task 19: Export CSV + ExportOptions   (needs Tasks 2, 6)

Sequential — final:
  Task 20: Preflight verification       (needs all tasks)
```

**Fastest critical path:** 1 → 2 → 5/6 → 9 → 10 → 12/13 → 20 (8 sequential steps)
