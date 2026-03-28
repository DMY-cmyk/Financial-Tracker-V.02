---
feature: Transaction Split
type: spec
date: 2026-03-27
status: draft
tier: 3
---

# Transaction Split — Design Spec

**Date:** 2026-03-27
**Scope:** Allow a single transaction (e.g., one supermarket trip) to be allocated across multiple categories while preserving the purchase as one logical event. Affects DB schema, API, services, UI forms, transaction table display, budget calculations, dashboard category totals, and export/report output.

---

## 1. Overview

Today every transaction belongs to exactly one category. A Rp 500.000 supermarket purchase that spans Food, Household, and Personal Care must be entered as three separate transactions, which destroys the "one shopping trip" context — or entered as one transaction with a single approximate category, which makes budget reporting inaccurate.

**Transaction Split** lets the user mark a single transaction as split, then assign sub-amounts to individual categories. The parent transaction records the total amount, payment method, date, and description. Each split line carries its own category, optional sub-description, and amount. The splits must sum to the parent total.

The feature targets expense transactions primarily but must not be architecturally blocked from income splits (e.g., a single payment that covers consulting + royalties). The UI defaults to expense context.

---

## 2. Goals

1. Allow one transaction to be allocated across two or more categories.
2. Preserve the "one event" context — a split transaction appears as a single entry in all transaction lists.
3. Ensure budget and dashboard category totals count split amounts by their individual categories, not the parent sentinel.
4. Provide inline split validation: sum of split amounts must equal total before saving.
5. Support converting an existing single-category transaction to a split transaction without deleting and recreating it.
6. Support reverting a split back to a single-category transaction.
7. Integrate with all existing export formats (CSV, XLSX, PDF, JSON) with a documented expansion behavior.
8. No migration needed for existing transactions — the schema changes are additive only.

---

## 3. Non-Goals

- **No split across different payment methods.** All split lines share the parent's payment method.
- **No split across different dates.** All split lines inherit the parent's date.
- **No percentage-based input.** Amounts only (the user types Rp values, not "30%").
- **No recurring split templates.** Splits are one-off per transaction.
- **No nested splits.** A split line cannot itself be split further.
- **No split on bulk-import (OCR upload).** Bulk-imported transactions remain single-category. Split can be applied later via edit.
- **No UI for re-ordering split lines.** Order is cosmetic; the system does not depend on it.

---

## 4. DB Model Options

### Option A — Child Transactions with `parent_id`

Add a `parent_id TEXT REFERENCES transactions(id)` column to the existing `transactions` table. The parent row holds total amount and a sentinel category. Each split is a separate transaction row with `parent_id` set and its own category and amount.

**Pros:**
- No new table. All existing queries that read transactions still work (with filtering).
- Simple cascade: delete parent triggers `ON DELETE CASCADE` on children.

**Cons:**
- Existing queries that aggregate by category will double-count unless they filter `WHERE parent_id IS NULL` (parent) or `WHERE parent_id IS NOT NULL` (children). Getting this right across all query sites is error-prone.
- Dashboard and budget queries must be surgically updated to exclude parent rows and include child rows. Missing even one query site causes wrong totals.
- The transaction list must group parent + children, which requires a non-trivial query or post-processing.
- Conceptually confusing: child rows look like real transactions, show up in any naive `SELECT * FROM transactions`, and could corrupt totals if a query forgets the filter.
- `TransactionService` accumulates conditional logic branching on `parent_id` throughout all CRUD operations.

**Verdict:** Viable but fragile. The double-count risk is high. Not recommended.

---

### Option B — JSON `split_data` Column on Transaction

Add a `split_data TEXT` column to `transactions`. For split transactions, this column holds a JSON array of `{categoryId, category, amount, description}`. The parent's `category_id` and `category` become a "Split" sentinel. `amount` remains the total.

**Pros:**
- No new table or join.
- A single column contains all split information.
- Existing `SELECT` queries that read the full row automatically get `split_data`.

**Cons:**
- JSON in SQLite cannot be indexed or queried per-line without `json_each()`, which is SQLite-specific and not available in Neon Postgres without `jsonb`. This creates a divergence between dev (SQLite) and prod (Postgres) query shapes.
- Budget and dashboard queries that need per-category totals must call `json_each(split_data)` in SQLite or `jsonb_array_elements` in Postgres — two different SQL dialects, two different repository implementations.
- Validation (sum check, referential integrity on `category_id`) must be done entirely in application code; the DB offers no constraints.
- Any future migration of split data (e.g., renaming a category) requires parsing and rewriting JSON blobs across many rows.
- Makes the repository layer significantly more complex for what is ultimately relational data.

**Verdict:** Convenient short-term, but creates a maintainability trap and a SQLite/Postgres dialect split. Not recommended.

---

### Option C — Normalized `transaction_splits` Table (Recommended)

Create a new `transaction_splits` table. The parent `transactions` row gains an `is_split INTEGER DEFAULT 0` flag and a sentinel `category` value of `'Split'`. All split lines live in `transaction_splits` with a `transaction_id` foreign key.

**Pros:**
- Fully normalized. Each split line is independently queryable and filterable.
- Standard SQL `JOIN` works identically in SQLite and Neon Postgres — no dialect divergence.
- `ON DELETE CASCADE` on `transaction_id` means deleting the parent transaction automatically removes all split lines with no application-level code needed.
- Budget and dashboard category queries change at one place: sum from `transaction_splits` for `is_split = 1` rows, from `transactions.amount` for `is_split = 0` rows. A `UNION` or a LEFT JOIN handles both cases cleanly.
- `category_id` on split lines gets the same FK constraint as on transactions, so referential integrity is enforced by the DB.
- Future work (e.g., per-split notes, tax tagging, receipt photo attachment) fits naturally as new columns on `transaction_splits`.
- The sentinel flag `is_split` makes it trivial to detect split transactions at the application layer without parsing any JSON.

**Cons:**
- Requires a new table and a schema migration (additive: `ALTER TABLE` + `CREATE TABLE`).
- Queries that return full transaction detail now optionally JOIN `transaction_splits`. This is one join, not complex.
- `TransactionRepository` needs new CRUD methods for splits.

**Verdict:** Cleanest and most maintainable. Option C is the recommended implementation path.

---

## 5. Recommended Design — Option C

### 5.1 DB Schema Changes

Both changes are **additive** — no existing rows are altered, no columns are dropped.

```sql
-- Add split flag to transactions table
ALTER TABLE transactions ADD COLUMN is_split INTEGER NOT NULL DEFAULT 0;

-- New normalized splits table
CREATE TABLE IF NOT EXISTS transaction_splits (
  id          TEXT    PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id TEXT    REFERENCES categories(id),
  category    TEXT,
  amount      REAL    NOT NULL CHECK (amount > 0),
  description TEXT,
  created_at  TEXT    NOT NULL
);

CREATE INDEX idx_transaction_splits_transaction_id
  ON transaction_splits(transaction_id);

CREATE INDEX idx_transaction_splits_category_id
  ON transaction_splits(category_id);
```

**Notes on schema decisions:**

- `is_split` uses `INTEGER` (0/1) rather than `BOOLEAN` for SQLite compatibility. Postgres reads it as a smallint, which is fine.
- `category` (denormalized text) is kept alongside `category_id` on `transaction_splits` for the same reason it exists on `transactions`: categories can be renamed or deleted. The denormalized `category` text serves as a display fallback.
- `amount CHECK (amount > 0)` prevents zero-amount split lines at the DB level.
- `ON DELETE CASCADE` ensures split lines are automatically cleaned up when the parent transaction is deleted. No application-level cleanup is needed.
- When `is_split = 1`, the parent transaction's `category` column is set to the string `'Split'` and `category_id` is set to `NULL`. This sentinel value is used by the UI to render the "Multiple" badge.
- When `is_split = 0`, `transaction_splits` has no rows for that transaction. No behavioral change from today.

### 5.2 Migration Strategy

Because the changes are additive (`ALTER TABLE ADD COLUMN` and `CREATE TABLE IF NOT EXISTS`), the migration runs automatically on app startup via the existing schema init in `src/server/db/sqlite.ts`. No data backfill is needed. All existing transactions remain valid with `is_split = 0` (the default).

For Neon Postgres in production, the same SQL statements are run on first deploy. `ADD COLUMN ... DEFAULT 0` is safe on large tables in Postgres (it does not rewrite the table in modern versions).

The `CREATE INDEX` statements are also safe to run behind `IF NOT EXISTS`.

### 5.3 TypeScript Types

Add to `src/lib/types.ts`:

```typescript
export interface TransactionSplit {
  id: string;
  transactionId: string;
  categoryId: string | null;
  category: string | null;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface TransactionSplitInput {
  categoryId: string | null;
  category: string | null;
  amount: number;
  description: string | null;
}
```

Update the existing `Transaction` interface:

```typescript
export interface Transaction {
  // ... existing fields unchanged ...
  isSplit: boolean;           // new — mapped from is_split column
  splits?: TransactionSplit[]; // new — populated only when isSplit = true
}
```

The `splits` array is optional and populated only when the API caller requests it (i.e., on edit form load and on transaction detail expansion). The main list endpoint includes `splits` for `is_split = 1` rows by default, to enable the expandable row display without a second request.

### 5.4 Zod Validation Schemas

Add to `src/lib/api/validation.ts`:

```typescript
export const transactionSplitInputSchema = z.object({
  categoryId: z.string().nullable(),
  category: z.string().nullable(),
  amount: z.number().positive('Split amount must be greater than zero'),
  description: z.string().nullable().optional(),
});

export const createTransactionWithSplitsSchema = createTransactionSchema.extend({
  splits: z.array(transactionSplitInputSchema).min(2).optional(),
});
```

Cross-field validation (sum of `splits[*].amount === amount`) is enforced at the **service layer**, not the Zod schema, because Zod cannot easily reference sibling fields in a `refine` across the parent. The service returns `{ error: { message: '...', code: 'SPLIT_SUM_MISMATCH' } }` if the check fails.

### 5.5 Repository Changes

**`src/server/repositories/transaction.repository.ts`** — new methods:

| Method | Purpose |
|--------|---------|
| `createSplits(transactionId, splits)` | Bulk-insert split lines into `transaction_splits`. Uses a prepared statement in a transaction block. |
| `deleteSplits(transactionId)` | Delete all splits for a transaction. Used during split update (delete-then-recreate). |
| `getSplitsByTransactionId(transactionId)` | Return all split lines for one transaction. |
| `getSplitsForTransactions(transactionIds)` | Batch-load splits for multiple transactions. Used by list query. |

The existing `findAll` query joins `transaction_splits` for rows where `is_split = 1`, using a `LEFT JOIN` + `GROUP_CONCAT` (SQLite) / `json_agg` (Postgres) to return splits inline. A thin adapter in the repository normalizes the result to the `Transaction` TypeScript type.

Because the SQLite and Postgres aggregation functions differ, the repository exposes a `dialect` flag set at init time (`'sqlite' | 'postgres'`), and the join query selects the right aggregate expression. This is the only dialect-specific code required.

### 5.6 Service Changes

**`src/server/services/transaction.service.ts`** — changes:

**`createTransaction`**: If `splits` is provided in the input:
1. Validate `splits.length >= 2`.
2. Validate `sum(splits[*].amount) === input.amount` (within a floating-point epsilon of 0.001 to handle IDR rounding).
3. Set `category = 'Split'`, `category_id = null`, `is_split = 1` on the parent row.
4. Call `repository.createTransaction()` to insert the parent.
5. Call `repository.createSplits(parentId, splits)` within the same DB transaction.
6. Return the full transaction with splits attached.

If `splits` is not provided, behavior is identical to today.

**`updateTransaction`**: If `splits` is provided in the update payload:
1. Run the same sum validation.
2. Call `repository.deleteSplits(transactionId)` — clears existing splits.
3. If `splits.length >= 2`, call `repository.createSplits()` and set `is_split = 1`, `category = 'Split'`, `category_id = null`.
4. If `splits.length === 1`, treat as a conversion back to single-category: use `splits[0].categoryId` and `splits[0].category` for the parent, set `is_split = 0`. (See edge case: §9.)
5. If `splits` is explicitly `[]` (empty array), also revert to single-category (requires caller to provide a `categoryId` in the parent payload).

**`deleteTransaction`**: No change. `ON DELETE CASCADE` on `transaction_splits` handles cleanup automatically.

**`getDashboardSummary`** and **`getMonthlyReport`** — category breakdown query:

Today these aggregate with `SUM(amount) GROUP BY category_id` on `transactions`. With splits:

- For `is_split = 0` rows: same as today — use `transactions.amount` against `transactions.category_id`.
- For `is_split = 1` rows: **exclude** `transactions.amount` from category totals; instead, sum `transaction_splits.amount` grouped by `transaction_splits.category_id`.
- The total income/expense amounts (not broken down by category) continue to use `transactions.amount` regardless of `is_split`, since the parent total is authoritative.

This is a single repository-level query change. All service callers receive the corrected breakdown transparently.

### 5.7 API Route Changes

**`POST /api/transactions`**

Request body gains an optional `splits` array:

```json
{
  "description": "Supermarket Indomaret",
  "type": "expense",
  "amount": 500000,
  "date": "2026-03-27",
  "paymentMethod": "BCA",
  "notes": "Weekly groceries",
  "splits": [
    { "categoryId": "cat-food", "category": "Food", "amount": 200000, "description": "Groceries" },
    { "categoryId": "cat-household", "category": "Household", "amount": 150000, "description": "Cleaning supplies" },
    { "categoryId": "cat-personal", "category": "Personal Care", "amount": 150000, "description": "Shampoo" }
  ]
}
```

If `splits` is present and valid, the response includes the created transaction with `splits` populated.

**`PATCH /api/transactions/[id]`**

Same `splits` array accepted in the body. The service applies the delete-then-recreate strategy (§5.6). The response includes the updated transaction with current splits.

**`GET /api/transactions`**

Response includes `splits: TransactionSplit[]` on each transaction where `isSplit = true`. For `isSplit = false` transactions, `splits` is omitted (not `null`, not `[]`). This avoids inflating response size for the common case.

**`GET /api/transactions/[id]`** (new route or via existing list with filter)

Returns a single transaction with `splits` always populated. Used by the edit form.

**`POST /api/transactions/[id]/split`** (new endpoint)

Converts an existing single-category transaction to a split. This is a convenience endpoint for the "Split this transaction" action on the edit form. It is equivalent to `PATCH /api/transactions/[id]` with a `splits` array, but semantically distinct for client-side clarity.

Request body: `{ splits: TransactionSplitInput[] }`

The endpoint validates that the sum of splits equals the transaction's current `amount`. It does not allow changing the parent transaction's `amount`, `date`, `paymentMethod`, or `description` — those require a separate `PATCH`.

**`DELETE /api/transactions/[id]/split`** (new endpoint)

Reverts a split transaction back to single-category. Requires `{ categoryId, category }` in the body to set on the parent. Calls `repository.deleteSplits()` and sets `is_split = 0`, updates `category_id` and `category` on the parent row.

---

## 6. UI Design

### 6.1 TransactionForm — Split Toggle

The `TransactionForm` component gains a "Split this transaction" control, placed between the "Category" row and the "Notes" row.

**Normal state (no split):**
A secondary-style button or toggle labeled with the `splitTransaction` i18n key. Positioned as a subtle affordance, not a primary action — it should not distract users who never use splits.

```
[Category ▼ Food]
  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  [⊕ Split this transaction]
  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
[Notes]
```

**Split active state:**
When the user clicks "Split this transaction", the category dropdown hides (replaced by the split editor) and the split editor slides in with a `fadeInUp` animation (from `src/lib/motion.ts`).

```
  Split Allocation
  ─────────────────────────────────────────────────
  [Category ▼ Food      ] [Groceries      ] [Rp 200.000] [✕]
  [Category ▼ Household ] [Cleaning supp. ] [Rp 150.000] [✕]
  [Category ▼ Personal  ] [Shampoo        ] [Rp 150.000] [✕]
  [+ Add split line]
  ─────────────────────────────────────────────────
  Total: Rp 500.000  |  Allocated: Rp 500.000  |  Remaining: Rp 0
```

The "Remaining" counter uses:
- **Green / muted** when remaining = 0 (fully allocated).
- **Amber** when remaining > 0 (under-allocated).
- **Red** when remaining < 0 (over-allocated).

The "Save" button is disabled while remaining ≠ 0.

**Deactivating split:**
A "Remove split" link appears next to the "Split Allocation" heading. Clicking it collapses the split editor (with reverse `fadeInUp` animation), restores the category dropdown, and discards all split lines. The first split line's `categoryId` is used to pre-fill the category dropdown if exactly one line existed before removal, otherwise the category dropdown resets to empty.

### 6.2 Split Line Component

Each split line is a horizontal row with four fields:

| Field | Control | Width |
|-------|---------|-------|
| Category | `CategoryCombobox` (existing) | ~35% |
| Description | `Input` (text, optional) | ~35% |
| Amount | `CurrencyInput` (formatted IDR) | ~22% |
| Remove | Icon button (X, `tapScale` feedback) | ~8% |

The "Category" combobox in a split line uses the same component as the main transaction form's category selector. It filters by the parent transaction's `type` (income/expense).

The "Description" field is optional. Its placeholder text is the `splitCategory` i18n key value, e.g., "Sub-description (optional)".

The "Amount" field auto-formats to IDR on blur (same as the main amount field). Entering an amount in one line does not auto-populate others.

### 6.3 Animation

All split-related animations use presets from `src/lib/motion.ts`:

- Split editor slides in: `fadeInUp` on the container.
- Each new split line: `staggerList` variant — 40ms stagger, 250ms duration.
- Removing a split line: animate out with `opacity: 0, height: 0` at 200ms.
- Remaining counter color change: CSS transition only (no Framer Motion needed).

### 6.4 Transaction Table Display

**Category column:**
For split transactions (`isSplit = true`), the category column displays a "Multiple" badge instead of a category chip. The badge uses the same visual language as `CategoryChip` but with a neutral color (slate/gray) and a split-icon prefix (e.g., a fork/branch icon from Lucide: `GitFork` or `Split`).

**Expandable rows:**
Split transactions have a chevron icon at the start of the row. Clicking it expands an inline detail panel showing the split lines:

```
  ▼  Indomaret Supermarket     Multiple ●    Rp 500.000   2026-03-27
     ├─ Food · Groceries                     Rp 200.000
     ├─ Household · Cleaning supplies        Rp 150.000
     └─ Personal Care · Shampoo              Rp 150.000
```

The expanded lines are styled as subdued rows (smaller text, indented, no action buttons). This expansion is local UI state — no API call needed because `splits` is already in the response.

**Edit action:**
Clicking the edit button on a split transaction opens `TransactionForm` with the split editor pre-populated. The form detects `isSplit = true` in the loaded transaction and initializes the split editor with the existing split lines.

### 6.5 Mobile Behavior

On mobile (< 640px), the split editor stacks vertically per line:

```
Split line 1
[Category ▼ Food          ]
[Description (optional)   ]
[Rp 200.000               ]
[Remove this line          ]

Split line 2
...
```

The "Remaining" counter is pinned to the bottom of the split editor section as a sticky bar above the "Add split line" button, ensuring it is always visible while scrolling through many split lines.

---

## 7. Reporting Impact

### 7.1 Budget Tracking

The budget page (`/budget`) uses `useBudgetData()`, which calls `GET /api/reports/monthly` to get per-category expense totals. This endpoint's category breakdown query must be updated (§5.6) to sum `transaction_splits.amount` for split transactions rather than `transactions.amount`. No changes to `useBudgetData()` or the budget page components are needed — they receive correct totals from the API.

### 7.2 Dashboard Category Totals

The `GET /api/dashboard/summary` endpoint includes a category breakdown for the donut/pie chart. The same query change (§5.6) applies. The dashboard's `useDashboardData()` hook and all widget components are unaffected — they receive corrected data from the API.

### 7.3 Export — CSV

Two modes, controlled by a new `expandSplits: boolean` option (default: `false`):

**Collapsed (default, `expandSplits = false`):**
Split transactions appear as a single row. The `Category` column shows `Split`. The `Amount` column shows the parent total. This is the least-surprising behavior for users who just want a list of all purchases.

**Expanded (`expandSplits = true`):**
Each split line generates its own row. The parent row is omitted. Columns: `Date`, `Description`, `Category`, `Type`, `Amount`, `PaymentMethod`, `Notes`. The `Description` column for each split row is `"[parent description] — [split description]"` if a split description exists, otherwise just the parent description.

The export UI (`/export`) gains a checkbox labeled with the `expandSplits` i18n key when the format is CSV, visible only when the transaction set includes at least one split transaction.

### 7.4 Export — XLSX (Laporan Template)

In the Laporan sheet, split transactions contribute to the category summary rows (D18:D{n} / E18:E{n}) via the split amounts, not the parent total. This is automatically correct if the `report.service.ts` query change (§5.6) is applied. The transaction table in the Laporan sheet shows the parent row with `Category = "Split"` and the total amount. Split line detail is not expanded in the XLSX template (keeps the template clean).

### 7.5 Export — PDF

Same approach as XLSX: the transaction table shows the parent row with category "Multiple" and total amount. The category breakdown summary (income/expense by category) uses the corrected split-aware totals from the service.

### 7.6 Export — JSON

The JSON export includes the full `splits` array for split transactions. This is the richest export format and is used by developers/power users, so including all data is the right default. No option needed.

### 7.7 Annual Report

The annual report aggregates monthly totals. Because the monthly totals are already split-aware (§5.6), the annual report is automatically correct with no additional changes.

---

## 8. i18n Keys

Add to `src/lib/i18n.ts`. Both EN and ID keys required.

| Key | English | Bahasa Indonesia |
|-----|---------|-----------------|
| `splitTransaction` | Split this transaction | Pisah transaksi ini |
| `splitAmount` | Split amount | Jumlah pisahan |
| `addSplit` | Add split line | Tambah baris pisahan |
| `removeSplit` | Remove split | Hapus pisahan |
| `remainingAmount` | Remaining | Sisa |
| `splitCategory` | Sub-description (optional) | Sub-deskripsi (opsional) |
| `multipleCategoriesSplit` | Multiple | Beberapa kategori |
| `totalMustMatch` | Split amounts must equal total | Jumlah pisahan harus sama dengan total |
| `splitAllocation` | Split Allocation | Alokasi Pisahan |
| `removeSplitConfirm` | Remove all splits and revert to single category? | Hapus semua pisahan dan kembalikan ke satu kategori? |
| `expandSplits` | Expand split transactions in export | Perluas transaksi pisahan saat ekspor |
| `convertToSplit` | Convert to split | Ubah ke pisahan |
| `revertToSingle` | Revert to single category | Kembalikan ke satu kategori |

Note: `multipleCategoriesSplit` and `splitAllocation` are the longest strings. Test overflow in the category chip and form heading at the ID locale, which tends to run 20–30% longer than EN.

---

## 9. Edge Cases & Risks

### 9.1 Converting an Existing Transaction to Split

When the user opens an existing single-category transaction in the edit form and clicks "Split this transaction":

1. The existing `category` and `amount` populate the **first** split line automatically (category pre-filled, amount pre-filled with the full total, description empty).
2. The user adjusts the first line's amount and adds additional lines until the remaining amount reaches zero.
3. On save, the form calls `POST /api/transactions/[id]/split`.

This prevents the user from having to re-enter the existing category and re-split the amount from scratch.

### 9.2 Editing an Existing Split Transaction

The edit form loads the transaction with its `splits` array. The split editor initializes with those lines. On save, the API does a **delete-then-recreate** of all split lines atomically (within a DB transaction). This is simpler than diffing old vs. new lines and avoids stale orphan rows.

The atomic delete-then-recreate is wrapped in a SQLite/Postgres transaction so a failure mid-way does not leave partial splits.

### 9.3 Reverting a Split to Single Category

Two paths:
- Via the form: user clicks "Remove split" → split editor collapses → user selects a category from the dropdown → saves normally. The PATCH sets `is_split = 0`, `category_id = selectedCategory`, and the service calls `deleteSplits(id)`.
- Via the API: `DELETE /api/transactions/[id]/split` with `{ categoryId, category }` in the body.

If the user removes the split but does not select a replacement category, the form shows an inline validation error on the category field (`totalMustMatch` is not appropriate here — use a standard required field error).

### 9.4 Split with Only One Line

If the user creates a "split" with exactly one line, the service treats it as a revert-to-single: `is_split = 0`, `category = splits[0].category`, `category_id = splits[0].categoryId`. No split rows are persisted. The API returns a non-split transaction. The form does not permit saving with one split line without triggering a warning: "A split needs at least two lines. Remove split or add another line."

### 9.5 Deleting a Category Used in Splits

Today, deleting a category that is referenced by transactions returns a `409 CONFLICT`. This guard must also check `transaction_splits.category_id`. The cascade-delete guard in `category.service.ts` (or repository) needs a second query:

```sql
SELECT COUNT(*) FROM transaction_splits WHERE category_id = ?
```

If count > 0, return `409 CONFLICT` with the same error code and a message mentioning split transactions.

### 9.6 Dashboard Queries Without the Fix

The most dangerous migration risk is that the dashboard or budget page continues to use the old non-split-aware category query after the DB schema lands. This would cause split transaction totals to disappear from category breakdowns (since the parent row's `category = 'Split'` does not match any budget category).

Mitigation: the query change (§5.6) must be implemented and tested **before** the UI split feature is turned on. The unit tests in §10 cover this. The testing strategy should include a specific test that asserts split amounts appear in category totals.

### 9.7 Floating-Point Tolerance on Sum Validation

IDR amounts are stored as `REAL` (SQLite) / `FLOAT8` (Postgres). Rp values are always whole numbers in practice, but division (e.g., splitting Rp 333.333 three ways) could produce float imprecision. The service uses a tolerance of ±1 IDR (0.001 in the decimal representation used internally) for the sum check.

### 9.8 Bulk Delete

`POST /api/transactions/bulk-delete` sends an array of IDs to delete. Because `transaction_splits` has `ON DELETE CASCADE`, bulk delete works correctly without any changes to the bulk-delete route.

### 9.9 Payment Method Balance Calculation

`GET /api/payment-methods/balances` sums `amount` from `transactions` grouped by `payment_method`. This is correct as-is: the parent transaction's `amount` is the total payment, and the payment method balance should reflect the full debit regardless of how it is split across categories. No change required.

### 9.10 OCR Upload Auto-Fill

The OCR upload page (`/upload`) pre-fills a `TransactionForm`. The form will have the split toggle, but the OCR data provides no split information. The split toggle starts inactive. Users can manually activate it after review. No changes to the OCR pipeline are needed.

---

## 10. Testing

All tests use Vitest. Add to the existing test suite in `src/server/services/`.

### 10.1 Split Creation

- Create a transaction with valid splits (sum equals total) → expect `is_split = 1`, `splits.length = 3`, `category = 'Split'`, `category_id = null` on the returned transaction.
- Create a transaction with `splits` array of length 1 → service treats as single-category, returns `is_split = 0`.
- Create a transaction without `splits` → unchanged behavior.

### 10.2 Split Validation

- Create with splits summing to less than total → expect `ServiceResult` with `error.code = 'SPLIT_SUM_MISMATCH'`.
- Create with splits summing to more than total → expect same error.
- Create with a split line amount of 0 → expect `error.code = 'INVALID_SPLIT_AMOUNT'` (DB constraint or service check).

### 10.3 Split Update

- Update a split transaction with new splits → old splits deleted, new splits created, sum validated.
- Update a split transaction to have 1 split line → reverts to single-category.
- Update a non-split transaction with a `splits` array → converts to split.

### 10.4 Category Budget Computation Includes Split Amounts

- Seed: one split transaction with Rp 200.000 Food + Rp 150.000 Household + Rp 150.000 Personal Care, total Rp 500.000, month = March 2026.
- Call the monthly report service for March 2026.
- Assert: category breakdown includes Food = 200.000, Household = 150.000, Personal Care = 150.000.
- Assert: the `'Split'` sentinel does not appear in the category breakdown.
- Assert: total expense = 500.000.

### 10.5 Cascade Delete Removes Splits

- Create a split transaction with 3 split lines.
- Delete the parent transaction.
- Query `transaction_splits` for the parent's ID → expect 0 rows.

### 10.6 Category Delete Guard

- Create a split transaction using category "Food".
- Attempt to delete category "Food" via `DELETE /api/categories/[id]`.
- Expect `409 CONFLICT`.

### 10.7 Export Handles Split Transactions

- Collapsed CSV export: split transaction appears as one row, category = "Split".
- Expanded CSV export: split transaction expands to 3 rows, each with its split category, sum of amounts equals parent total.
- JSON export: split transaction includes `splits` array with 3 items.

### 10.8 Single-Line Split Revert

- Create transaction with 2 splits.
- Update to 1 split line.
- Expect `is_split = 0`, `category = splits[0].category`, `splits` absent from response.
- Query `transaction_splits` for that ID → 0 rows.

---

## 11. File Inventory

### New files

| File | Purpose |
|------|---------|
| `src/server/repositories/transaction-split.repository.ts` | CRUD for `transaction_splits` table: `createSplits`, `deleteSplits`, `getSplitsByTransactionId`, `getSplitsForTransactions` |
| `src/components/transactions/SplitEditor.tsx` | Split lines editor component with running total |
| `src/components/transactions/SplitLineRow.tsx` | Single split line: category, description, amount, remove |
| `src/components/transactions/SplitBadge.tsx` | "Multiple" badge for split transactions in category column |

### Modified files

| File | Change |
|------|--------|
| `src/server/db/sqlite.ts` | Add `ALTER TABLE transactions ADD COLUMN is_split` and `CREATE TABLE transaction_splits` to schema init |
| `src/server/repositories/transaction.repository.ts` | `findAll`, `findById`: LEFT JOIN `transaction_splits`; add split batch-load; dialect-specific aggregation |
| `src/server/services/transaction.service.ts` | `createTransaction`, `updateTransaction`: handle splits array; sum validation; `deleteTransaction`: no change |
| `src/server/services/dashboard.service.ts` | Category breakdown query: exclude split parent rows, include split lines |
| `src/server/services/report.service.ts` | Same category breakdown fix for monthly/annual reports |
| `src/server/services/category.service.ts` | Delete guard: also check `transaction_splits.category_id` |
| `src/lib/types.ts` | Add `TransactionSplit`, `TransactionSplitInput`; extend `Transaction` with `isSplit`, `splits?` |
| `src/lib/api/validation.ts` | Add `transactionSplitInputSchema`, extend `createTransactionSchema` |
| `src/lib/i18n.ts` | Add 13 new EN/ID key pairs (§8) |
| `src/app/api/transactions/route.ts` | Accept `splits` in POST body |
| `src/app/api/transactions/[id]/route.ts` | Accept `splits` in PATCH body |
| `src/app/api/transactions/[id]/split/route.ts` | New: POST (convert to split), DELETE (revert to single) |
| `src/components/transactions/TransactionForm.tsx` | Add split toggle, show/hide `SplitEditor`, hide category when split active, pass splits to submit handler |
| `src/components/transactions/TransactionTable.tsx` | Expandable rows for split transactions; "Multiple" badge in category column |
| `src/lib/export-utils.ts` | CSV: `expandSplits` option; PDF/XLSX: category breakdown uses split-aware totals (automatic via service fix) |
| `src/components/export/ExportOptions.tsx` | Add "Expand split transactions" checkbox for CSV format |

---

## 12. Success Criteria

- A user can create a Rp 500.000 transaction split across 3 categories; the form prevents saving until all splits sum to Rp 500.000.
- The budget page correctly shows Rp 200.000 against Food's budget, not Rp 500.000 or Rp 0.
- The transaction list shows one row for the purchase with a "Multiple" badge; expanding it reveals 3 split lines.
- Editing the split transaction pre-populates all 3 lines; saving with different values replaces them atomically.
- Deleting the transaction removes the parent and all 3 split lines with no orphan rows.
- CSV export in collapsed mode shows 1 row; in expanded mode shows 3 rows summing to the total.
- All 84+ existing tests continue to pass (schema changes are additive; existing transactions are unaffected).
- New tests (§10) all pass, covering creation, validation, budget computation, cascade delete, and export.
- `npm run preflight` passes (typecheck + lint + format + build).

---

## 13. Open Questions

1. **Income splits.** The spec allows income splits architecturally but the UI defaults to expense context. Should the "Split this transaction" toggle be hidden for income transactions in v1? Recommendation: allow it — the mechanics are identical, and limiting it would be artificial.

2. **Split indicator icon.** `GitFork` (Lucide) communicates branching well but may be unfamiliar to non-technical users. `Layers` or `LayoutList` could also work. Decide during implementation review.

3. **Expand splits as a per-export-job setting.** The current spec adds `expandSplits` only for CSV. If users request it for XLSX or PDF, the architecture supports it — it is a flag passed to the generator. Defer to a follow-up spec if demand exists.

4. **Split description field label.** The i18n key `splitCategory` is named after its original intent but now covers the sub-description field. Consider renaming to `splitDescription` during i18n implementation for clarity. The key name does not affect UI behavior.

5. **Maximum split lines.** No hard limit is specified. The UI should handle up to ~20 lines gracefully (scrollable split editor). A soft warning at 10 lines ("This is a lot of splits — consider simplifying") is optional.
