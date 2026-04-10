---
feature: Net Worth Tracker
type: spec
date: 2026-04-10
status: approved
tier: 2
replaces: 2026-03-27-net-worth-tracker-design.md
---

# Net Worth Tracker — Design Spec

## Overview

Net worth (total assets minus total liabilities) is the single most important personal finance metric. The app already computes assets: payment method balances and savings goals. What's missing is a liabilities tracker and a historical net worth trend. This spec covers:

- A `/net-worth` page with liabilities CRUD, current net worth summary, and a 12-month trend chart
- A compact net worth widget on the dashboard
- Monthly snapshot recording (auto on first visit + manual re-record button)

## Goals

- Track named liabilities (loans, debts) with current outstanding amounts
- Compute current net worth = payment method balances + savings totals − liabilities
- Record monthly net worth snapshots for trend visualization
- Display 12-month net worth history as an area chart with per-month breakdown tooltip
- New `/net-worth` page accessible from sidebar navigation
- Net worth KPI widget on the dashboard

## Non-Goals

- No investment portfolio tracking
- No automatic bank sync
- No multi-currency handling
- No sub-categorization beyond liability type (loan / credit_card / other)
- No debt payment schedule or amortization

## Decisions Made

| Question | Decision |
|----------|----------|
| Snapshot mechanism | Auto-snapshot on first monthly page visit; manual "Re-record" button overwrites mid-month |
| `snapshot_data` column | Store JSON breakdown `{ paymentMethodBalances, savingsGoals, liabilities }` — surfaced in chart tooltip |
| Liability form | Centered Dialog (3-field: name, amount, category) |
| Dashboard widget | Yes — compact net worth + MoM change card |
| Delete undo | Undo toast (consistent with savings goals pattern) |

## Data Model

Two new DB tables added to `src/server/db/client.ts`:

```sql
CREATE TABLE IF NOT EXISTS liabilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other',  -- 'loan' | 'credit_card' | 'other'
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id TEXT PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_assets DOUBLE PRECISION NOT NULL,
  total_liabilities DOUBLE PRECISION NOT NULL,
  net_worth DOUBLE PRECISION NOT NULL,
  snapshot_data TEXT,  -- JSON: { paymentMethodBalances, savingsGoals, liabilities }
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE(month, year)
);
```

`snapshot_data` stores the asset/liability breakdown at snapshot time. Parsed and displayed in the trend chart tooltip so users can see *how* their net worth was composed in any historical month.

## API Routes

### Liabilities CRUD

| Method | Route | Body | Returns |
|--------|-------|------|---------|
| `GET` | `/api/liabilities` | — | `{ liabilities: Liability[] }` sorted by amount DESC |
| `POST` | `/api/liabilities` | `{ name, amount, category }` | `Liability` |
| `PATCH` | `/api/liabilities/[id]` | `{ name?, amount?, category? }` | `Liability` |
| `DELETE` | `/api/liabilities/[id]` | — | `{ success: true }` |

### Net Worth

**`GET /api/net-worth`** — returns current computed values + 12-month history:

```typescript
{
  current: {
    totalAssets: number,
    totalLiabilities: number,
    netWorth: number,
    breakdown: {
      paymentMethodBalances: number,
      savingsGoals: number,
    }
  },
  history: Array<{
    month: number,
    year: number,
    totalAssets: number,
    totalLiabilities: number,
    netWorth: number,
    snapshotData: {
      paymentMethodBalances: number,
      savingsGoals: number,
      liabilities: number,
    } | null
  }>
}
```

**`POST /api/net-worth/snapshot`** — reads live data, upserts into `net_worth_snapshots` for current month (`INSERT OR REPLACE`). Returns the saved snapshot. Called by:
1. Page auto-snapshot on first monthly visit (if no snapshot exists for current month)
2. Manual "Re-record" button (overwrites mid-month)

## Backend Services

### `src/server/services/liability.service.ts`

Standard CRUD service wrapping `liability.repository.ts`. Follows the exact same pattern as `bill.service.ts`: Zod validation, `ensureSeeded()`, `ServiceResult<T>` return shape.

### `src/server/services/net-worth.service.ts`

```typescript
getCurrentNetWorth(): ServiceResult<NetWorthCurrent>
// 1. listPaymentMethodBalances() → sum .balance fields
// 2. SELECT SUM(saved_amount) FROM savings_goals
// 3. SELECT SUM(amount) FROM liabilities
// 4. Returns breakdown + computed net worth

getNetWorthHistory(): ServiceResult<NetWorthSnapshot[]>
// SELECT last 12 snapshots ORDER BY year ASC, month ASC
// Parses snapshot_data JSON if present

recordSnapshot(): ServiceResult<NetWorthSnapshot>
// Calls getCurrentNetWorth() → INSERT OR REPLACE into net_worth_snapshots
// Stores snapshotData JSON with { paymentMethodBalances, savingsGoals, liabilities }
```

## Feature Module: `src/features/net-worth/`

### Hook: `useNetWorth.ts`

```typescript
export function useNetWorth() {
  return {
    current: NetWorthCurrent | null,
    history: NetWorthSnapshot[],
    liabilities: Liability[],
    isLoading: boolean,
    error: string | null,
    reload: () => void,
    // CRUD
    createLiability: (payload) => Promise<void>,
    updateLiability: (id, payload) => Promise<void>,
    deleteLiability: (id) => Promise<void>,       // optimistic + undo toast
    // Snapshot
    recordSnapshot: () => Promise<void>,
    isRecording: boolean,
    // Form state
    form: { ... },           // Dialog open/close, field state, submit
    deleteConfirm: { ... },  // id, setId, confirm
  }
}
```

Fetches `GET /api/net-worth` and `GET /api/liabilities` on mount (after `initialized`). Auto-calls `POST /api/net-worth/snapshot` on mount if `history` contains no entry for the current month.

### Components

| Component | Description |
|-----------|-------------|
| `NetWorthSummaryCard.tsx` | Gradient KPI card — current net worth, total assets, total liabilities |
| `MonthOverMonthCard.tsx` | Change vs last snapshot (amount + %). Shows `—` if fewer than 2 snapshots |
| `AssetsList.tsx` | Read-only rows: payment methods + savings goals, with subtotals |
| `LiabilitiesList.tsx` | CRUD list — name, amount, category badge, edit/delete buttons |
| `LiabilityDialog.tsx` | 3-field Dialog: name (text), amount (number), category (select) |
| `NetWorthTrendChart.tsx` | Recharts AreaChart, 12-month history, custom tooltip with `snapshotData` breakdown |
| `SnapshotButton.tsx` | Shows last-recorded timestamp; triggers re-record; disabled while `isRecording` |
| `NetWorthDashboardWidget.tsx` | Compact dashboard card — net worth + MoM delta (green/red) |

### Page: `src/app/net-worth/page.tsx`

Layout (top → bottom):

```
[NetWorthSummaryCard]    [MonthOverMonthCard]

[AssetsList]             [LiabilitiesList + LiabilityDialog]

[NetWorthTrendChart — full width]

[SnapshotButton]
```

Pure render tree — all state via `useNetWorth()`.

## Navigation

Add to Finance group in `src/features/navigation/nav-config.ts`:

```typescript
{ href: '/net-worth', labelKey: 'netWorth', icon: TrendingUp }
```

## Dashboard Integration

`useDashboardData.ts` — add `GET /api/net-worth` fetch. Pass `current` and last two history entries to `NetWorthDashboardWidget`.

## i18n Keys

| Key | EN | ID |
|-----|----|----|
| `netWorth` | "Net Worth" | "Kekayaan Bersih" |
| `netWorthPage` | "Net Worth" | "Kekayaan Bersih" |
| `assets` | "Assets" | "Aset" |
| `liabilities` | "Liabilities" | "Kewajiban" |
| `totalAssets` | "Total Assets" | "Total Aset" |
| `totalLiabilities` | "Total Liabilities" | "Total Kewajiban" |
| `noLiabilities` | "No liabilities added yet" | "Belum ada kewajiban" |
| `addLiability` | "Add Liability" | "Tambah Kewajiban" |
| `editLiability` | "Edit Liability" | "Edit Kewajiban" |
| `deleteLiability` | "Delete Liability" | "Hapus Kewajiban" |
| `liabilityName` | "Liability Name" | "Nama Kewajiban" |
| `liabilityCategory` | "Category" | "Kategori" |
| `loanType` | "Loan" | "Pinjaman" |
| `creditCardType` | "Credit Card Debt" | "Hutang Kartu Kredit" |
| `otherType` | "Other" | "Lainnya" |
| `recordSnapshot` | "Re-record snapshot" | "Catat ulang snapshot" |
| `netWorthHistory` | "Net Worth History" | "Riwayat Kekayaan Bersih" |
| `noSnapshotsYet` | "Visit this page monthly to build your net worth history." | "Kunjungi halaman ini setiap bulan untuk membangun riwayat kekayaan bersih Anda." |
| `liabilityDeleted` | "Liability deleted" | "Kewajiban dihapus" |
| `liabilitySaved` | "Liability saved" | "Kewajiban disimpan" |
| `snapshotRecorded` | "Snapshot recorded" | "Snapshot dicatat" |

## Edge Cases

| Case | Handling |
|------|---------|
| Fewer than 2 snapshots | `MonthOverMonthCard` shows `—` instead of a delta |
| No snapshots yet | Empty chart with `noSnapshotsYet` message; auto-snapshot fires on first visit |
| Snapshot already exists this month | `INSERT OR REPLACE` — upsert, no error |
| Re-record mid-month after editing liabilities | Manual "Re-record" button overwrites current month's snapshot |
| Payment method with negative balance | Included in assets as-is (can be negative); documented in UI with a tooltip note |
| Zero liabilities | `totalLiabilities = 0`, net worth = total assets |
| Very large amounts (mortgage) | JetBrains Mono for amounts; format with `formatCurrency()` |

## Testing Plan

### `src/__tests__/net-worth.service.test.ts`

| Group | Tests |
|-------|-------|
| `getCurrentNetWorth()` | Sums payment balances + savings + liabilities correctly |
| `getCurrentNetWorth()` | Zero liabilities → `totalLiabilities = 0`, net worth = assets |
| `recordSnapshot()` | Creates new record with correct values and `snapshot_data` JSON |
| `recordSnapshot()` | Second call same month upserts (overwrites) — only one row per month |
| `getNetWorthHistory()` | Returns sorted ASC, max 12 entries |
| `getNetWorthHistory()` | Returns empty array when no snapshots exist |

### `src/__tests__/liability.service.test.ts`

Standard CRUD tests: create / list / update / delete — matching pattern of `bill.service.test.ts`.

## File Changes

| File | Action |
|------|--------|
| `src/server/db/client.ts` | Add `liabilities` + `net_worth_snapshots` table DDL |
| `src/server/repositories/liability.repository.ts` | **Create** |
| `src/server/repositories/net-worth.repository.ts` | **Create** |
| `src/server/services/liability.service.ts` | **Create** |
| `src/server/services/net-worth.service.ts` | **Create** |
| `src/app/api/liabilities/route.ts` | **Create** |
| `src/app/api/liabilities/[id]/route.ts` | **Create** |
| `src/app/api/net-worth/route.ts` | **Create** |
| `src/app/api/net-worth/snapshot/route.ts` | **Create** |
| `src/features/net-worth/useNetWorth.ts` | **Create** |
| `src/features/net-worth/NetWorthSummaryCard.tsx` | **Create** |
| `src/features/net-worth/MonthOverMonthCard.tsx` | **Create** |
| `src/features/net-worth/AssetsList.tsx` | **Create** |
| `src/features/net-worth/LiabilitiesList.tsx` | **Create** |
| `src/features/net-worth/LiabilityDialog.tsx` | **Create** |
| `src/features/net-worth/NetWorthTrendChart.tsx` | **Create** |
| `src/features/net-worth/SnapshotButton.tsx` | **Create** |
| `src/features/net-worth/NetWorthDashboardWidget.tsx` | **Create** |
| `src/app/net-worth/page.tsx` | **Create** |
| `src/features/navigation/nav-config.ts` | **Modify** — add `/net-worth` to Finance group |
| `src/features/dashboard/useDashboardData.ts` | **Modify** — add net worth fetch |
| `src/lib/types.ts` | **Modify** — add `Liability`, `NetWorthCurrent`, `NetWorthSnapshot` types |
| `src/lib/i18n.ts` | **Modify** — add 18 new keys |
| `src/__tests__/net-worth.service.test.ts` | **Create** |
| `src/__tests__/liability.service.test.ts` | **Create** |
