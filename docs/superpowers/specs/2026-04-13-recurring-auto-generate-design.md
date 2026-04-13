---
feature: Recurring Transaction Auto-Generate
type: spec
date: 2026-04-13
status: approved
tier: 3
supersedes: 2026-03-27-recurring-auto-generate-design.md
---

# Recurring Transaction Auto-Generate — Final Design Spec

## Overview

Two complementary mechanisms ensure recurring transactions stay current with zero friction:

1. **Dashboard Banner** — Card banner prompts one-click generation when items are overdue. Shows each due rule with amounts and ×N multiplier. Catches edge cases (cron failures, mid-month rule additions).
2. **Vercel Cron Job** — Daily at 01:00 WIB (18:00 UTC), auto-generates all due transactions. Secured via dual check: CRON_SECRET Bearer token *or* Vercel cron header. Whitelisted from JWT middleware.

Idempotency guaranteed via `source_recurring_id` + `source_due_date` columns on the transactions table — running generate twice never creates duplicates.

## Goals

- Due recurring transactions are auto-generated daily via Vercel Cron
- Dashboard shows a card banner with due items, amounts, and one-click Generate All
- Generation is idempotent via source tracking columns (not field matching)
- Cron endpoint secured via dual check (CRON_SECRET + Vercel header), whitelisted from JWT
- Auto-generated transactions are traceable back to their source recurring rule

## Non-Goals

- No push notifications or email reminders
- No per-item schedule beyond existing frequency/start/end
- No selective per-rule generation (all-or-nothing)
- No preview/confirmation modal before generating
- No multi-user scoping (cron generates for all rules; defer per-user filtering)

---

## Part 1: Schema Changes

### ALTER: transactions table

Two new nullable columns for source tracking. Existing transactions get `NULL` (manually created). Auto-generated transactions get the rule ID and the due date they were generated for.

```sql
ALTER TABLE transactions ADD COLUMN source_recurring_id TEXT DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN source_due_date TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_source
  ON transactions(source_recurring_id, source_due_date)
  WHERE source_recurring_id IS NOT NULL;
```

**Column details:**

| Column | Type | Description |
|--------|------|-------------|
| `source_recurring_id` | TEXT, NULLABLE | References `recurring_transactions.id`. Set when auto-generated. `NULL` for manual transactions. |
| `source_due_date` | TEXT, NULLABLE | The `next_due_date` value at time of generation (YYYY-MM-DD). Used with `source_recurring_id` for idempotency. |

**Idempotency check query** (run before each insert):

```sql
SELECT id FROM transactions
WHERE source_recurring_id = ?
  AND source_due_date = ?
-- If row exists → skip insert, still advance next_due_date
-- If no row → insert transaction, then advance next_due_date
-- Both operations wrapped in a SQLite transaction for atomicity
```

**Why not a foreign key?** `source_recurring_id` is *not* a FK constraint. If a recurring rule is deleted, generated transactions remain untouched as standalone historical records. This matches the existing pattern where `transactions.payment_method` is a denormalized name string, not a FK.

**Impact on existing code:**

- `Transaction` type in `src/lib/types.ts` — add optional `sourceRecurringId?: string` and `sourceDueDate?: string`
- `transaction.repository.ts` — `create()` accepts the new columns; existing callers pass `NULL` implicitly
- `src/server/db/client.ts` — add ALTER TABLE in migration block (same pattern as `beginning_balance`)
- **No breaking changes** — columns are nullable with DEFAULT NULL; all existing queries and API responses unaffected

---

## Part 2: API Design

### New: GET /api/recurring-transactions/due

Returns due recurring rules with overdue counts and amounts. Used by the dashboard banner. JWT-protected (standard middleware).

```typescript
// Response 200
{
  data: {
    dueItems: Array<{
      id: string
      description: string
      type: 'income' | 'expense'
      amount: number
      frequency: string
      paymentMethod: string
      overdueCount: number      // periods missed
      totalAmount: number       // amount × overdueCount
    }>
    totalTransactions: number   // sum of all overdueCount
    totalIncome: number         // sum of income totalAmounts
    totalExpense: number        // sum of expense totalAmounts
  }
}
```

**How `overdueCount` is computed:** For each active rule where `next_due_date <= today`, the service counts how many periods fit between `next_due_date` and `today` using the rule's frequency. Reuses the existing `advanceDate()` logic — step forward from `next_due_date` until the date exceeds today, counting each step. Respects `end_date`.

### New: POST /api/cron/generate-recurring

Called by Vercel Cron daily. **Whitelisted from JWT middleware.** Secured via dual check:

```typescript
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const vercelHeader = request.headers.get('x-vercel-cron-signature')

  const isSecretValid = authHeader === `Bearer ${process.env.CRON_SECRET}`
  const isVercelCron = vercelHeader != null

  if (!isSecretValid && !isVercelCron) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await recurringTransactionService.generateDueTransactions()
  return Response.json({
    data: {
      generated: result.data?.generated ?? 0,
      skipped: result.data?.skipped ?? 0,
    }
  })
}
```

### Modified: POST /api/recurring-transactions/generate

Existing endpoint used by the banner's "Generate All" button. Already JWT-protected. Updated response to include richer data for the success card:

```typescript
// Updated response
{
  data: {
    generated: number       // newly created transactions
    skipped: number         // already existed (idempotency)
    totalIncome: number     // sum of generated income amounts
    totalExpense: number    // sum of generated expense amounts
  }
}
```

### Middleware Whitelist

Add `/api/cron/*` to the public paths array in `middleware.ts`:

```typescript
// Existing public paths:
'/login', '/register', '/api/auth/*', '/api/health'

// Add:
'/api/cron/*'  // Cron endpoints handle their own auth
```

### API Client Addition

Add to `src/lib/api/client.ts` under the existing `recurringTransactions` namespace:

```typescript
recurringTransactions: {
  // ... existing list, create, update, delete, generate
  due(): Promise<ApiResult<DueRecurringResponse>>
    // GET /api/recurring-transactions/due
}
```

---

## Part 3: Cron Configuration

### New file: vercel.json

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

`0 18 * * *` = 18:00 UTC = 01:00 WIB (UTC+7). Runs once daily at 1 AM Jakarta time. Vercel free tier supports 1 cron job.

### Environment Variable

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Yes (production) | Random 32-char string. Generate with `openssl rand -hex 16`. Set in `.env.local` and Vercel dashboard. |

**Startup safety check:** The cron route handler logs a warning if `CRON_SECRET` is not set. It does *not* crash the app — the cron will return 401 on every call until configured. The Vercel header fallback still works.

### Local Development

Vercel Cron doesn't run locally. Test with curl:

```bash
curl -X POST http://localhost:3000/api/cron/generate-recurring \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

The dual check design means local testing works with the Bearer token, while Vercel uses its native header.

### Execution Flow

1. Vercel fires `POST /api/cron/generate-recurring`
2. Middleware sees `/api/cron/*` → skips JWT check
3. Route handler verifies Vercel cron header → passes
4. Calls `generateDueTransactions()`
5. For each due rule: idempotency check → insert (if new) → advance `next_due_date`
6. Returns `{ generated: 12, skipped: 0 }`

---

## Part 4: Dashboard Banner Component

### Component: RecurringDueBanner

- **Location:** `src/features/dashboard/RecurringDueBanner.tsx`
- **Placement:** Above all dashboard widgets in `src/app/page.tsx`
- **Animation:** `fadeInUp` from `src/lib/motion.ts` + `AnimatePresence` for exit

```typescript
interface DueItem {
  id: string
  description: string
  type: 'income' | 'expense'
  amount: number
  frequency: string
  paymentMethod: string
  overdueCount: number
  totalAmount: number
}

interface RecurringDueBannerProps {
  dueItems: DueItem[]
  totalTransactions: number
  totalIncome: number
  totalExpense: number
  onGenerate: () => Promise<GenerateResult>
  locale: 'en' | 'id'
}
```

### State Machine (4 states)

**HIDDEN** — Component renders nothing.
When: `dueItems.length === 0` OR sessionStorage key `recurring-banner-dismissed-{YYYY-MM-DD}` exists.

**SHOWING** — Default visible state. Full-width card (rounded-2xl, gradient background, soft border) showing:
- Header: clock icon + "{N} Recurring Transactions Due" + subtitle + dismiss ✕ button
- Item list (max 5 shown): each row shows income/expense dot, description, ×N multiplier badge, and total amount in JetBrains Mono (emerald for income, red for expense)
- Overflow: "+ N more rules · Show all" toggle if > 5 items
- Actions: right-aligned "Dismiss" (ghost button) + "Generate All (N)" (primary blue button)

**GENERATING** — API call in flight.
Both buttons disabled. Spinner on Generate button. Item list stays visible. Dismiss hidden via opacity (no layout shift).

**SUCCESS** — Shown for ~2 seconds after successful generation.
Card transforms to green gradient background with centered checkmark icon, "{N} transactions generated" heading, and "+Rp X income · -Rp Y expense" subtitle. After 2s: `AnimatePresence` collapses height to 0 + opacity to 0 (300ms). Sonner toast fires simultaneously. Dashboard queries invalidated to refresh widget data.

### Overflow: "Show all" Toggle

When `dueItems.length > 5`:
- Show first 5 rules
- "+ N more rules · Show all" link toggles local `expanded` state
- Expanded list uses `staggerList` animation preset (40ms stagger)
- Toggle text changes to "Show less" when expanded

### Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Desktop (lg+) | Full-width card within max-w-7xl. Actions right-aligned. Items: name left, amount right. |
| Mobile (<640px) | Full-width, reduced padding. Actions stack full-width (Generate on top). Item amounts below name (stacked). |

### Accessibility

- `role="region"` + `aria-label="Recurring transactions due"` on banner container
- Dismiss button: `aria-label="Dismiss recurring transactions banner for today"`
- Generate button: `aria-busy="true"` during loading state
- Success state: `role="status"` + `aria-live="polite"` for screen reader announcement
- Income/expense colors supplemented with +/- prefix (not color alone)

---

## Part 5: Service Layer Changes

### Modified: generateDueTransactions()

Changes to existing method in `recurring-transaction.service.ts`:

1. **ADD** Before inserting, check `source_recurring_id + source_due_date` uniqueness
2. **ADD** Pass `sourceRecurringId` and `sourceDueDate` to transaction insert
3. **ADD** Wrap each rule's insert + advance in a SQLite transaction for atomicity
4. **ADD** Track `skipped` count + accumulate `totalIncome` / `totalExpense`
5. **CHANGE** Return type expanded:

```typescript
interface GenerateResult {
  generated: number    // newly created transactions
  skipped: number      // already existed (idempotency)
  totalIncome: number  // sum of generated income amounts
  totalExpense: number // sum of generated expense amounts
}
```

**Generation loop pseudocode:**

```
for each dueRule:
  let nextDate = rule.nextDueDate

  while nextDate <= today:
    if rule.endDate && nextDate > rule.endDate:
      deactivateRule(rule.id)
      break

    // Idempotency check
    exists = SELECT id FROM transactions
             WHERE source_recurring_id = rule.id
               AND source_due_date = nextDate

    if !exists:
      INSERT INTO transactions (..., source_recurring_id, source_due_date)
      VALUES (..., rule.id, nextDate)
      generated++
      accumulate income/expense totals
    else:
      skipped++

    nextDate = advanceDate(nextDate, rule.frequency)

  updateNextDueDate(rule.id, nextDate)
```

### New: getDueItems()

New method in `recurring-transaction.service.ts`. Returns the data needed by the dashboard banner.

```
function getDueItems(): ServiceResult<DueRecurringResponse>
  today = formatDate(new Date())
  dueRules = repo.findDue(today)  // existing query

  for each rule:
    count periods from next_due_date to today using advanceDate()
    (respects end_date)
    return { ...rule fields, overdueCount, totalAmount: amount × overdueCount }

  aggregate totalTransactions, totalIncome, totalExpense
  return { data: { dueItems, totalTransactions, totalIncome, totalExpense } }
```

### Modified: transaction.repository.ts

The `create()` method accepts two new optional fields:

```typescript
create(data: {
  // ... existing fields ...
  sourceRecurringId?: string  // NEW — nullable
  sourceDueDate?: string      // NEW — nullable
})
```

When omitted (all existing callers), the columns get `NULL`. No breaking changes.

---

## Part 6: Dashboard Hook

### New: useDueRecurring

**Location:** `src/features/dashboard/useDueRecurring.ts`

```typescript
function useDueRecurring() {
  return {
    // Data from GET /api/recurring-transactions/due
    dueItems: DueItem[],
    totalTransactions: number,
    totalIncome: number,
    totalExpense: number,
    isLoading: boolean,

    // Generate action
    generate: () => Promise<GenerateResult>,
    isGenerating: boolean,

    // Dismiss (sessionStorage)
    isDismissed: boolean,
    dismiss: () => void,

    // Computed
    hasDueItems: boolean,  // dueItems.length > 0 && !isDismissed
  }
}
```

- **Query key:** `['recurring-transactions', 'due']`
- **Refetch on:** window focus (default React Query behavior)
- **On generate success:** invalidate `['recurring-transactions']`, `['transactions']`, `['dashboard']`
- **Dismiss key:** `recurring-banner-dismissed-{YYYY-MM-DD}` in sessionStorage

### Dashboard Integration

In `src/app/page.tsx`:

```tsx
const { hasDueItems, dueItems, ... } = useDueRecurring()

return (
  <div>
    {/* Banner above all widgets */}
    <RecurringDueBanner ... />

    {/* Existing dashboard widgets */}
    <DashboardContent ... />
  </div>
)
```

The hook and banner are self-contained. Dashboard page just renders the banner — no data from `useDashboardData` needed.

---

## Part 7: i18n Keys

Added to `src/lib/i18n.ts`. Verify no duplicates with existing keys before adding.

| Key | EN | ID |
|-----|----|----|
| `recurringDue` | Recurring Transactions Due | Transaksi Berulang Jatuh Tempo |
| `recurringDueDesc` | Generate to add them to your records | Buat untuk menambahkan ke catatan Anda |
| `generateAll` | Generate All | Buat Semua |
| `generating` | Generating... | Membuat... |
| `transactionsGenerated` | transactions generated | transaksi dibuat |
| `moreRules` | more rules | aturan lagi |
| `showAll` | Show all | Tampilkan semua |
| `showLess` | Show less | Tampilkan sedikit |

String interpolation uses plain concatenation at the call site (existing pattern):
- `` `${count} ${t(locale, 'transactionsGenerated')}` `` → "12 transactions generated"
- `` `+ ${remaining} ${t(locale, 'moreRules')} · ${t(locale, 'showAll')}` `` → "+ 3 more rules · Show all"

---

## Testing

Following existing Vitest pattern in `src/__tests__/`.

### recurring-transaction-generate.service.test.ts

- generates transactions for all due rules
- sets `source_recurring_id` and `source_due_date` on generated transactions
- skips when transaction already exists for same rule + due date (idempotency)
- advances `next_due_date` even when transaction is skipped
- catches up multiple missed periods in one call
- respects `end_date` and deactivates expired rules
- returns correct `generated`, `skipped`, `totalIncome`, `totalExpense`
- returns `{ generated: 0, skipped: 0 }` when no rules are due

### recurring-transaction-due.service.test.ts

- returns empty array when no rules are due
- computes correct `overdueCount` for monthly/weekly/daily/yearly
- computes `totalAmount` as `amount × overdueCount`
- aggregates `totalTransactions`, `totalIncome`, `totalExpense` correctly
- excludes inactive rules
- stops counting at `end_date`

### cron-generate.route.test.ts

- returns 401 without auth header
- returns 401 with wrong `CRON_SECRET`
- returns 200 with correct Bearer token
- returns 200 with `x-vercel-cron-signature` header present
- returns `{ generated, skipped }` in response body

---

## Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| No recurring transactions | Banner hidden (`hasDueItems = false`). Cron runs, generates nothing, returns `{ generated: 0 }`. No error. |
| Rule has `end_date` before today | Service stops generating at `end_date`, marks rule as inactive. `getDueItems()` also respects end date in its count. |
| Cron fails (Vercel outage) | Banner catches missed items on next dashboard visit. Multi-period catch-up generates all missed transactions when cron recovers or user clicks Generate. |
| User already generated via `/recurring` page | Source tracking idempotency prevents duplicates. Cron or banner generate will skip already-created transactions. |
| `CRON_SECRET` not set in production | Console warning logged. Cron gets 401 but doesn't crash app. Vercel header still works as fallback (dual check). Banner functional regardless. |
| Recurring rule deleted after transactions generated | No FK constraint. Generated transactions persist as standalone records. `source_recurring_id` becomes a dangling reference — acceptable for historical data. |
| Multiple users (future) | Currently generates for all rules globally. When multi-user lands, cron must iterate per-user. Deferred — non-goal for this spec. |

---

## Summary of All Files

### New Files (5)

| File | Purpose |
|------|---------|
| `vercel.json` | Cron job configuration |
| `src/app/api/cron/generate-recurring/route.ts` | Cron endpoint with dual auth check |
| `src/app/api/recurring-transactions/due/route.ts` | Due items endpoint for banner |
| `src/features/dashboard/RecurringDueBanner.tsx` | Dashboard banner component (4-state) |
| `src/features/dashboard/useDueRecurring.ts` | Hook for banner data + generate + dismiss |

### Modified Files (9)

| File | Change |
|------|--------|
| `middleware.ts` | Add `/api/cron/*` to public paths |
| `src/server/db/client.ts` | ALTER TABLE migration for source columns + index |
| `src/server/services/recurring-transaction.service.ts` | Idempotency in generate + new `getDueItems()` |
| `src/server/repositories/transaction.repository.ts` | Accept `sourceRecurringId`/`sourceDueDate` in create |
| `src/lib/types.ts` | Add source fields to Transaction + DueItem + GenerateResult types |
| `src/lib/api/client.ts` | Add `recurringTransactions.due()` method |
| `src/lib/api/contracts.ts` | Add `DueRecurringResponse`, `GenerateResult` types |
| `src/lib/i18n.ts` | 8 new translation keys |
| `src/app/page.tsx` | Render `RecurringDueBanner` above dashboard widgets |
