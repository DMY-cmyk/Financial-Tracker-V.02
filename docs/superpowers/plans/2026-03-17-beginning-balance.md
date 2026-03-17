# Beginning Balance (Saldo Awal) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `beginning_balance` column to `payment_methods` so the balance formula becomes `beginning_balance + income − expense`, with Saldo Awal settable at create time and editable via a new edit dialog in Settings.

**Architecture:** Additive DB migration (new column, DEFAULT 0) → types / repository / validation / balance SQL changes propagate upward → UI in Settings page. All changes are backward-compatible; existing payment methods silently default to 0.

**Tech Stack:** SQLite/Postgres (better-sqlite3 dev, Neon prod), Zod v4, Vitest, Next.js App Router, shadcn/ui Dialog.

**File change summary:**

| File | Change |
|------|--------|
| `src/__tests__/balance.service.test.ts` | 4 new tests |
| `src/__tests__/payment-method.service.test.ts` | 4 new tests (2 describe blocks) |
| `src/server/db/client.ts` | DDL column + migration entry |
| `src/lib/types.ts` | `beginningBalance: number` on `PaymentMethod` |
| `src/server/repositories/payment-method.repository.ts` | `PmRow`, `rowToPm`, `create`, `update` |
| `src/lib/api/validation.ts` | `beginningBalance` in create (default 0) + update (optional) schemas |
| `src/server/services/balance.service.ts` | `BalanceRow` + SQL query |
| `src/lib/i18n.ts` | `beginningBalance` key (EN + ID) |
| `src/app/settings/categories/page.tsx` | Create form field + edit Dialog |

**No changes needed to:** `src/app/api/payment-methods/route.ts`, `src/app/api/payment-methods/[id]/route.ts`, `src/lib/api/client.ts` — the route handlers already forward the full parsed body, and the API client types propagate automatically when `PaymentMethod` in `types.ts` gains the new field.

---

## Chunk 1: Data Layer

### Task 1: Write 4 failing balance service tests

**Files:**
- Modify: `src/__tests__/balance.service.test.ts`

- [ ] **Step 1: Add 4 new tests inside the `describe('listPaymentMethodBalances', ...)` block**

Append these 4 `it()` blocks before the closing `});` of the describe block (after line 115 of the current file):

```typescript
  it('balance equals beginning_balance when no transactions exist', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank', beginningBalance: 500000 });
    const result = await listPaymentMethodBalances();
    expect(result.error).toBeUndefined();
    expect(result.data![0].balance).toBe(500000);
  });

  it('balance = beginning_balance + income − expense', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank', beginningBalance: 1000000 });
    await createTransaction({
      date: '2026-01-10',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 3000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-20',
      description: 'Food',
      category: 'Food',
      categoryId: 'c2',
      type: 'expense',
      amount: 500000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    const result = await listPaymentMethodBalances();
    // 1,000,000 + 3,000,000 - 500,000 = 3,500,000
    expect(result.data![0].balance).toBe(3500000);
  });

  it('negative beginning_balance is reflected in balance', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank', beginningBalance: -200000 });
    const result = await listPaymentMethodBalances();
    expect(result.data![0].balance).toBe(-200000);
  });

  it('beginning_balance of 0 preserves income minus expense behavior', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' }); // no beginningBalance → defaults to 0
    await createTransaction({
      date: '2026-01-10',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 2000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-20',
      description: 'Food',
      category: 'Food',
      categoryId: 'c2',
      type: 'expense',
      amount: 500000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    const result = await listPaymentMethodBalances();
    // 0 + 2,000,000 - 500,000 = 1,500,000
    expect(result.data![0].balance).toBe(1500000);
  });
```

Note: `createPaymentMethod` takes `body: unknown`, so passing `beginningBalance: 500000` compiles fine even before types.ts is updated. The tests fail at RUNTIME because the current SQL ignores `beginning_balance`.

- [ ] **Step 2: Run tests → verify they fail**

```bash
npx vitest run src/__tests__/balance.service.test.ts
```

Expected: The 4 new tests FAIL — `balance` will be 0 instead of `beginning_balance` value (SQL doesn't include the column yet). The 4th test ("beginning_balance of 0") may pass since 0 + income - expense = income - expense.

---

### Task 2: Write 4 failing PM service tests

**Files:**
- Modify: `src/__tests__/payment-method.service.test.ts`

- [ ] **Step 1: Append 2 new describe blocks at the bottom of the file (after line 137)**

```typescript
describe('createPaymentMethod with beginningBalance', () => {
  it('stores beginningBalance correctly', async () => {
    const result = await createPaymentMethod({
      name: 'Bank BCA',
      icon: 'building',
      type: 'bank',
      beginningBalance: 250000,
    });
    expect(result.error).toBeUndefined();
    expect(result.data!.beginningBalance).toBe(250000);
  });

  it('defaults beginningBalance to 0 when not provided', async () => {
    const result = await createPaymentMethod({ name: 'Cash', type: 'cash' });
    expect(result.error).toBeUndefined();
    expect(result.data!.beginningBalance).toBe(0);
  });
});

describe('updatePaymentMethod with beginningBalance', () => {
  it('updates beginningBalance', async () => {
    const created = await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    const result = await updatePaymentMethod(created.data!.id, { beginningBalance: 500000 });
    expect(result.error).toBeUndefined();
    expect(result.data!.beginningBalance).toBe(500000);
  });

  it('leaves beginningBalance unchanged when not provided in update', async () => {
    const created = await createPaymentMethod({
      name: 'Bank BCA',
      icon: 'building',
      type: 'bank',
      beginningBalance: 100000,
    });
    const result = await updatePaymentMethod(created.data!.id, { name: 'Bank Mandiri' });
    expect(result.error).toBeUndefined();
    expect(result.data!.beginningBalance).toBe(100000);
  });
});
```

- [ ] **Step 2: Run tests → verify they fail**

```bash
npx vitest run src/__tests__/payment-method.service.test.ts
```

Expected: The 4 new tests FAIL with TypeScript errors (`result.data!.beginningBalance` — field does not exist on `PaymentMethod`) or runtime assertion failures. Both are valid TDD failure states.

---

### Task 3: DB schema + PaymentMethod type

**Files:**
- Modify: `src/server/db/client.ts:81-87` (payment_methods DDL)
- Modify: `src/server/db/client.ts:163-169` (columnMigrations array)
- Modify: `src/lib/types.ts:22-27` (PaymentMethod interface)

- [ ] **Step 1: Add `beginning_balance` column to the `payment_methods` DDL in `src/server/db/client.ts`**

Find the `CREATE TABLE IF NOT EXISTS payment_methods` block (lines 81–87). Replace it:

```typescript
    `CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'wallet',
      type TEXT NOT NULL,
      beginning_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    )`,
```

- [ ] **Step 2: Add migration entry to `columnMigrations` in `src/server/db/client.ts`**

In the `columnMigrations` array (lines 163–169), add one entry at the end of the array (before `];`):

```typescript
    `ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS beginning_balance DOUBLE PRECISION NOT NULL DEFAULT 0`,
```

Full array after edit:

```typescript
  const columnMigrations = [
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE recurring_transactions ADD COLUMN IF NOT EXISTS category_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'circle'`,
    `ALTER TABLE categories ADD COLUMN IF NOT EXISTS budget DOUBLE PRECISION DEFAULT 0`,
    `ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'wallet'`,
    `ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS beginning_balance DOUBLE PRECISION NOT NULL DEFAULT 0`,
  ];
```

The existing `try/catch` in the loop handles both Postgres (which supports `IF NOT EXISTS` natively) and SQLite (which does NOT — the catch silences the duplicate-column error when the column already exists).

- [ ] **Step 3: Add `beginningBalance: number` to `PaymentMethod` in `src/lib/types.ts`**

Replace lines 22–27:

```typescript
export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  type: 'bank' | 'cash' | 'ewallet';
  beginningBalance: number;
}
```

- [ ] **Step 4: Run TypeScript to confirm TS errors shift as expected**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: TypeScript will now report errors in repository and any call sites that construct a `PaymentMethod` without `beginningBalance`. This is the correct state — the errors tell us exactly what still needs to change. If the errors are only in `payment-method.repository.ts`, proceed to Task 4.

---

### Task 4: Repository + validation schemas

**Files:**
- Modify: `src/server/repositories/payment-method.repository.ts`
- Modify: `src/lib/api/validation.ts`

- [ ] **Step 1: Update `PmRow` interface in `src/server/repositories/payment-method.repository.ts`**

Replace lines 5–10 (`interface PmRow`):

```typescript
interface PmRow {
  id: string;
  name: string;
  icon: string;
  type: string;
  beginning_balance: number;
}
```

- [ ] **Step 2: Update `rowToPm()` to map `beginning_balance`**

Replace lines 12–19 (`function rowToPm`):

```typescript
function rowToPm(row: PmRow): PaymentMethod {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    type: row.type as 'bank' | 'cash' | 'ewallet',
    beginningBalance: Number(row.beginning_balance),
  };
}
```

- [ ] **Step 3: Update `create()` to include `beginning_balance` in INSERT**

Replace the existing `create()` method (lines 35–45):

```typescript
    async create(data: Omit<PaymentMethod, 'id'>): Promise<PaymentMethod> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        'INSERT INTO payment_methods (id, name, icon, type, beginning_balance) VALUES (?, ?, ?, ?, ?)',
        [id, data.name, data.icon, data.type, data.beginningBalance ?? 0]
      );
      return { ...data, id, beginningBalance: data.beginningBalance ?? 0 };
    },
```

Note: The explicit `beginningBalance: data.beginningBalance ?? 0` in the return is important — without it, spreading `...data` might not include the field if it came in as `undefined`.

- [ ] **Step 4: Update `update()` to include `beginning_balance` in SET**

Replace the existing `update()` method (lines 47–59):

```typescript
    async update(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
      const db = await getDb();
      const existing = await db.query<PmRow>('SELECT * FROM payment_methods WHERE id = ?', [id]);
      if (!existing.rows[0]) return undefined;
      const updated = { ...rowToPm(existing.rows[0]), ...data };
      await db.query(
        'UPDATE payment_methods SET name=?, icon=?, type=?, beginning_balance=? WHERE id=?',
        [updated.name, updated.icon, updated.type, updated.beginningBalance ?? 0, id]
      );
      return updated;
    },
```

The spread `{ ...rowToPm(existing.rows[0]), ...data }` ensures that when `data.beginningBalance` is `undefined` (not provided in PATCH), the existing value is preserved.

- [ ] **Step 5: Update `createPaymentMethodSchema` in `src/lib/api/validation.ts`**

Replace the existing `createPaymentMethodSchema` (lines 58–62):

```typescript
export const createPaymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  icon: z.string().max(50).optional().default('wallet'),
  type: z.enum(['bank', 'cash', 'ewallet']),
  beginningBalance: z.number().default(0),
});
```

- [ ] **Step 6: Replace `updatePaymentMethodSchema` with an explicit object schema**

Replace line 64 (`export const updatePaymentMethodSchema = createPaymentMethodSchema.partial();`):

```typescript
export const updatePaymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  icon: z.string().max(50).optional(),
  type: z.enum(['bank', 'cash', 'ewallet']).optional(),
  beginningBalance: z.number().optional(),
});
```

**Why not `.partial()`:** `createPaymentMethodSchema` now has `beginningBalance: z.number().default(0)`. After `.partial()`, that becomes `optional().default(0)` — Zod would fill `0` when `beginningBalance` is absent in a PATCH body. This would silently reset any existing `beginning_balance` to 0. Defining the schema explicitly ensures `beginningBalance` is truly optional (no default), so absent = don't change.

- [ ] **Step 7: Run PM service tests → all 4 new tests pass**

```bash
npx vitest run src/__tests__/payment-method.service.test.ts
```

Expected: All existing tests (12) + all 4 new tests PASS = 16 total.

Note: `src/server/services/payment-method.service.ts` needs **no changes** — the service is a validation pass-through that calls `repo.create(parsed.data)` / `repo.update(id, parsed.data)`. Once the Zod schemas include `beginningBalance`, `parsed.data` automatically carries it to the repository.

- [ ] **Step 8: Commit**

```bash
git add src/server/db/client.ts src/lib/types.ts src/server/repositories/payment-method.repository.ts src/lib/api/validation.ts src/__tests__/payment-method.service.test.ts
git commit -m "feat: add beginningBalance to PaymentMethod — DB, types, repo, validation, tests"
```

---

### Task 5: Balance service SQL

**Files:**
- Modify: `src/server/services/balance.service.ts`

- [ ] **Step 1: Add `beginning_balance` to `BalanceRow`**

Replace the existing `BalanceRow` interface (lines 10–18):

```typescript
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
```

- [ ] **Step 2: Replace the SQL query**

Replace the `db.query<BalanceRow>(...)` call and template literal (lines 24–38):

```typescript
  const { rows } = await db.query<BalanceRow>(`
    SELECT
      pm.id,
      pm.name,
      pm.type,
      pm.icon,
      pm.beginning_balance,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense,
      pm.beginning_balance +
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount
                          WHEN t.type = 'expense' THEN -t.amount ELSE 0 END), 0) AS balance
    FROM payment_methods pm
    LEFT JOIN transactions t ON t.payment_method = pm.name
    GROUP BY pm.id, pm.name, pm.type, pm.icon, pm.beginning_balance
    ORDER BY balance DESC
  `);
```

Key changes vs. current SQL:
- Added `pm.beginning_balance` to SELECT
- `balance` expression now starts with `pm.beginning_balance +` (previously just `COALESCE(...)`)
- `GROUP BY` now includes `pm.beginning_balance` (required because it's in SELECT)
- `income` and `expense` aggregates are unchanged — they still reflect total transactions only

- [ ] **Step 3: Run balance service tests → all 4 new tests pass**

```bash
npx vitest run src/__tests__/balance.service.test.ts
```

Expected: All existing tests (5) + all 4 new tests PASS = 9 total.

- [ ] **Step 4: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass. Zero failures.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/balance.service.ts src/__tests__/balance.service.test.ts
git commit -m "feat: include beginning_balance in balance SQL calculation + tests"
```

---

## Chunk 2: i18n + UI

### Task 6: Add i18n translation key

**Files:**
- Modify: `src/lib/i18n.ts`

The file has three sections to update: the `TranslationKeys` type definition, the `en:` translations object, and the `id:` translations object.

- [ ] **Step 1: Add `beginningBalance: string` to the `TranslationKeys` type**

Find the Settings section in the type definition (around line 82). Add `beginningBalance` after `categoriesDesc` (which is near line 231):

```typescript
  // Payment method
  beginningBalance: string;
```

- [ ] **Step 2: Add to the English translations object**

Find `categoriesDesc` in the `en:` object (it will be around the 230s in the `en:` block). Add after it:

```typescript
    beginningBalance: 'Beginning Balance',
```

- [ ] **Step 3: Add to the Indonesian translations object**

Find `categoriesDesc` in the `id:` object. Add after it:

```typescript
    beginningBalance: 'Saldo Awal',
```

- [ ] **Step 4: Run typecheck → no errors**

```bash
npx tsc --noEmit
```

Expected: Clean. TypeScript enforces that all `TranslationKeys` fields are present in both `en` and `id` objects — the build will fail if either is missing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat: add beginningBalance i18n key (EN: Beginning Balance, ID: Saldo Awal)"
```

---

### Task 7: Settings page — create form field + edit Dialog

**Files:**
- Modify: `src/app/settings/categories/page.tsx`

This task adds:
1. A "Beginning Balance" field in the existing create form
2. A Pencil (edit) button per payment method row
3. A new shadcn/ui `Dialog` for editing name, type, and beginning balance

- [ ] **Step 1: Add `Pencil` to the lucide-react imports**

Find the existing lucide-react import (lines 13–38). Add `Pencil` to the destructured list:

```typescript
import {
  Plus,
  Trash2,
  Loader2,
  GripVertical,
  ShoppingCart,
  Coffee,
  Car,
  Home,
  Zap,
  Heart,
  Music,
  Gamepad2,
  GraduationCap,
  Briefcase,
  Gift,
  Utensils,
  Shirt,
  Phone,
  Plane,
  Stethoscope,
  Dumbbell,
  BookOpen,
  Palette,
  Wrench,
  Circle,
  Pencil,
} from 'lucide-react';
```

- [ ] **Step 2: Add Dialog imports**

After the existing `import { Button } from '@/components/ui/button';` line, add:

```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
```

- [ ] **Step 3: Add state for the create form's beginning balance**

After `const [addingMethod, setAddingMethod] = useState(false);` (line 91), add:

```typescript
  const [newMethodBeginningBalance, setNewMethodBeginningBalance] = useState('');
```

- [ ] **Step 4: Add state for the edit dialog**

After the line from Step 3, add:

```typescript
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'bank' | 'cash' | 'ewallet'>('bank');
  const [editBeginningBalance, setEditBeginningBalance] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
```

- [ ] **Step 5: Update `handleAddMethod` to pass `beginningBalance`**

Replace the existing `handleAddMethod` function (lines 191–207):

```typescript
  const handleAddMethod = async () => {
    if (!newMethodName) return;
    setAddingMethod(true);
    const result = await api.paymentMethods.create({
      name: newMethodName,
      icon: 'wallet',
      type: newMethodType,
      beginningBalance: parseCurrencyInput(newMethodBeginningBalance),
    });
    if (result.data) {
      setPaymentMethods((prev) => [...prev, result.data!]);
      setNewMethodName('');
      setNewMethodBeginningBalance('');
      toast.success(t(locale, 'saved'));
    } else {
      toast.error(result.error?.message || t(locale, 'failedSave'));
    }
    setAddingMethod(false);
  };
```

- [ ] **Step 6: Add `handleOpenEdit` and `handleEditSave` functions**

After `handleDeleteMethod` (after line 216), add two new handlers:

```typescript
  const handleOpenEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setEditName(method.name);
    setEditType(method.type);
    setEditBeginningBalance(
      method.beginningBalance > 0 ? formatCurrencyInput(method.beginningBalance) : ''
    );
  };

  const handleEditSave = async () => {
    if (!editingMethod) return;
    setSavingEdit(true);
    const result = await api.paymentMethods.update(editingMethod.id, {
      name: editName,
      type: editType,
      beginningBalance: parseCurrencyInput(editBeginningBalance),
    });
    if (result.data) {
      setPaymentMethods((prev) =>
        prev.map((m) => (m.id === editingMethod.id ? result.data! : m))
      );
      setEditingMethod(null);
      toast.success(t(locale, 'saved'));
    } else {
      toast.error(result.error?.message || t(locale, 'failedSave'));
    }
    setSavingEdit(false);
  };
```

- [ ] **Step 7: Add Pencil button to each payment method row**

Replace the existing payment method list map (lines 403–419) to add a Pencil button before the Trash2 button:

```typescript
          {paymentMethods.map((m) => (
            <div key={m.id} className="hover:bg-muted/50 flex items-center gap-2 rounded-lg p-2">
              <span className="flex-1 text-sm">{m.name}</span>
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px]">
                {m.type}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleOpenEdit(m)}
                aria-label={t(locale, 'edit')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive h-7 w-7"
                onClick={() => handleDeleteMethod(m.id)}
                aria-label={t(locale, 'delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
```

- [ ] **Step 8: Add Beginning Balance field to the create form**

Replace the existing create form div (lines 421–446) to include the Beginning Balance field. Note: the outer div also gains `flex-wrap` to allow the new field to wrap on small screens:

```typescript
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <Input
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              placeholder={t(locale, 'methodName')}
            />
          </div>
          <select
            value={newMethodType}
            onChange={(e) => setNewMethodType(e.target.value as 'bank' | 'cash' | 'ewallet')}
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
          >
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
            <option value="ewallet">E-Wallet</option>
          </select>
          <div className="w-36">
            <label className="text-muted-foreground mb-1 block text-xs">
              {t(locale, 'beginningBalance')}
            </label>
            <Input
              value={newMethodBeginningBalance}
              onChange={(e) => setNewMethodBeginningBalance(e.target.value)}
              placeholder="0"
              className="font-mono"
            />
          </div>
          <Button onClick={handleAddMethod} className="gap-1" disabled={addingMethod}>
            {addingMethod ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t(locale, 'add')}
          </Button>
        </div>
```

- [ ] **Step 9: Add edit Dialog before closing `</PageTransition>`**

Just before `</PageTransition>` at the bottom of the JSX, insert:

```typescript
      {/* Edit Payment Method Dialog */}
      <Dialog
        open={!!editingMethod}
        onOpenChange={(open) => {
          if (!open) setEditingMethod(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t(locale, 'edit')} {editingMethod?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                {t(locale, 'name')}
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t(locale, 'methodName')}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                {t(locale, 'type')}
              </label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as 'bank' | 'cash' | 'ewallet')}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
                <option value="ewallet">E-Wallet</option>
              </select>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                {t(locale, 'beginningBalance')}
              </label>
              <Input
                value={editBeginningBalance}
                onChange={(e) => setEditBeginningBalance(e.target.value)}
                placeholder="0"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMethod(null)}>
              {t(locale, 'cancel')}
            </Button>
            <Button onClick={handleEditSave} disabled={savingEdit || !editName}>
              {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t(locale, 'save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 10: Run full preflight**

```bash
npm run preflight
```

Expected: All checks pass — format, typecheck, lint, build. Zero errors.

- [ ] **Step 11: Commit**

```bash
git add src/app/settings/categories/page.tsx
git commit -m "feat: add Saldo Awal field to create form + edit dialog for payment methods"
```
