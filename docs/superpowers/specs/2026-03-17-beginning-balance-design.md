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
- Add Saldo Awal field to payment method create and edit forms
- Default to 0 for all existing payment methods (no data migration needed)
- No visual change to the balance card — the card displays the corrected number silently

Out of scope: per-date balance snapshots, negative starting balances, showing Saldo Awal on the dashboard card.

---

## Section 1: Data Layer

### Schema

Add one column to `payment_methods`:

```sql
ALTER TABLE payment_methods ADD COLUMN beginning_balance INTEGER NOT NULL DEFAULT 0;
```

Applied in `src/server/db/client.ts`:
- The `CREATE TABLE` statement gains `beginning_balance INTEGER NOT NULL DEFAULT 0`
- A migration guard runs `ALTER TABLE` if the column does not yet exist (protects existing dev databases)

### Repository (`src/server/repositories/payment-method.repository.ts`)

- `create({ name, icon, type, beginningBalance? })` — `beginningBalance` defaults to 0
- `update(id, { name?, icon?, type?, beginningBalance? })` — partial update, only changes provided fields
- `findAll()` and `findById()` return `beginningBalance` in the result object

### Balance Service (`src/server/services/balance.service.ts`)

The all-time balance SQL changes to include `beginning_balance`:

```sql
-- Before
COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount
                  WHEN t.type='expense' THEN -t.amount ELSE 0 END), 0) AS balance

-- After
pm.beginning_balance +
COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount
                  WHEN t.type='expense' THEN -t.amount ELSE 0 END), 0) AS balance
```

`income`, `expense`, and `monthlyFlow` fields are unaffected.

---

## Section 2: API Layer

### Contracts (`src/lib/api/contracts.ts`)

`PaymentMethod` interface:
```typescript
export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  type: 'bank' | 'cash' | 'ewallet';
  beginningBalance: number;
}
```

`PaymentMethodBalance` interface:
```typescript
export interface PaymentMethodBalance {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'ewallet';
  icon: string;
  income: number;
  expense: number;
  balance: number;
  monthlyFlow: number;
  beginningBalance: number;
}
```

### Validation (`src/lib/api/validation.ts`)

Both `CreatePaymentMethodSchema` and `UpdatePaymentMethodSchema` gain:
```typescript
beginningBalance: z.number().int().min(0).default(0)
```

Non-negative integers only. Decimal amounts are not supported (IDR has no subunits in this app).

### Routes

- `POST /api/payment-methods` — passes `beginningBalance` from validated body to `createPaymentMethod()`
- `PATCH /api/payment-methods/[id]` — passes `beginningBalance` from validated body to `updatePaymentMethod()`

No new routes required.

---

## Section 3: UI Layer

### Settings / Categories page (`src/app/settings/categories/page.tsx`)

Both the **create** and **edit** payment method dialogs gain a Saldo Awal field:

| Property | Value |
|----------|-------|
| Label (EN) | Beginning Balance |
| Label (ID) | Saldo Awal |
| Input type | `number`, `min=0`, `step=1` |
| Placeholder | `0` |
| Default | `0` |
| Validation | Inline error if negative |
| Position | Below the Type selector |

Uses the existing `Input` shadcn/ui primitive. Edit dialog pre-populates the field with the current stored value.

i18n keys to add: `beginningBalance` (EN: "Beginning Balance", ID: "Saldo Awal").

### Balance Card

No changes. The card displays the corrected `balance` number (which now includes `beginning_balance` in the server calculation). The user sees the right number without any new UI elements.

---

## Section 4: Testing

### Balance service (`src/__tests__/balance.service.test.ts`)

3 new tests in the existing `listPaymentMethodBalances` describe block:

1. `balance includes beginning_balance when no transactions exist` — payment method with `beginningBalance: 500000`, verify `balance === 500000`
2. `balance = beginning_balance + income − expense` — `beginningBalance: 1000000`, income 3M, expense 500K → `balance === 3500000`
3. `beginning_balance of 0 is identical to previous behavior` — default 0 produces same result as before

### Payment method service (`src/__tests__/payment-method.service.test.ts`)

2 new tests:

1. `createPaymentMethod stores beginningBalance correctly` — create with `beginningBalance: 250000`, retrieve and assert field value
2. `updatePaymentMethod updates beginningBalance` — create with 0, update to 500000, assert change

---

## File Change Summary

| File | Change |
|------|--------|
| `src/server/db/client.ts` | Add column to DDL + migration guard |
| `src/server/repositories/payment-method.repository.ts` | Add `beginningBalance` to create/update/read |
| `src/server/services/balance.service.ts` | Include `pm.beginning_balance` in balance SQL |
| `src/server/services/payment-method.service.ts` | Pass `beginningBalance` through to repository |
| `src/lib/api/contracts.ts` | Add `beginningBalance` to `PaymentMethod` and `PaymentMethodBalance` |
| `src/lib/api/validation.ts` | Add `beginningBalance` to create/update schemas |
| `src/lib/api/client.ts` | Pass `beginningBalance` in payment method API calls |
| `src/lib/i18n.ts` | Add `beginningBalance` key (EN + ID) |
| `src/app/api/payment-methods/route.ts` | Pass `beginningBalance` from body |
| `src/app/api/payment-methods/[id]/route.ts` | Pass `beginningBalance` from body |
| `src/app/settings/categories/page.tsx` | Add Saldo Awal field to create + edit dialogs |
| `src/__tests__/balance.service.test.ts` | 3 new tests |
| `src/__tests__/payment-method.service.test.ts` | 2 new tests |
