---
feature: Cash Flow Forecast
type: spec
date: 2026-03-27
status: draft
tier: 2
---

# Cash Flow Forecast — Design Spec

## Overview

Knowing you'll have a budget shortfall in March *in January* lets you act on it. This feature adds a forward-looking cash flow projection to the Reports page, using the existing `recurring_transactions` table to project expected income and expenses 6 months ahead. It shows a chart that extends the current CashFlowChart into the future, a "this month projected vs actual" KPI, and a breakdown of recurring items per month.

## Goals

- Project next 6 months of income and expenses from active recurring transactions
- Show "Expected this month" vs "Actual so far" side-by-side KPI card
- Extend the CashFlowChart into the future with a dashed-line projection segment
- List recurring items contributing to each projected month
- Display on the Reports page as a new "Forecast" tab or section

## Non-Goals

- No ML/prediction beyond recurring transactions
- No variable expense projection (only what's explicitly defined as recurring)
- No push/email notifications for projected shortfalls
- Projections are clearly labeled as estimates, not guarantees

## Approaches

### Option A — Server-side `/api/forecast` endpoint (Recommended)
New endpoint computes projections from `recurring_transactions` table. Client only renders.

**Pros:** All computation in one place, testable server-side, no large data transfer.

### Option B — Client-side computation from recurring transactions data
Fetch `GET /api/recurring-transactions` and compute in a hook.

**Cons:** Recurring transactions data is already available, but date math for multiple frequency types is complex and error-prone client-side. Better to test in isolation server-side.

### Option C — Extend reports/trends endpoint
Adds forecast to existing trends response.

**Cons:** Conflates historical and projected data; harder to distinguish in tests.

**Recommendation: Option A.** Clean separation, server-side date math, testable.

## Forecast Algorithm

For each future month `M` in `[currentMonth+1 ... currentMonth+N]`:

**Monthly frequency:** Always included. `occurrences = 1`. Amount = `tx.amount`.

**Yearly frequency:** Included only if `tx.start_date`'s month matches `M`'s month. Amount = `tx.amount`.

**Weekly frequency:** Count occurrences of the transaction's day-of-week within month `M`.
```
const startOfMonth = new Date(M.year, M.month, 1)
const endOfMonth = new Date(M.year, M.month + 1, 0)
const txDayOfWeek = new Date(tx.next_due_date).getDay()
count = number of days in [startOfMonth..endOfMonth] where day.getDay() === txDayOfWeek
```
Total = `count × tx.amount`

**Daily frequency:** Total = `daysInMonth(M) × tx.amount`

**Eligibility filters:**
- `tx.is_active = 1`
- `tx.start_date <= lastDayOfMonth(M)` (transaction started by this month)
- `tx.end_date IS NULL OR tx.end_date >= firstDayOfMonth(M)` (hasn't ended)

**Current month actuals:**
- Income and expense so far this month from the `transactions` table
- "Expected" = actual so far + projection from recurring items not yet due this month

## Design

### New API: `GET /api/forecast?months=6`

**Response:**
```typescript
interface ForecastResponse {
  currentMonth: {
    month: number; year: number
    actualIncome: number; actualExpense: number    // from transactions table
    projectedIncome: number; projectedExpense: number  // from recurring items
    projectedNet: number  // (actual + projected income) - (actual + projected expense)
  }
  forecast: Array<{
    month: number; year: number
    projectedIncome: number; projectedExpense: number; projectedNet: number
    recurringItems: Array<{
      description: string; type: 'income' | 'expense'; amount: number
      frequency: string; occurrences: number
    }>
  }>
}
```

### New Service: `src/server/services/forecast.service.ts`

```typescript
getForecast(months: number): ServiceResult<ForecastResponse>
```

Key method: `computeOccurrences(tx: RecurringTransaction, month: number, year: number): number`

Full date math implemented and unit-tested for all four frequency types.

### Page Integration: Reports page (`src/app/reports/page.tsx`)

Add a "Forecast" tab to the Reports page (alongside existing "Trends" and "Annual" views).

Tab layout:
```
Tabs: [Trends] [Annual] [Forecast]  ← new tab

Forecast tab content:
  [CurrentMonthForecastCard]   ← "Expected vs Actual" this month
  [ForecastChart]              ← combined history + projection chart
  [ForecastBreakdownList]      ← month-by-month recurring items
```

### Feature Module: `src/features/reports/` (extend existing)

**New Components:**

`ForecastChart.tsx`
- Combined AreaChart (Recharts)
- Left portion: past 6 months actual data (solid area, from existing trends API)
- Right portion: next 6 months projected (dashed stroke, lower opacity)
- Vertical divider line at "today" boundary with label "Today"
- Two series: Income (emerald) and Expense (red)
- Tooltip: shows "Actual" or "Projected" label

`CurrentMonthForecastCard.tsx`
- KPI card: "Expected This Month"
- Income row: "Actual Rp X.XXX + Expected Rp Y.YYY = Total Rp Z.ZZZ"
- Expense row: same pattern
- Net row: color-coded (green if positive, red if negative)
- Disclaimer: "Based on recurring transactions only"

`ForecastBreakdownList.tsx`
- Accordion list: one item per projected month
- Expand to see recurring items contributing to that month
- Each item: description, frequency badge, amount (income=green, expense=red)
- Summary per month: projected income / expense / net

**Hook:** `src/features/reports/useForecastData.ts`
```typescript
export function useForecastData(months = 6) {
  // Fetches GET /api/forecast?months={months}
  // Returns { data, isLoading, error }
}
```

Combined chart also needs historical data from existing `useReportsData()` hook.

## i18n Keys

| Key | EN | ID |
|-----|----|----|
| `forecast` | "Forecast" | "Proyeksi" |
| `cashFlowForecast` | "Cash Flow Forecast" | "Proyeksi Arus Kas" |
| `expectedThisMonth` | "Expected This Month" | "Proyeksi Bulan Ini" |
| `actualSoFar` | "Actual so far" | "Aktual sejauh ini" |
| `projected` | "Projected" | "Proyeksi" |
| `projectedIncome` | "Projected Income" | "Proyeksi Pemasukan" |
| `projectedExpense` | "Projected Expense" | "Proyeksi Pengeluaran" |
| `projectedNet` | "Projected Net" | "Proyeksi Bersih" |
| `forecastBasis` | "Based on recurring transactions only" | "Berdasarkan transaksi berulang saja" |
| `noRecurringForForecast` | "No recurring transactions to project" | "Tidak ada transaksi berulang untuk diproyeksikan" |
| `forecastMonths` | "{n} month forecast" | "Proyeksi {n} bulan" |

## Testing

- `computeOccurrences('monthly', ...)`: returns 1 for any month within active range
- `computeOccurrences('weekly', March 2026)`: returns correct count of Mondays (4 or 5)
- `computeOccurrences('daily', February 2026)`: returns 28 (non-leap year)
- `computeOccurrences('yearly', tx startMonth=3, forecastMonth=3)`: returns 1; returns 0 for other months
- Eligibility: transaction with `end_date` before forecast month is excluded
- Eligibility: transaction with `start_date` after forecast month end is excluded
- `getForecast()`: returns correct number of months in response array
- API route: `months` param defaults to 6, max 12

## Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| No recurring transactions | `forecast` shows all zeros; `ForecastChart` shows projection as flat line; message "No recurring transactions" shown |
| February 29 (leap year) for yearly frequency | Use `new Date(year, month, 0).getDate()` for days-in-month — handles leap years correctly |
| Weekly transaction end_date before month end | Only count occurrences up to end_date within the month |
| Recurring transaction added this month | `next_due_date` may be within current month; include in current-month projection |
| Chart data alignment | Historical data from trends API (month/year indexed) must align with forecast data (same index format) |
| Label clarity | Every projected data point must be visually distinct from actual data (dashed, lower opacity, "Projected" label) to prevent users confusing estimates with actuals |
