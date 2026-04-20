---
feature: Transaction Split
type: spec
date: 2026-04-20
status: final
tier: 3
supersedes: 2026-03-27-transaction-split-design.md
---

# Transaction Split — Final Design Spec

**Date:** 2026-04-20
**Prior draft:** `2026-03-27-transaction-split-design.md`
**Scope:** Allow a single transaction to be allocated across multiple categories while preserving it as one logical event. Affects DB schema, API, services, UI forms, transaction table display, budget calculations, dashboard category totals, and export output.

---

## 1. Overview

Today every transaction belongs to exactly one category. A Rp 500.000 supermarket purchase spanning Food, Household, and Personal Care must be entered as three separate transactions — destroying the "one shopping trip" context — or entered as one transaction with an approximate category, making budget reporting inaccurate.

**Transaction Split** lets the user mark a single transaction as split, then assign sub-amounts to individual categories. The parent transaction records the total amount, payment method, date, and description. Each split line carries its own category, optional sub-description, and amount. The splits must sum to the parent total.

The feature supports both expense and income transactions. The UI shows the split toggle for both types.

---

## 2. Goals

1. Allow one transaction to be allocated across two or more categories.
2. Preserve the "one event" context — a split transaction appears as a single row in all transaction lists.
3. Ensure budget and dashboard category totals count split amounts by their individual categories, not the parent row.
4. Provide inline split validation: sum of split amounts must equal total before saving.
5. Support converting an existing single-category transaction to a split transaction without deleting and recreating it.
6. Support reverting a split back to a single-category transaction.
7. Integrate with all existing export formats (CSV, XLSX, PDF, JSON) with documented expansion behavior.
8. No migration needed for existing transactions — schema changes are additive only.

---

## 3. Non-Goals

- No split across different payment methods. All split lines share the parent's payment method.
- No split across different dates. All split lines inherit the parent's date.
- No percentage-based input. Amounts only.
- No recurring split templates.
- No nested splits.
- No split on bulk-import (OCR upload). Split can be applied later via edit.
- No UI for re-ordering split lines.
- No maximum split line limit in v1 (the split editor scrolls).

---

## 4. DB Schema

Both changes are **additive** — no existing rows are altered, no columns are dropped.

```sql
-- Add split flag to transactions table
ALTER TABLE transactions ADD COLUMN is_split INTEGER NOT NULL DEFAULT 0;

-- New normalized splits table
CREATE TABLE IF NOT EXISTS transaction_splits (
  id             TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id    TEXT REFERENCES categories(id),
  category       TEXT NOT NULL,
  amount         REAL NOT NULL CHECK (amount > 0),
  description    TEXT,
  created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_splits_transaction_id
  ON transaction_splits(transaction_id);

CREATE INDEX IF NOT EXISTS idx_splits_category_id
  ON transaction_splits(category_id);
```

**Schema decisions:**

- `is_split INTEGER` (0/1) — SQLite-compatible boolean. Postgres reads it as smallint.
- `category TEXT NOT NULL` — every split line must have a display name. `category_id` may be null for uncategorized lines, but the text label is always required.
- `amount CHECK (amount > 0)` — DB-level guard against zero-amount lines.
- `ON DELETE CASCADE` — deleting the parent transaction automatically removes all split lines.
- When `is_split = 1`, the parent row's `category = NULL` and `category_id = NULL`. No sentinel string. The `isSplit` flag drives all UI decisions. This prevents collision with any user-created category named "Split".
- When `is_split = 0`, `transaction_splits` has no rows for that transaction. Behavior identical to today.

### Migration

Changes are additive. The schema init in `src/server/db/client.ts` runs on startup via `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN`. No data backfill. All existing transactions remain valid with `is_split = 0` (the column default).

For Neon Postgres in production, `ALTER TABLE ... ADD COLUMN ... DEFAULT 0` does not rewrite the table in modern Postgres versions. Safe to run on first deploy.

---

## 5. TypeScript Types

Add to `src/lib/types.ts`:

```typescript
export interface TransactionSplit {
  id: string;
  transactionId: string;
  categoryId: string | null;
  category: string;           // always required — display name
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface TransactionSplitInput {
  categoryId: string | null;
  category: string;           // always required
  amount: number;
  description?: string | null;
}
```

Extend the existing `Transaction` interface:

```typescript
export interface Transaction {
  // ...existing fields unchanged...
  isSplit: boolean;            // new — mapped from is_split column
  splits?: TransactionSplit[]; // new — populated on isSplit=true rows; omitted otherwise
}
```

`splits` is omitted (not `null`, not `[]`) on non-split transactions to keep response payloads lean.

---

## 6. Zod Validation

Add to `src/lib/api/validation.ts`:

```typescript
export const transactionSplitInputSchema = z.object({
  categoryId: z.string().nullable(),
  category: z.string().min(1, 'Category name is required'),
  amount: z.number().positive('Split amount must be greater than zero'),
  description: z.string().nullable().optional(),
});

export const createTransactionWithSplitsSchema = createTransactionSchema.extend({
  splits: z.array(transactionSplitInputSchema).min(2).optional(),
});
```

Cross-field validation (`sum(splits[*].amount) === amount`) is enforced at the service layer. Zod validates structure; the service validates business rules. Error codes:

| Code | Condition |
|---|---|
| `SPLIT_SUM_MISMATCH` | Sum of split amounts ≠ parent total (±1 IDR tolerance) |
| `INVALID_SPLIT_COUNT` | `splits.length < 2` on create |
| `INVALID_SPLIT_AMOUNT` | Any split amount ≤ 0 (service-level pre-check before DB) |
| `CATEGORY_REQUIRED` | `splits: null` (revert) sent without `categoryId` in payload |

---

## 7. Repository Layer

### New file: `src/server/repositories/transaction-split.repository.ts`

```typescript
createSplits(transactionId: string, splits: TransactionSplitInput[]): void
// Bulk-inserts all split lines in a single DB transaction.
// Generates UUID for each split's id and current timestamp for created_at.

deleteSplits(transactionId: string): void
// DELETE FROM transaction_splits WHERE transaction_id = ?

getSplitsByTransactionId(transactionId: string): TransactionSplit[]
// SELECT * FROM transaction_splits WHERE transaction_id = ? ORDER BY created_at

getSplitsForTransactions(transactionIds: string[]): Map<string, TransactionSplit[]>
// SELECT * FROM transaction_splits WHERE transaction_id IN (...)
// Returns Map<transactionId, TransactionSplit[]> for O(1) merge.
// Returns empty Map immediately if transactionIds is empty — no query issued.
```

### Changes to `src/server/repositories/transaction.repository.ts`

**`findAll` — two-query approach:**

```
1. Run existing SELECT on transactions (paginated, filtered) — unchanged.
2. Collect ids where is_split = 1 from the result set.
3. If any exist, call getSplitsForTransactions(ids).
4. Merge: attach splits from the Map to each transaction where isSplit = true.
5. Return enriched array.
```

No `GROUP_CONCAT`, no `json_agg`, no dialect flag. When the current page has zero split transactions, step 3 is skipped entirely — zero extra queries in the common case.

**`findById`:** Same two-step pattern. Always populates `splits` (no lazy-load — the edit form always needs them).

### Changes to `src/server/services/category.service.ts`

`deleteCategory()` gains a second existence check:

```typescript
// Existing:
const txCount = await txRepo.countByCategory(id);

// New:
const splitCount = await splitRepo.countByCategory(id);
// SELECT COUNT(*) FROM transaction_splits WHERE category_id = ?

if (txCount > 0 || splitCount > 0) {
  return { error: { message: `Cannot delete "${category.name}" — it is in use`, code: 'CONFLICT' } };
}
```

---

## 8. Service Layer

### `src/server/services/transaction.service.ts`

**`createTransaction` — split path:**

```
If splits provided:
  1. splits.length >= 2 → error INVALID_SPLIT_COUNT if not
  2. Each split.amount > 0 → error INVALID_SPLIT_AMOUNT if not
  3. sum(splits[*].amount) === input.amount (±1 IDR) → error SPLIT_SUM_MISMATCH if not
  4. Set category = NULL, category_id = NULL, is_split = 1 on parent payload
  5. Begin DB transaction
     a. repo.createTransaction(parent)
     b. splitRepo.createSplits(parentId, splits)
  6. Commit (rollback on any error)
  7. Return transaction with splits attached

If splits absent → identical to today.
```

**`updateTransaction` — split path:**

```
splits: TransactionSplitInput[] (length >= 2):
  → validate sum + count
  → begin DB transaction: deleteSplits(id) then createSplits(id, splits)
  → set category=NULL, category_id=NULL, is_split=1 on parent
  → commit

splits: null (explicit revert):
  → require categoryId in payload → CATEGORY_REQUIRED if absent
  → begin DB transaction: deleteSplits(id)
  → set is_split=0, category/category_id from payload
  → commit

splits absent from payload:
  → leave splits untouched — normal field update
```

**`deleteTransaction`:** No change. `ON DELETE CASCADE` removes split lines automatically.

### Category Breakdown Query — Dashboard & Reports

Affects `dashboard.service.ts` and `report.service.ts`. Replace the existing `SUM(amount) GROUP BY category_id` with a UNION:

```sql
-- Non-split rows: use transactions directly
SELECT category_id, category, SUM(amount) AS total
FROM transactions
WHERE type = ? AND month = ? AND year = ? AND is_split = 0
GROUP BY category_id

UNION ALL

-- Split rows: use split lines
SELECT ts.category_id, ts.category, SUM(ts.amount) AS total
FROM transaction_splits ts
JOIN transactions t ON t.id = ts.transaction_id
WHERE t.type = ? AND t.month = ? AND t.year = ?
GROUP BY ts.category_id
```

Results are merged by `category_id` in the application layer. The parent row's `NULL` category never appears in breakdowns. Total income/expense figures (not category-broken-down) continue to use `transactions.amount` regardless of `is_split` — the parent total is authoritative for net figures.

This query is identical in SQLite and Postgres — no dialect branching.

---

## 9. API Routes

### `POST /api/transactions`

Accepts optional `splits` array:

```json
{
  "description": "Indomaret",
  "type": "expense",
  "amount": 500000,
  "date": "2026-03-27",
  "paymentMethodId": "pm-bca",
  "splits": [
    { "categoryId": "cat-food",      "category": "Food",          "amount": 200000 },
    { "categoryId": "cat-household", "category": "Household",     "amount": 150000 },
    { "categoryId": "cat-personal",  "category": "Personal Care", "amount": 150000 }
  ]
}
```

`splits` absent → single-category, identical to today.

### `PATCH /api/transactions/[id]`

Single endpoint for all split mutations. `splits` semantics:

| `splits` value | Effect |
|---|---|
| `[a, b, ...]` (≥ 2 items) | Set as split; delete-then-recreate |
| `null` (explicit null) | Revert to single-category; `categoryId` required in same payload |
| absent | Leave splits unchanged; normal field update |

No separate `/split` sub-routes.

### `GET /api/transactions`

```typescript
// is_split = 0 — splits field omitted
{ id, description, amount, isSplit: false, ... }

// is_split = 1 — splits always populated via two-query approach
{ id, description, amount, isSplit: true, splits: [...], ... }
```

### `GET /api/transactions/[id]`

No change to signature. `findById` always populates `splits` when `isSplit = true`.

---

## 10. UI Design

### 10.1 TransactionForm — Split Toggle

A "Split this transaction" button sits between the Category row and the Description row, styled as a subtle dashed-border affordance.

**Normal state:**

```
[Date]        [Category ▼ Food]
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  [⊕ Split this transaction]
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
[Description]
```

**Split active state:** Category row hides. Date takes full width. `SplitEditor` slides in with `fadeInUp` animation.

```
[Date ────────────────────────]

╔══ Split Allocation ══════════════════════════  [Remove split] ╗
║ [Category ▼]  [Sub-desc]     [Amount    ] [✕]                 ║
║ [Category ▼]  [Sub-desc]     [Amount    ] [✕]                 ║
║ [+ Add split line]                                             ║
║ ─────────────────────────────────────────────────────────────  ║
║ Total: Rp 500.000 │ Allocated: Rp 500.000 │ Remaining: Rp 0 ✓ ║
╚════════════════════════════════════════════════════════════════╝

[Description]
```

**Running total bar states:**
- Remaining = 0 → green checkmark (fully allocated; Save enabled)
- Remaining > 0 → amber (under-allocated; Save disabled)
- Remaining < 0 → red (over-allocated; Save disabled)

**Removing split:** "Remove split" link fires `AlertDialog` ("Remove all splits and revert to single category?") before collapsing. On confirm: editor collapses, category `<select>` is restored. First split line's category pre-fills the dropdown if exactly one line remains; otherwise dropdown resets to empty.

**One-line guard:** If only 1 split line remains, Save stays disabled with inline message: "A split needs at least 2 lines — add another or remove the split."

### 10.2 Split Line Component (`SplitLineRow`)

Each line is a horizontal row:

| Field | Control | Notes |
|---|---|---|
| Category | `<select>` (existing pattern) | Filters by parent transaction type |
| Sub-description | `<input>` (optional) | Placeholder: `splitDescription` i18n key |
| Amount | Currency input | Auto-formats IDR on blur; right-aligned |
| Remove | Icon button (✕, `tapScale`) | Always visible; the 1-line guard fires at Save time, not at remove time |

### 10.3 Animations

All from `src/lib/motion.ts` presets:

- Split editor slides in: `fadeInUp` on container
- New split lines: `staggerList` (40ms stagger, 250ms)
- Removing a line: `opacity: 0, height: 0` at 200ms
- Running total color: CSS transition only

### 10.4 Transaction Table

**Category column:** Split rows show `SplitBadge` — `PieChart` icon (Lucide) + "Multiple" text, neutral slate color. Regular rows show `CategoryChip` as today.

**Row subtitle:** "BCA Debit · 3 categories" — quick split count without expanding.

**Expand chevron:** Leftmost cell of split rows. Clicking expands an inline detail panel (local state — no API call, splits are already in the response):

```
▼  Indomaret Supermarket    [⬤ Multiple]    −500.000    27 Mar
   │ [🍔 Food]        Groceries              200.000
   │ [🏠 Household]   Cleaning supplies      150.000
   └ [💄 Personal]    Shampoo                150.000
```

Expanded lines: smaller text, left border accent, indented, no action buttons.

**Edit action:** Opens `TransactionForm` with split editor pre-populated from `transaction.splits`.

### 10.5 Mobile (< 640px)

Split editor stacks vertically per line:

```
Split line 1
[Category ▼ Food           ]
[Sub-description (optional)]
[Rp 200.000                ]
[Remove this line           ]
```

Running total bar is sticky at the bottom of the `SplitEditor` section, always visible while scrolling through lines.

---

## 11. Export & Reports

### CSV

Two modes via `expandSplits: boolean` option (default `false`):

**Collapsed (`expandSplits = false`):** Split transaction = 1 row. Category column is blank (no sentinel string). Amount = parent total.

**Expanded (`expandSplits = true`):** Parent row omitted. Each split line = its own row. Description column: `"[parent description] — [split description]"` if split description exists, else parent description only.

The export UI (`/export`) shows an "Expand split transactions" checkbox whenever CSV format is selected. No async detection — always visible for CSV.

### XLSX (Laporan Template)

Category summary rows (`D18:D{n}`) use split-aware totals from `report.service.ts` (automatic via the UNION query fix). The transaction table in the Laporan sheet shows the parent row with blank category and the total amount. Split line detail is not expanded in the template.

### PDF

Same approach as XLSX: parent row shown with blank category and total amount. Category breakdown uses corrected totals.

### JSON

Full `splits` array included for split transactions. No option — JSON is the rich format.

### Annual Report

Aggregates monthly totals. Already correct because monthly totals are split-aware.

---

## 12. i18n Keys

Add to `src/lib/i18n.ts` (both EN and ID required):

| Key | English | Bahasa Indonesia |
|---|---|---|
| `splitTransaction` | Split this transaction | Pisah transaksi ini |
| `splitAllocation` | Split Allocation | Alokasi Pisahan |
| `addSplit` | Add split line | Tambah baris pisahan |
| `removeSplit` | Remove split | Hapus pisahan |
| `removeSplitConfirm` | Remove all splits and revert to single category? | Hapus semua pisahan dan kembalikan ke satu kategori? |
| `splitDescription` | Sub-description (optional) | Sub-deskripsi (opsional) |
| `remainingAmount` | Remaining | Sisa |
| `multipleCategoriesSplit` | Multiple | Beberapa kategori |
| `totalMustMatch` | Split amounts must equal total | Jumlah pisahan harus sama dengan total |
| `expandSplits` | Expand split transactions in export | Perluas transaksi pisahan saat ekspor |

**Overflow note:** `multipleCategoriesSplit` ("Beberapa kategori") is the longest badge label — test at ID locale inside `SplitBadge`.

---

## 13. Edge Cases

**E1 — Converting existing transaction to split:** Edit form pre-fills split line 1 with the existing category + full amount. User adjusts amounts and adds lines. Saved via `PATCH` with `splits` array.

**E2 — Editing existing split:** `findById` returns transaction with all splits populated. Split editor initializes with those lines. Save triggers atomic delete-then-recreate inside a DB transaction.

**E3 — Reverting split to single:** "Remove split" → AlertDialog → confirm → editor collapses → user selects category → `PATCH` with `splits: null` + `categoryId`. If user confirms but omits category, inline required-field error on the category `<select>`.

**E4 — One split line remaining:** Save is disabled. Inline message: "A split needs at least 2 lines — add another or remove the split." Enforced in UI and at service layer.

**E5 — Deleting category used in splits:** `category.service.ts` checks both `transactions.category_id` and `transaction_splits.category_id`. Either non-zero → `409 CONFLICT`.

**E6 — NULL parent category in breakdowns:** UNION query excludes `is_split = 1` rows from the transactions side entirely. The NULL category never appears in budget or dashboard breakdowns.

**E7 — Floating-point tolerance:** Sum check uses ±1 IDR tolerance. Whole-number IDR amounts always pass. Exotic division (e.g. Rp 333.333 ÷ 3) handled by the tolerance.

**E8 — Bulk delete:** `ON DELETE CASCADE` handles split cleanup automatically. No change to the bulk-delete route.

**E9 — Payment method balance:** Uses `transactions.amount` (the parent total). Correct as-is — the full debit belongs to one payment method regardless of category split.

**E10 — OCR upload auto-fill:** Split toggle is present but inactive. No changes to the OCR pipeline. User can manually activate split after reviewing the OCR result.

---

## 14. Testing

All tests use Vitest. Add to `src/server/services/`.

**T1 — Split creation:**
- Valid splits (sum = total) → `isSplit = true`, correct split count, `category = null`, `categoryId = null` on parent
- `splits` absent → unchanged single-category behavior
- `splits.length = 1` → `INVALID_SPLIT_COUNT`

**T2 — Split validation:**
- Sum < total → `SPLIT_SUM_MISMATCH`
- Sum > total → `SPLIT_SUM_MISMATCH`
- Any split amount ≤ 0 → `INVALID_SPLIT_AMOUNT`

**T3 — Split update:**
- Update with new splits (≥ 2) → old deleted, new created, sum validated
- `splits: null` + `categoryId` → `isSplit = false`, 0 rows in `transaction_splits`
- `splits: [single_item]` → `INVALID_SPLIT_COUNT` (use `splits: null` to revert)
- Non-split updated with `splits` array → converts to split

**T4 — Category budget computation:**
- Seed: 1 split transaction (Food Rp 200k + Household Rp 150k + Personal Care Rp 150k)
- Monthly report → Food = 200k, Household = 150k, Personal Care = 150k
- `null` category absent from breakdown
- Total expense = 500k

**T5 — Cascade delete:**
- Create split tx with 3 lines → delete parent → `transaction_splits` has 0 rows for that id

**T6 — Category delete guard:**
- Category used in `transaction_splits` → `DELETE /api/categories/[id]` → `409 CONFLICT`

**T7 — Export:**
- Collapsed CSV: split tx = 1 row, category column blank
- Expanded CSV: N rows, each with split category, amounts sum to parent total
- JSON: includes `splits` array

**T8 — Two-query correctness:**
- `findAll` page with split + regular rows → splits populated on split rows only; regular rows have no `splits` key

---

## 15. File Inventory

### New files

| File | Purpose |
|---|---|
| `src/server/repositories/transaction-split.repository.ts` | `createSplits`, `deleteSplits`, `getSplitsByTransactionId`, `getSplitsForTransactions` |
| `src/components/transactions/SplitEditor.tsx` | Split lines container, running total bar, Add split line button |
| `src/components/transactions/SplitLineRow.tsx` | One line: category select, description input, amount input, remove button |
| `src/components/transactions/SplitBadge.tsx` | PieChart + "Multiple" badge for category column |

### Modified files

| File | Change |
|---|---|
| `src/server/db/client.ts` | Add `is_split` column + `transaction_splits` table + 2 indexes to schema init |
| `src/server/repositories/transaction.repository.ts` | `findAll` + `findById`: two-query split enrichment (no inline JOIN) |
| `src/server/services/transaction.service.ts` | `createTransaction`, `updateTransaction`: split array handling, sum validation, DB transaction wrapping |
| `src/server/services/dashboard.service.ts` | Category breakdown: UNION query excluding `is_split=1` parent rows |
| `src/server/services/report.service.ts` | Same UNION fix for monthly/annual category breakdown |
| `src/server/services/category.service.ts` | Delete guard: second count query against `transaction_splits.category_id` |
| `src/lib/types.ts` | Add `TransactionSplit`, `TransactionSplitInput`; extend `Transaction` with `isSplit`, `splits?` |
| `src/lib/api/validation.ts` | Add `transactionSplitInputSchema`; extend `createTransactionSchema` |
| `src/lib/i18n.ts` | 10 new EN/ID key pairs |
| `src/app/api/transactions/route.ts` | Accept `splits` in POST body |
| `src/app/api/transactions/[id]/route.ts` | Accept `splits: array \| null` in PATCH body |
| `src/components/transactions/TransactionForm.tsx` | Split toggle, `SplitEditor` show/hide, category hidden when split active, AlertDialog on remove |
| `src/components/transactions/TransactionTable.tsx` | Expandable rows, `SplitBadge` in category column, expand/collapse local state |
| `src/lib/export-utils.ts` | CSV `expandSplits` option; category column blank for collapsed split rows |
| `src/components/export/ExportOptions.tsx` | "Expand split transactions" checkbox visible when CSV format selected |

---

## 16. Success Criteria

- User creates Rp 500.000 transaction split across 3 categories; Save is disabled until Remaining = Rp 0
- Budget page shows Rp 200.000 against Food — not Rp 500.000, not Rp 0
- Transaction list shows one row with PieChart "Multiple" badge and "3 categories" subtitle; expanding reveals 3 split lines with category chips
- Editing a split transaction pre-populates all split lines; saving replaces them atomically
- Deleting the transaction removes the parent and all split lines with no orphan rows
- Deleting a category used in any split line returns 409 CONFLICT
- CSV collapsed: 1 row per split transaction; expanded: N rows summing to the parent total
- JSON export includes full `splits` array on split transactions
- All existing tests continue to pass (additive schema changes only)
- New tests T1–T8 all pass
- `npm run preflight` passes (typecheck + lint + format + build)
