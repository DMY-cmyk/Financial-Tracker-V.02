# Beginning Balance (Saldo Awal) — Design Spec

**Date:** 2026-03-17
**Status:** Approved

## Goal

Add a per-payment-method starting balance (Saldo Awal) so that the displayed balance reflects real-world account state: `balance = beginning_balance + income − expense`.

## Background

Currently the balance for each payment method is calculated purely as `income − expense` from all recorded transactions. This is incorrect for accounts that had a balance before the user started tracking — a bank account with Rp 5,000,000 before any transactions were recorded would show Rp 0 until income transactions are added.

## Scope

- Add `beginning_balance` column to the `payment_methods` table
- Update balance calculation to include it
- Add Saldo Awal field to payment method create form and edit dialog in Settings
- Default to 0 for all existing payment methods (no data loss)
- Balance card display is unchanged — the corrected number is shown silently

**Out of scope:** per-date balance snapshots, showing Saldo Awal on the dashboard card, down-migration scripts (deferred).

---

## Section 1: Data Layer

### Schema (`src/server/db/client.ts` — `initializeSchema` function)

Two changes inside `initializeSchema`:

**1.** Add the column to the `CREATE TABLE IF NOT EXISTS payment_methods` DDL:
```sql
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'wallet',
  type TEXT NOT NULL,
  beginning_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
)
```

`DOUBLE PRECISION` matches the type used for all monetary columns throughout the schema (see `transactions.amount`, `categories.budget`, `savings_goals.target_amount`).

**2.** Add one entry to the `columnMigrations` array (for existing databases):
```typescript
`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS beginning_balance DOUBLE PRECISION NOT NULL DEFAULT 0`,
```

The existing `try/catch` loop around `columnMigrations` already handles SQLite (which does NOT support `IF NOT EXISTS` on `ALTER TABLE` — the `try/catch` silences the error when the column already exists) and Postgres (which supports `IF NOT EXISTS` natively) — no additional migration guard is needed.

### Repository (`src/server/repositories/payment-method.repository.ts`)

**`PmRow` interface** gains the new column:
```typescript
interface PmRow {
  id: string;
  name: string;
  icon: string;
  type: string;
  beginning_balance: number;
}
```

**`rowToPm()`** maps it:
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

**`create()`** includes `beginning_balance` in INSERT and returns the explicit value:
```typescript
async create(data: Omit<PaymentMethod, 'id'>): Promise<PaymentMethod> {
  const id = nanoid();
  const db = await getDb();
  await db.query(
    'INSERT INTO payment_methods (id, name, icon, type, beginning_balance) VALUES (?, ?, ?, ?, ?)',
    [id, data.name, data.icon, data.type, data.beginningBalance ?? 0]
  );
  return { ...data, id, beginningBalance: data.beginningBalance ?? 0 };
}
```

**`update()`** includes `beginning_balance` in SET:
```typescript
async update(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
  // ... fetch existing row into `updated` via spread ...
  await db.query(
    'UPDATE payment_methods SET name=?, icon=?, type=?, beginning_balance=? WHERE id=?',
    [updated.name, updated.icon, updated.type, updated.beginningBalance ?? 0, id]
  );
  return updated;
}
```

**`findAll()` and `findById()`** use `SELECT *` — `beginning_balance` is automatically included via `rowToPm()`.

### Payment Method Service (`src/server/services/payment-method.service.ts`)

- `createPaymentMethod({ name, icon, type, beginningBalance? })` — calls `ensureSeeded()`, forwards `beginningBalance` to repository
- `updatePaymentMethod(id, { name?, icon?, type?, beginningBalance? })` — calls `ensureSeeded()`, forwards `beginningBalance` to repository
- Both return `ServiceResult<PaymentMethod>` (unchanged)

### Balance Service (`src/server/services/balance.service.ts`)

**`BalanceRow`** gains `beginning_balance`:
```typescript
interface BalanceRow {
  id: string;
  name: string;
  type: string;
  icon: string;
  income: number;
  expense: number;
  balance: number;
  beginning_balance: number;
}
```

The `balance` expression in the SQL query changes to include `pm.beginning_balance`. Full revised query:
```sql
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
```

Note: `pm.beginning_balance` is added to the `GROUP BY` clause. `income` and `expense` fields are unaffected.

---

## Section 2: API Layer

### Types (`src/lib/types.ts`)

`PaymentMethod` gains `beginningBalance`:
```typescript
export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  type: 'bank' | 'cash' | 'ewallet';
  beginningBalance: number;
}
```

This is the canonical definition. `contracts.ts` re-exports or references it from here — no separate change needed in `contracts.ts` for `PaymentMethod`.

`PaymentMethodBalance` in `contracts.ts` does **not** gain `beginningBalance` — the dashboard card only displays the calculated net balance; no UI consumes the raw starting value from the balances endpoint.

### Validation (`src/lib/api/validation.ts`)

The two schemas are updated separately:

```typescript
// Create: default to 0 when omitted
CreatePaymentMethodSchema: {
  ...existing fields...,
  beginningBalance: z.number().default(0),
}

// Update: entirely optional (PATCH semantics)
UpdatePaymentMethodSchema: {
  ...existing fields...,
  beginningBalance: z.number().optional(),
}
```

No `min(0)` constraint — accounts can legitimately start negative (e.g. an overdrawn account). The inferred types `CreatePaymentMethodInput` and `UpdatePaymentMethodInput` update automatically.

### API Routes

- `POST /api/payment-methods` (`src/app/api/payment-methods/route.ts`) — passes `beginningBalance` from validated body to `createPaymentMethod()`
- `PATCH /api/payment-methods/[id]` (`src/app/api/payment-methods/[id]/route.ts`) — passes `beginningBalance` from validated body to `updatePaymentMethod()`

### API Client (`src/lib/api/client.ts`)

No signature changes needed. The existing wrappers are typed as `Omit<PaymentMethod, 'id'>` (create) and `Partial<PaymentMethod>` (update). Once `PaymentMethod` in `types.ts` gains `beginningBalance`, these signatures automatically accept it. The wrappers pass the full body via `JSON.stringify(data)`.

---

## Section 3: UI Layer

### Settings / Categories page (`src/app/settings/categories/page.tsx`)

**Create flow (inline form — already exists)**

The existing inline create form for payment methods (name + type fields) gains a Saldo Awal field:

| Property | Value |
|----------|-------|
| Label (EN) | Beginning Balance |
| Label (ID) | Saldo Awal |
| Input | Numeric, uses `formatCurrencyInput` / `parseCurrencyInput` (already imported on this page) |
| Default | `0` |
| Position | Below the Type selector |

**Edit flow (new Dialog component — net-new work)**

The payment method list currently shows name, type badge, and a delete button only — there is no edit capability. This feature adds an edit button (pencil icon) per row that opens a **shadcn `Dialog`** pre-populated with the method's current name, icon, type, and `beginningBalance`.

The Dialog:
- Reuses the same field set as the create form
- On submit: calls `api.paymentMethods.update(id, { name, icon, type, beginningBalance })`
- On success: updates local state + shows `toast.success(t(locale, 'saved'))`
- State: `editingMethod: PaymentMethod | null` (null = dialog closed)

**i18n** — add to `src/lib/i18n.ts`:
- `beginningBalance`: EN "Beginning Balance" / ID "Saldo Awal"

### `useBalances` hook (`src/features/balances/useBalances.ts`)

No changes — `PaymentMethodBalance` is unchanged.

### Balance Card

No changes. The card displays the corrected `balance` value from the server.

---

## Section 4: Testing

### Balance service (`src/__tests__/balance.service.test.ts`)

4 new tests in the existing `listPaymentMethodBalances` describe block:

1. `balance equals beginning_balance when no transactions exist` — create payment method with `beginningBalance: 500000`, assert `balance === 500000`
2. `balance = beginning_balance + income − expense` — `beginningBalance: 1000000`, income Rp 3,000,000, expense Rp 500,000 → assert `balance === 3500000`
3. `negative beginning_balance is reflected in balance` — `beginningBalance: -200000`, no transactions → assert `balance === -200000`
4. `beginning_balance of 0 preserves existing income minus expense behavior` — default 0, income 2M expense 500K → assert `balance === 1500000`

### Payment method service (`src/__tests__/payment-method.service.test.ts`)

4 new tests:

1. `createPaymentMethod stores beginningBalance correctly` — create with `beginningBalance: 250000`, retrieve via `findAll()`, assert `beginningBalance === 250000`
2. `createPaymentMethod defaults beginningBalance to 0 when not provided` — omit the field, assert `beginningBalance === 0`
3. `updatePaymentMethod updates beginningBalance` — create with `0`, update to `500000`, assert change persisted
4. `updatePaymentMethod leaves beginningBalance unchanged when not provided` — create with `100000`, update only `name`, assert `beginningBalance` is still `100000`

---

## File Change Summary

| File | Change |
|------|--------|
| `src/server/db/client.ts` | Add column to `payment_methods` DDL; add entry to `columnMigrations` array |
| `src/lib/types.ts` | Add `beginningBalance: number` to `PaymentMethod` interface |
| `src/server/repositories/payment-method.repository.ts` | Update `PmRow`, `rowToPm()`, `create()`, `update()` |
| `src/server/services/payment-method.service.ts` | Forward `beginningBalance` to repository in create + update |
| `src/server/services/balance.service.ts` | Update SQL query and `BalanceRow` interface |
| `src/lib/api/validation.ts` | Add `beginningBalance` to create (default 0) and update (optional) schemas |
| `src/lib/i18n.ts` | Add `beginningBalance` key (EN + ID) |
| `src/app/api/payment-methods/route.ts` | Pass `beginningBalance` from validated body |
| `src/app/api/payment-methods/[id]/route.ts` | Pass `beginningBalance` from validated body |
| `src/app/settings/categories/page.tsx` | Add Saldo Awal to create form; add edit Dialog with full field set |
| `src/__tests__/balance.service.test.ts` | 4 new tests |
| `src/__tests__/payment-method.service.test.ts` | 4 new tests |
