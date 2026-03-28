---
feature: Beginning Balance for Payment Methods
type: spec
date: 2026-03-27
status: draft
tier: 2
---

# Feature 8 — Beginning Balance for Payment Methods

## 1. Overview

### The Problem

When a user starts tracking their finances mid-year, their existing accounts already hold real money. A BCA savings account with Rp 5.000.000 in it before any transactions are recorded will display a balance of Rp 0 in the app until enough income transactions are entered to reconstruct the true amount. This is both confusing and inaccurate.

The `payment_methods` table already has a `beginning_balance DOUBLE PRECISION NOT NULL DEFAULT 0` column in the schema (`src/server/db/client.ts`, line 86). The migration guard for existing databases is also already in place (line 170). However, this column is entirely unused:

- The balance service (`src/server/services/balance.service.ts`) computes `balance = SUM(income) - SUM(expense)` and ignores `beginning_balance` completely.
- The payment method repository (`src/server/repositories/payment-method.repository.ts`) does not SELECT, INSERT, or UPDATE the column.
- The `PaymentMethod` type in `src/lib/types.ts` explicitly removed the field with a comment: `// beginningBalance removed — balance is now computed from transaction chain`.
- No UI surface exposes the field to the user.
- The Zod validation schemas for create and update (`src/lib/api/validation.ts`, lines 59–69) do not include `beginningBalance`.

The practical result: every user who started tracking mid-year sees inaccurate balances everywhere the balance widget appears (the dashboard `AccountBalancesWidget`, the monthly `BalanceCard` ledger rows, and any exported report that includes `paymentMethodBalances`).

### Why It Matters

- **Accuracy**: The displayed balance is the app's primary trust signal. If it does not match the user's actual bank account, the user loses confidence in the entire dashboard.
- **Onboarding**: For a new user setting up the app, the first thing they will do is configure their accounts. Showing a zero balance when they have real money creates an immediate friction point.
- **Reports**: `MonthlyReportData` and `AnnualReportData` both embed `PaymentMethodBalance[]`. Inaccurate balances propagate into every downloadable report.
- **Low effort, high value**: The database column, the migration guard, and the UI location (the `src/app/settings/categories/page.tsx` payment methods section) are already in place. This feature is primarily a matter of wiring existing pieces together.

---

## 2. Goals

1. Allow users to enter a beginning balance (Saldo Awal) when creating a new payment method.
2. Allow users to edit the beginning balance of an existing payment method at any time.
3. Ensure the balance formula used throughout the app becomes `balance = beginning_balance + SUM(income) - SUM(expense)` for the all-time path and `balance = chain_beginning + SUM(monthly_income) - SUM(monthly_expense)` for the monthly path.
4. Restore `beginningBalance` to the `PaymentMethod` TypeScript type and wire it through every layer: repository → service → API → client → UI.
5. Store and retrieve `beginning_balance` correctly in both SQLite (dev) and Neon Postgres (prod).
6. Keep the `BalanceCard` UI unchanged — the corrected number appears automatically through the existing `balance` field.
7. Handle the `credit` payment method type correctly (discussed in Section 4).
8. Provide adequate test coverage for the service and repository layers.

---

## 3. Non-Goals

- **No balance history or time-series adjustments.** The beginning balance is a single static number on the payment method record. There is no concept of "balance as of date X was Y".
- **No reconciliation feature.** Users will not be asked to verify their balance against a bank statement on a scheduled basis.
- **No automated negative beginning balance for credit cards.** Entering a negative number for a credit-type account is valid, but there is no special UI logic that forces a credit account into negative territory. The user is expected to enter the correct value for their situation (see Section 4 for how the label changes to guide them).
- **No migration of existing transaction data.** Existing payment methods with `beginning_balance = 0` are left untouched. Users who set up fresh from day one already have correct balances under `0`.
- **No import/export of beginning balance.** CSV and Excel export templates do not need to surface this column.
- **No per-payment-method balance history page.** That is a separate future feature.

---

## 4. Credit Card Special Case

### The Semantic Problem

For most payment methods (bank, cash, e-wallet), a beginning balance is a positive number representing money the user owns. A BCA account with Rp 5.000.000 → `beginning_balance = 5000000`.

Credit cards work differently. An existing credit card debt is a *liability*, not an asset. If a user has already spent Rp 2.000.000 on their BNI credit card before starting to track, that Rp 2.000.000 is money they *owe*, not money they *have*. The correct representation is `beginning_balance = -2000000`.

### Formula Behavior

The same formula applies to all types:

```
balance = beginning_balance + SUM(income) - SUM(expense)
```

For a credit card with an existing debt of Rp 2.000.000 and subsequent expenses of Rp 500.000 and a payment (income) of Rp 1.000.000:

```
balance = -2000000 + 1000000 - 500000 = -1500000
```

A negative final balance means the user still owes money — which is the correct interpretation for a credit account. A balance of Rp 0 means the card is paid off.

### UI Handling

Because the `credit` type currently does not appear in the validation enum (`z.enum(['bank', 'cash', 'ewallet'])` — validation.ts line 62), the type dropdown does not offer `credit` as an option. This spec does not add `credit` to the enum; that is a separate concern.

However, the spec authors note that if `credit` is added to the enum in a future change, the form UI should handle it as follows:

- When `type === 'credit'`, the beginning balance label changes to the i18n key `existingDebt` ("Existing Debt" / "Utang Awal").
- A helper tooltip on that field reads: "Enter how much you already owe on this card. Leave at 0 if the card was paid off before you started tracking." (i18n key `existingDebtHelp`).
- The input still accepts a positive number from the user. Internally, the value is stored as-is (positive). The formula treats it correctly because a user entering "2000000" for an existing debt would be entering positive debt, which should decrease the balance, meaning the field should be stored negatively. **Implementation note**: for credit accounts, the UI should store `beginningBalance` as a negative number by multiplying the user-entered positive value by `-1` before the API call, and display `Math.abs(beginningBalance)` when pre-filling the edit form. This keeps the formula `balance = beginning_balance + income - expense` universal.
- For all non-credit types, the user-entered value maps directly to the stored value with no sign conversion.

**For this spec's immediate scope** (which does not add `credit` to the enum), the sign-conversion logic is documented but not implemented. The form simply accepts the value as entered for the three existing types.

---

## 5. Approaches

### Option A — Add `beginningBalance` to Create/Edit Form, Use in Balance Calculation

Restore `beginningBalance` to the `PaymentMethod` type and wire it through all layers. The DB column already exists; the work is pure TypeScript wiring and UI form fields.

**Pros:**
- The database schema is already correct and migration-safe (both SQLite and Postgres guards exist).
- No data model ambiguity — the beginning balance is a first-class property of the payment method.
- All downstream consumers (balance service, reports, balance widget) automatically benefit.
- Minimal surface area: only 9 files need changes (see Section 6 for the full list).
- No transaction records are created for what is conceptually metadata about the account.

**Cons:**
- If the user later adjusts `beginning_balance`, every computed balance view changes immediately and retroactively. This is acceptable (see Section 9), but differs from an immutable transaction log.

### Option B — Create a Special "Opening Balance Transaction"

Instead of using the `beginning_balance` column, create a synthetic income transaction of type "Opening Balance" when the user enters their starting amount.

**Pros:**
- Every balance change has an audit trail in the transactions table.
- No changes to the payment method schema.

**Cons:**
- Pollutes the transaction list with synthetic records that are not real transactions.
- Filters must exclude these records from category breakdowns, spending reports, and budget calculations everywhere.
- The `beginning_balance` column exists and is clearly intended for this purpose — bypassing it is wasteful.
- Deleting or editing a payment method's opening amount requires finding and updating a specific transaction, adding coupling.
- Category breakdowns would show an "Opening Balance" category that means nothing to the user.

### Option C — `beginningBalance` on Form Plus Backdated Adjustment Entry

A hybrid: store `beginning_balance` on the payment method (Option A) and also allow the user to enter backdated "adjustment" transactions against a special category to account for transactions they know happened but did not enter individually.

**Pros:**
- More flexible for power users reconstructing historical data.

**Cons:**
- Significantly higher complexity for an edge case that is well-served by a single beginning balance number.
- Out of scope for the immediate problem, which is simply showing an accurate total balance.

### Recommendation: Option A

Option A is the correct choice. The database column already exists with a migration guard. The `BalanceCard` component already renders a "Beginning Balance" ledger row (line 70 in `BalanceCard.tsx`) using `balance.beginningBalance`. The i18n key `beginningBalance` already exists in both EN and ID translations. All infrastructure is in place — this feature is almost entirely plumbing.

---

## 6. Design

### 6.1 Balance Formula Update

The balance service currently has two code paths: a **monthly path** (with month/year filters) and an **all-time path** (no filters).

**Monthly path (already correct):** The monthly path in `balance.service.ts` already computes `beginning_balance` as the running sum of all transactions before the requested month, plus `income - expense` for the month. This is a *transaction-derived* beginning balance, not the stored `pm.beginning_balance` field. After this feature ships, the monthly path must add `pm.beginning_balance` to the chain calculation:

```sql
-- Monthly path: balance column becomes:
pm.beginning_balance +
  COALESCE(SUM(CASE WHEN t.type = 'income' AND t.date < :monthStart THEN t.amount
                    WHEN t.type = 'expense' AND t.date < :monthStart THEN -t.amount
                    ELSE 0 END), 0) +
  COALESCE(SUM(CASE WHEN t.type = 'income' AND t.date LIKE :monthPattern THEN t.amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.date LIKE :monthPattern THEN t.amount ELSE 0 END), 0)
  AS balance

-- The ledger row labeled "beginning_balance" in the response also gains pm.beginning_balance:
pm.beginning_balance +
  COALESCE(SUM(CASE WHEN t.type = 'income' AND t.date < :monthStart THEN t.amount
                    WHEN t.type = 'expense' AND t.date < :monthStart THEN -t.amount
                    ELSE 0 END), 0)
  AS beginning_balance
```

**All-time path (currently wrong):** The all-time path hardcodes `0 AS beginning_balance` and computes `balance = income - expense`. It must change to:

```sql
-- All-time path: use pm.beginning_balance directly
SELECT
  pm.id, pm.name, pm.type, pm.icon,
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

Note: `pm.beginning_balance` is added to the `GROUP BY` clause to satisfy SQL standards.

The `BalanceRow` interface in `balance.service.ts` currently declares `beginning_balance: number` (line 15) but the all-time path returns `0` for it. After this change, both paths return the real value.

### 6.2 Type Layer Changes

**`src/lib/types.ts` — `PaymentMethod` interface**

Restore `beginningBalance` to the type. Remove the misleading comment that says it was removed:

```typescript
export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  type: 'bank' | 'cash' | 'ewallet';
  beginningBalance: number;
}
```

**`src/lib/api/contracts.ts` — `PaymentMethodBalance` interface**

The `PaymentMethodBalance` interface (line 276) already declares `beginningBalance: number` with a correct comment. No change needed here.

### 6.3 Repository Changes

**`src/server/repositories/payment-method.repository.ts`**

The `PmRow` interface must gain the column:

```typescript
interface PmRow {
  id: string;
  name: string;
  icon: string;
  type: string;
  beginning_balance: number;
}
```

The `rowToPm()` mapping function must include the new field:

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

The `create()` method must INSERT the value:

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

The `update()` method must include `beginning_balance` in the SET clause:

```typescript
async update(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
  const db = await getDb();
  const existing = await db.query<PmRow>('SELECT * FROM payment_methods WHERE id = ?', [id]);
  if (!existing.rows[0]) return undefined;
  const current = rowToPm(existing.rows[0]);
  const updated = { ...current, ...data };
  await db.query(
    'UPDATE payment_methods SET name=?, icon=?, type=?, beginning_balance=? WHERE id=?',
    [updated.name, updated.icon, updated.type, updated.beginningBalance ?? 0, id]
  );
  return updated;
}
```

`findAll()` and `findById()` use `SELECT *` and delegate to `rowToPm()` — no SQL changes needed there.

### 6.4 Validation Schema Changes

**`src/lib/api/validation.ts`**

`createPaymentMethodSchema` gains `beginningBalance` with a default of `0` so it is never required in the request body:

```typescript
export const createPaymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  icon: z.string().max(50).optional().default('wallet'),
  type: z.enum(['bank', 'cash', 'ewallet']),
  beginningBalance: z.number().default(0),
});
```

`updatePaymentMethodSchema` gains `beginningBalance` as optional (PATCH semantics — omitting it leaves the stored value unchanged):

```typescript
export const updatePaymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  icon: z.string().max(50).optional(),
  type: z.enum(['bank', 'cash', 'ewallet']).optional(),
  beginningBalance: z.number().optional(),
});
```

No `min(0)` constraint is added. While negative beginning balances are unusual for bank/cash/ewallet accounts, the validation layer should not block legitimate negative values. UI-level messaging (see Section 6.6) guides users toward the correct input; strict negative blocking would cause problems if `credit` is added to the enum in the future.

The inferred types `CreatePaymentMethodInput` and `UpdatePaymentMethodInput` update automatically via the `z.infer` declarations at the bottom of the file.

### 6.5 Service Layer Changes

**`src/server/services/payment-method.service.ts`**

`createPaymentMethod()` already forwards the validated body to `repo.create()`. Because the Zod schema now includes `beginningBalance`, it will be present in `parsed.data` after validation and forwarded automatically. No explicit code change is needed *unless* `repo.create()` requires `beginningBalance` to be in `Omit<PaymentMethod, 'id'>` — which it will, once `PaymentMethod` has the field. The existing call `return { data: await repo.create(parsed.data) }` is sufficient.

`updatePaymentMethod()` similarly forwards `parsed.data` to `repo.update()`. The PATCH semantics mean `beginningBalance` is optional in the update payload. The repository's `update()` method merges the incoming data with the existing record, so omitting `beginningBalance` in the PATCH body correctly leaves the stored value unchanged.

**`src/server/services/balance.service.ts`**

Both SQL queries must be updated as specified in Section 6.1. The all-time path must stop hardcoding `0 AS beginning_balance` and the `beginningBalance: 0` in the row mapper. The monthly path must add `pm.beginning_balance` to its chain calculation.

The `BalanceRow` interface already has `beginning_balance: number` (line 15) so no interface change is needed. The all-time row mapper currently hardcodes `beginningBalance: 0` (line 98) — this must become `beginningBalance: Number(row.beginning_balance)`.

### 6.6 API Route Changes

**`src/app/api/payment-methods/route.ts` (POST)**

No changes needed. The route passes the raw request body to `createPaymentMethod(body)`, which validates it with Zod. Once the Zod schema includes `beginningBalance`, it is accepted automatically.

**`src/app/api/payment-methods/[id]/route.ts` (PATCH)**

No changes needed for the same reason.

**`src/app/api/payment-methods/balances/route.ts` (GET)**

No changes needed. The route delegates entirely to `listPaymentMethodBalances()` and returns its result.

### 6.7 API Client Changes

**`src/lib/api/client.ts`**

The `paymentMethods.create()` wrapper is typed as `Omit<PaymentMethod, 'id'>` (line 157). Once `PaymentMethod` gains `beginningBalance`, the wrapper automatically accepts it. No code change needed.

The `paymentMethods.update()` wrapper is typed as `Partial<PaymentMethod>`. Same — automatic. No code change needed.

### 6.8 UI Changes

#### Settings / Categories Page (`src/app/settings/categories/page.tsx`)

This is the primary UI entry point. The page currently has two forms for payment methods:

**1. Inline Create Form** (lines 466–492 in the current file)

Add a new state variable:
```typescript
const [newMethodBeginningBalance, setNewMethodBeginningBalance] = useState('');
```

Add a numeric input field below the type selector, using the existing `formatCurrencyInput` / `parseCurrencyInput` helpers (already imported on the page):

- Label: `t(locale, 'beginningBalance')` (already exists in i18n)
- Placeholder: `0`
- CSS class: `font-mono w-36`
- Input type: `text` (numeric-formatted via the existing formatter helpers, matching the budget field pattern)
- Helper text below the input: `t(locale, 'beginningBalanceHelp')` (new i18n key — see Section 7)

The `handleAddMethod()` function must pass the parsed value:
```typescript
const result = await api.paymentMethods.create({
  name: newMethodName,
  icon: 'wallet',
  type: newMethodType,
  beginningBalance: parseCurrencyInput(newMethodBeginningBalance),
});
```

On success, reset `newMethodBeginningBalance` to `''`.

**2. Edit Dialog** (lines 494–542 in the current file)

The edit dialog already exists with name and type fields. Add:

- A new state variable: `const [editBeginningBalance, setEditBeginningBalance] = useState('');`
- Pre-populate it in `handleOpenEdit()`: `setEditBeginningBalance(formatCurrencyInput(method.beginningBalance));`
- Add the input field inside the Dialog's `space-y-4` div, between the type selector and the footer:

```
Label: t(locale, 'beginningBalance')
Input: formatCurrencyInput/parseCurrencyInput, font-mono
Helper: t(locale, 'beginningBalanceHelp')
```

Update `handleEditSave()` to include the field:
```typescript
const result = await api.paymentMethods.update(editingMethod.id, {
  name: editName,
  type: editType,
  beginningBalance: parseCurrencyInput(editBeginningBalance),
});
```

**Tooltip / Helper Text Design**

The helper text renders as a small `text-muted-foreground text-xs` paragraph beneath the input — consistent with the pattern used for budget fields elsewhere on the page. No `Tooltip` component is needed; the text is always visible inline.

- EN: "The amount already in this account before you started tracking."
- ID: "Jumlah yang sudah ada di akun ini sebelum Anda mulai mencatat."

#### Balance Card (`src/features/balances/BalanceCard.tsx`)

No changes. The card already renders the `beginningBalance` ledger row (line 70–72). Once the service starts returning the real value instead of `0`, the display updates automatically.

#### `useBalances` Hook (`src/features/balances/useBalances.ts`)

No changes. The hook fetches from the `/api/payment-methods/balances` endpoint and returns the data as-is.

#### `AccountBalancesWidget`, `BalanceGrid`

No changes. Both components receive `PaymentMethodBalance[]` from `useBalances()` and pass items to `BalanceCard`. No structural changes are needed.

---

## 7. i18n Keys

The following keys must be present in `src/lib/i18n.ts`. The `beginningBalance` and `closing` keys already exist (confirmed at lines 749 and 1106 in the current file). The remaining keys are new additions.

| Key | EN | ID |
|-----|----|----|
| `beginningBalance` | `'Beginning Balance'` | `'Saldo Awal'` | *(already exists)* |
| `existingDebt` | `'Existing Debt'` | `'Utang Awal'` | *(new — for credit type)* |
| `beginningBalanceHelp` | `'The amount already in this account before you started tracking.'` | `'Jumlah yang sudah ada di akun ini sebelum Anda mulai mencatat.'` | *(new)* |
| `existingDebtHelp` | `'Enter how much you already owe on this card before you started tracking.'` | `'Masukkan jumlah utang kartu kredit sebelum Anda mulai mencatat.'` | *(new — for credit type)* |

The `TranslationDictionary` interface must gain the new keys:
```typescript
existingDebt: string;
beginningBalanceHelp: string;
existingDebtHelp: string;
```

Note: `existingDebt` and `existingDebtHelp` are included for completeness and forward-compatibility with the `credit` type. They are not rendered by any form in this feature's immediate scope (since `credit` is not in the current enum), but adding them now avoids a later patch.

---

## 8. Testing

### 8.1 Balance Service Tests

**File:** `src/__tests__/balance.service.test.ts` (add to the existing `listPaymentMethodBalances` describe block)

**All-time path tests:**

| Test name | Setup | Expected |
|-----------|-------|----------|
| `all-time: balance includes beginning_balance when no transactions exist` | Create payment method with `beginningBalance: 500000`, no transactions | `balance === 500000`, `beginningBalance === 500000` |
| `all-time: balance = beginning_balance + income − expense` | `beginningBalance: 1000000`, income Rp 3.000.000, expense Rp 500.000 | `balance === 3500000`, `income === 3000000`, `expense === 500000` |
| `all-time: negative beginning_balance reduces balance` | `beginningBalance: -200000`, no transactions | `balance === -200000` |
| `all-time: zero beginning_balance preserves income−expense behavior` | `beginningBalance: 0` (default), income Rp 2.000.000, expense Rp 500.000 | `balance === 1500000` (regression test — existing behavior unchanged) |

**Monthly path tests:**

| Test name | Setup | Expected |
|-----------|-------|----------|
| `monthly: beginning_balance is added to chain calculation` | `beginningBalance: 1000000`, prior-month income Rp 500.000, current-month expense Rp 200.000 | `balance === 1300000` (1000000 + 500000 − 200000) |
| `monthly: zero beginning_balance leaves monthly chain unchanged` | `beginningBalance: 0`, prior-month income Rp 500.000, current-month expense Rp 200.000 | `balance === 300000` (regression) |

### 8.2 Payment Method Service Tests

**File:** `src/__tests__/payment-method.service.test.ts` (add to the existing `createPaymentMethod` and `updatePaymentMethod` describe blocks)

| Test name | Action | Expected |
|-----------|--------|----------|
| `create: stores beginningBalance correctly` | `createPaymentMethod({ ..., beginningBalance: 250000 })` | Returned object has `beginningBalance === 250000`; subsequent `listPaymentMethods()` includes value |
| `create: defaults beginningBalance to 0 when not provided` | `createPaymentMethod({ name, icon, type })` — omit `beginningBalance` | Returned object has `beginningBalance === 0` |
| `update: updates beginningBalance` | Create with `beginningBalance: 0`, then update to `500000` | Re-fetched record has `beginningBalance === 500000` |
| `update: leaves beginningBalance unchanged when field is not in PATCH body` | Create with `beginningBalance: 100000`, update `{ name: 'New Name' }` only | Re-fetched record still has `beginningBalance === 100000` |

### 8.3 Validation Schema Tests

**File:** `src/__tests__/validation.test.ts` (if this file exists, otherwise add inline assertions)

| Test | Assertion |
|------|-----------|
| `createPaymentMethodSchema accepts beginningBalance` | `{ name: 'BCA', type: 'bank', beginningBalance: 5000000 }` parses successfully |
| `createPaymentMethodSchema defaults beginningBalance to 0` | `{ name: 'BCA', type: 'bank' }` parses with `beginningBalance === 0` |
| `updatePaymentMethodSchema accepts partial beginningBalance` | `{ beginningBalance: 1000 }` parses with `success === true` |
| `updatePaymentMethodSchema accepts negative beginningBalance` | `{ beginningBalance: -500000 }` parses with `success === true` |

---

## 9. Edge Cases and Risks

### 9.1 Existing Payment Methods with Transactions

**Scenario:** A user has been tracking for 6 months. Their payment methods have real transactions but `beginning_balance = 0`. After this feature ships, their balance displays are identical to before (the formula change adds `0`, which has no effect). The user can optionally enter a beginning balance in the edit dialog, but is not forced to. No migration, backfill, or alert is needed.

**Risk:** Low. The change is purely additive for existing users.

### 9.2 Retroactive Balance Changes

If a user edits `beginning_balance` six months into tracking, every computed balance view updates immediately. The monthly `BalanceCard` for January will show a different "Closing" value after the edit than it did before. This is acceptable and expected — the feature intentionally allows users to correct an inaccurate starting point. The tradeoff is documented here rather than hidden from the user.

**Design decision:** Do not warn the user that editing the beginning balance changes historical views. The adjustment is semantically correct (they are correcting a data entry, not changing transactions), and the simplicity of the immediate update outweighs the confusion of seeing numbers change. If this causes user confusion in practice, a future spec can address it.

### 9.3 Input Validation in the UI

For non-credit payment method types, a negative beginning balance is unusual but technically valid (e.g., an overdrawn bank account). The validation schema allows it. The UI does not show an error for negative values but can show an amber warning in a future iteration.

The minimum validation that must be enforced: the field must be a valid number. Non-numeric input falls back to `parseCurrencyInput(value) === 0` via the existing formatter, preventing `NaN` from reaching the API.

### 9.4 Concurrent Edits

If two browser tabs have the Categories page open and edit the same payment method concurrently, the last write wins (standard last-write-wins for SQLite). This is consistent with how the rest of the app handles concurrent edits and is acceptable for a single-user personal finance app.

### 9.5 The `credit` Type

The `credit` type is referenced in the DB schema comment in the spec prompt but is not in the current Zod enum (`z.enum(['bank', 'cash', 'ewallet'])`). This feature does not add `credit` to the enum. The UI sign-conversion logic described in Section 4 (positive user input → negative stored value) is documented for implementation when `credit` is introduced, but is not in scope here.

### 9.6 Seeded Data

The `src/server/db/seed.ts` INSERT for payment methods does not include `beginning_balance`:
```sql
INSERT INTO payment_methods (id, name, icon, type) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING
```
This is correct — seeded data should default to `0`, letting the `DEFAULT 0` on the column handle it. No change to `seed.ts` is needed.

### 9.7 TypeScript Strict Mode

Once `beginningBalance` is added back to `PaymentMethod`, the compiler will flag every place in the codebase that constructs a `PaymentMethod` literal without the field. The known locations are:

- `src/server/repositories/payment-method.repository.ts` — the `rowToPm()` function and `create()` return (already updated in Section 6.3 above).
- `src/server/db/seed.ts` — the seed data is inserted via SQL, not via TypeScript objects, so no TypeScript error.
- Any test fixtures that construct `PaymentMethod` objects directly.

Running `npm run typecheck` after the type change will surface any missed locations. All flagged locations must be resolved before the PR is merged.

---

## 10. File Change Summary

| File | Change |
|------|--------|
| `src/lib/types.ts` | Restore `beginningBalance: number` to `PaymentMethod` interface; remove the comment about it being removed |
| `src/lib/api/validation.ts` | Add `beginningBalance: z.number().default(0)` to `createPaymentMethodSchema`; add `beginningBalance: z.number().optional()` to `updatePaymentMethodSchema` |
| `src/server/repositories/payment-method.repository.ts` | Update `PmRow` interface, `rowToPm()`, `create()` INSERT, `update()` SET |
| `src/server/services/balance.service.ts` | Fix all-time path SQL (use `pm.beginning_balance`, remove hardcoded `0`); update all-time row mapper; update monthly path to add `pm.beginning_balance` to chain calculation |
| `src/app/settings/categories/page.tsx` | Add `beginningBalance` state, input field, and helper text to create form; add `beginningBalance` state, pre-fill, and input field to edit dialog; update `handleAddMethod()` and `handleEditSave()` to pass the value |
| `src/lib/i18n.ts` | Add `existingDebt`, `beginningBalanceHelp`, `existingDebtHelp` keys (EN + ID); add to `TranslationDictionary` interface |
| `src/__tests__/balance.service.test.ts` | Add 6 new tests covering all-time and monthly path behavior with `beginning_balance` |
| `src/__tests__/payment-method.service.test.ts` | Add 4 new tests covering create default, create with value, update, and partial update |

**Files that do NOT need changes** (despite being in the data flow):

| File | Reason |
|------|--------|
| `src/server/db/client.ts` | Column already in schema DDL and migration guard already in `columnMigrations` array |
| `src/server/services/payment-method.service.ts` | Forwards validated body to repo; once schema includes `beginningBalance`, it flows automatically |
| `src/app/api/payment-methods/route.ts` | Passes raw body to service; no structural change |
| `src/app/api/payment-methods/[id]/route.ts` | Same as above |
| `src/app/api/payment-methods/balances/route.ts` | Delegates entirely to `listPaymentMethodBalances()`; no change |
| `src/lib/api/client.ts` | Typed as `Omit<PaymentMethod, 'id'>` / `Partial<PaymentMethod>`; updates automatically |
| `src/lib/api/contracts.ts` | `PaymentMethodBalance` already has `beginningBalance: number`; no change |
| `src/features/balances/BalanceCard.tsx` | Already renders `balance.beginningBalance`; will show correct value automatically |
| `src/features/balances/useBalances.ts` | No structural change needed |
| `src/features/balances/AccountBalancesWidget.tsx` | No structural change needed |
| `src/features/balances/BalanceGrid.tsx` | No structural change needed |
