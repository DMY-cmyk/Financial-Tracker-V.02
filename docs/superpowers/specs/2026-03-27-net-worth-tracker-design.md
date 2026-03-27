---
feature: Net Worth Tracker
type: spec
date: 2026-03-27
status: draft
tier: 2
---

# Net Worth Tracker — Design Spec

## Overview

Net worth (total assets minus total liabilities) is the single most important personal finance metric. The app already computes assets: payment method balances and savings goals. What's missing is a liabilities tracker and a historical net worth trend. This feature adds a `/net-worth` page with a liabilities CRUD section, current net worth summary, and a 12-month historical trend chart.

## Goals

- Track named liabilities (loans, debts) with current outstanding amounts
- Compute current net worth = payment method balances + savings totals − liabilities
- Record monthly net worth snapshots for trend visualization
- Display 12-month net worth history as a line chart
- New `/net-worth` page accessible from sidebar navigation

## Non-Goals

- No investment portfolio tracking
- No automatic bank sync
- No multi-currency handling
- No sub-categorization beyond liability type (loan/credit/other)
- No debt payment schedule or amortization

## Approaches

### Option A — Compute on-the-fly + snapshot on demand (Recommended)
Current net worth computed fresh from existing APIs. A "Record Snapshot" button persists the current value for historical tracking. Snapshots can also be auto-created (upsert) on first page visit per month.

**Pros:** Always accurate for current value. Historical trend builds naturally over time.
**Cons:** Historical data starts from first use.

### Option B — Scheduled snapshots only (cron)
Net worth history only via daily/monthly cron snapshots.

**Cons:** No history before cron starts; depends on cron infrastructure.

### Option C — Real-time only (no history)
Show current net worth, no trend chart.

**Cons:** Loses the most valuable insight (trend over time). Too limited.

**Recommendation: Option A.** Auto-snapshot on monthly first visit + manual snapshot button. Simple and progressive.

## Design

### New DB Tables

```sql
CREATE TABLE liabilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other',  -- 'loan' | 'credit_card' | 'other'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE net_worth_snapshots (
  id TEXT PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_assets REAL NOT NULL,
  total_liabilities REAL NOT NULL,
  net_worth REAL NOT NULL,
  snapshot_data TEXT,  -- JSON: { paymentMethodBalances, savingsGoals, liabilities }
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(month, year)   -- one snapshot per month
);
```

### New API Routes

**Liabilities CRUD:**
- `GET /api/liabilities` → list all, sorted by amount DESC
- `POST /api/liabilities` → create `{ name, amount, category }`
- `PATCH /api/liabilities/[id]` → update `{ name?, amount?, category? }`
- `DELETE /api/liabilities/[id]` → delete

**Net Worth:**
- `GET /api/net-worth` → current net worth + 12-month history
  ```typescript
  {
    current: {
      totalAssets: number,
      totalLiabilities: number,
      netWorth: number,
      breakdown: {
        paymentMethodBalances: number,
        savingsGoals: number,
        liabilities: number
      }
    },
    history: Array<{
      month: number, year: number,
      totalAssets: number, totalLiabilities: number, netWorth: number
    }>  // last 12 snapshots, sorted ASC
  }
  ```
- `POST /api/net-worth/snapshot` → upsert snapshot for current month
  - Reads current assets from balance.service + savings_goals table
  - Reads current liabilities from liabilities table
  - Computes net worth
  - Upserts into `net_worth_snapshots` (UNIQUE on month/year)

### New Service: `src/server/services/net-worth.service.ts`

```typescript
getCurrentNetWorth(): ServiceResult<NetWorthCurrent>
getNetWorthHistory(): ServiceResult<NetWorthSnapshot[]>
recordSnapshot(): ServiceResult<NetWorthSnapshot>
```

`getCurrentNetWorth()`:
1. Calls balance service to get per-payment-method balances, sum them
2. Queries `savings_goals` for `SUM(saved_amount)`
3. Queries `liabilities` for `SUM(amount)`
4. Returns breakdown + net worth

### New Service: `src/server/services/liability.service.ts`

Standard CRUD wrapping `liability.repository.ts`.

### New Page: `src/app/net-worth/page.tsx`

Layout:
```
[Net Worth Summary Card]     [Month-over-Month Change Card]

[Assets Section]             [Liabilities Section]
  - Payment Methods              - Liability list (CRUD)
  - Savings Goals                - [+ Add Liability]
  - Total Assets                 - Total Liabilities

[Net Worth Trend Chart - full width, 12 months]

[Record Snapshot Button]
```

**Auto-snapshot on first monthly visit:**
On page load, if no snapshot exists for the current month (check history array), automatically call `POST /api/net-worth/snapshot`. This builds history passively without user action.

### Feature Module: `src/features/net-worth/`

**Components:**
- `NetWorthSummaryCard.tsx` — large KPI: current net worth + change vs last snapshot (green/red)
- `AssetsList.tsx` — read-only: payment method balances + savings totals, subtotals
- `LiabilitiesList.tsx` — CRUD list: each liability with name, amount, category badge, edit/delete
- `LiabilityForm.tsx` — add/edit form: name (text), amount (IDR), category (select: Loan/Credit/Other)
- `NetWorthTrendChart.tsx` — LineChart (Recharts): 12-month history, Y-axis in IDR
- `SnapshotButton.tsx` — "Record this month's net worth" with last-recorded timestamp

**Hook:** `src/features/net-worth/useNetWorth.ts`
```typescript
export function useNetWorth() {
  // Fetches GET /api/net-worth
  // Returns: current, history, liabilities (list), isLoading, error
  // CRUD: createLiability, updateLiability, deleteLiability
  // Actions: recordSnapshot
}
```

### Navigation

Add to Finance group in `src/features/navigation/nav-config.ts`:
```typescript
{ label: 'netWorth', href: '/net-worth', icon: TrendingUp }
```

## i18n Keys

| Key | EN | ID |
|-----|----|----|
| `netWorth` | "Net Worth" | "Kekayaan Bersih" |
| `assets` | "Assets" | "Aset" |
| `liabilities` | "Liabilities" | "Kewajiban" |
| `totalAssets` | "Total Assets" | "Total Aset" |
| `totalLiabilities` | "Total Liabilities" | "Total Kewajiban" |
| `addLiability` | "Add Liability" | "Tambah Kewajiban" |
| `editLiability` | "Edit Liability" | "Edit Kewajiban" |
| `liabilityName` | "Liability Name" | "Nama Kewajiban" |
| `loanType` | "Loan" | "Pinjaman" |
| `creditCardType` | "Credit Card Debt" | "Hutang Kartu Kredit" |
| `otherType` | "Other" | "Lainnya" |
| `recordSnapshot` | "Record Snapshot" | "Catat Snapshot" |
| `netWorthHistory` | "Net Worth History" | "Riwayat Kekayaan Bersih" |
| `noSnapshotsYet` | "Start tracking your net worth trend by visiting this page monthly." | "Mulai lacak tren kekayaan bersih Anda dengan mengunjungi halaman ini setiap bulan." |

## Testing

- `getCurrentNetWorth()`: sums payment balances + savings + liabilities correctly
- `recordSnapshot()`: creates new record; second call in same month updates (upsert)
- Liability CRUD: create/update/delete work correctly
- `getNetWorthHistory()`: returns sorted ASC, max 12 snapshots
- Net worth with zero liabilities: `totalLiabilities = 0`, net worth = assets

## Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| Credit card payment methods in assets and liabilities separately | Document clearly in UI: payment methods (regardless of type) go in Assets; manual liabilities are separate entries. Users decide what to include. |
| Snapshot already exists for this month | `UNIQUE(month, year)` constraint + upsert via `INSERT OR REPLACE` |
| No snapshots yet | Empty history chart with friendly empty state; "Record Snapshot" button prominently shown |
| Snapshot taken then liabilities change mid-month | Snapshot is a point-in-time record; current net worth always computed live |
| Very large liabilities (mortgage) | Handle large IDR numbers — use JetBrains Mono for amounts, format with millions/billions (Rp 500 jt) |
