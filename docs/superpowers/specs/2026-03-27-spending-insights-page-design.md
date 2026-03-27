---
feature: Spending Insights Page
type: spec
date: 2026-03-27
status: draft
tier: 2
---

# Spending Insights Page — Design Spec

## Overview

The dashboard and reports pages show *what* was spent. Insights shows *why it matters* and *what's changing*. A dedicated `/insights` page surfaces spending patterns, category trends, day-of-week habits, unusual transactions, and savings rate trajectory. This transforms the app from a tracker into an advisor.

## Goals

- Surface month-over-month category spending changes with % deltas
- Show the top 5 biggest transactions of the current month
- Visualize day-of-week spending patterns
- Flag anomalous transactions (outliers vs typical spend per category)
- Show 6-month savings rate trend

## Non-Goals

- No ML/AI-based recommendations
- No peer benchmarking (compare to other users)
- No editing from this page (read-only analytics)
- No custom date ranges in v1 (month/year from Zustand UI state)

## Approaches

### Option A — All computation server-side in new `/api/insights` endpoint (Recommended)
New `insights.service.ts` computes all analytics in a single DB-aggregated response. Client just renders.

**Pros:** DB aggregations are far faster than fetching all transactions client-side, scales to large datasets, clean separation of concerns.
**Cons:** New service + API route needed.

### Option B — Client-side computation from existing APIs
Fetch all transactions via existing API and compute insights in the hook.

**Cons:** Fetches thousands of transactions over the network; heavy client computation; doesn't scale; defeats the purpose of having a DB.

### Option C — Mixed: most server-side, day-of-week client-side
Day-of-week pattern requires iterating all transactions for the month anyway.

**Recommendation: Option A.** Single endpoint, all server-side. Day-of-week pattern is computationally trivial in SQL with strftime.

## Design

### New API: `GET /api/insights/spending?month=0..11&year=YYYY`

**Response shape:**
```typescript
interface SpendingInsightsResponse {
  categoryComparison: Array<{
    categoryId: string
    category: string
    color: string
    thisMonth: number
    lastMonth: number
    changePct: number | null  // null if lastMonth === 0
    changeDelta: number       // thisMonth - lastMonth (signed)
  }>
  biggestTransactions: Array<{
    id: string
    description: string
    amount: number
    date: string
    category: string
    color: string
    paymentMethod: string
  }>  // top 5 by amount DESC
  dayOfWeekPattern: Array<{
    dayIndex: number    // 0=Sunday, 1=Monday, ..., 6=Saturday
    dayName: string     // "Sunday", "Monday", etc.
    totalAmount: number
    count: number
    avgAmount: number
  }>  // 7 items
  anomalies: Array<{
    id: string
    description: string
    amount: number
    date: string
    category: string
    color: string
    categoryAvg: number    // 3-month average for this category
    deviationPct: number   // (amount / categoryAvg - 1) * 100
  }>  // transactions where amount > 2x category 3-month average
  savingsRateTrend: Array<{
    month: number
    year: number
    income: number
    expense: number
    savingsRate: number  // (income - expense) / income * 100
  }>  // last 6 months
  period: { month: number; year: number }
}
```

### New Service: `src/server/services/insights.service.ts`

**`getSpendingInsights(month: number, year: number): ServiceResult<SpendingInsightsResponse>`**

Key queries:
- `categoryComparison`: Two GROUP BY queries (this month + last month) joined by category_id
- `biggestTransactions`: SELECT TOP 5 by amount for month/year
- `dayOfWeekPattern`: `GROUP BY strftime('%w', date)` — returns day index 0-6
- `anomalies`: Subquery computes per-category average over last 3 months; outer query finds transactions > 2x average
- `savingsRateTrend`: Monthly GROUP BY for last 6 months, income/expense sums

### New Page: `src/app/insights/page.tsx`

Layout (responsive grid):
```
[Period header: "March 2026 Insights"]

[CategoryComparisonChart]     [BiggestTransactionsCard]
      (full width)                  (right column)

[DayOfWeekHeatmap]
      (full width)

[AnomalyAlerts]               [SavingsRateTrendChart]
   (left column)                    (right column)
```

Month/year comes from Zustand `ui.month` / `ui.year` (same as dashboard).

### Feature Module: `src/features/insights/`

**Components:**

`CategoryComparisonChart.tsx`
- Horizontal bar chart (Recharts BarChart, layout="vertical")
- Two bars per category: thisMonth (blue) vs lastMonth (gray)
- Change percentage badge: `↑12%` (red for increase, green for decrease — for expenses, less is better)
- Sorted by thisMonth DESC
- Max 8 categories shown; "other" bucket for the rest

`BiggestTransactionsCard.tsx`
- List of 5 biggest transactions
- Amount in JetBrains Mono (red for expense)
- Category chip colored badge
- Date formatted

`DayOfWeekHeatmap.tsx`
- 7-column bar chart (BarChart)
- X-axis: Mon–Sun (week-start Monday)
- Y-axis: total IDR spent
- Tooltip: count + avg amount
- Highlight bar for highest-spending day (amber)

`AnomalyAlert.tsx`
- Card per anomalous transaction
- "This is 3.2× your typical spend on Dining"
- Shows categoryAvg and actual amount
- If no anomalies: cheerful empty state "No unusual spending this month"

`SavingsRateTrendChart.tsx`
- LineChart (Recharts)
- X-axis: last 6 months
- Y-axis: savings rate %
- Color: green above 20%, amber 0-20%, red negative
- Reference line at 20% (good savings rate benchmark)

**Hook:** `src/features/insights/useInsightsData.ts`
```typescript
export function useInsightsData(month: number, year: number) {
  // fetches GET /api/insights/spending?month=&year=
  // returns { data, isLoading, error }
}
```

### Navigation

Add "Insights" to Finance group in `src/features/navigation/nav-config.ts`:
```typescript
{ label: 'insights', href: '/insights', icon: TrendingUp }
```

Add i18n key `insights` in EN/ID.

## i18n Keys

| Key | EN | ID |
|-----|----|----|
| `insights` | "Insights" | "Analitik" |
| `spendingInsights` | "Spending Insights" | "Analitik Pengeluaran" |
| `topCategories` | "Top Categories" | "Kategori Teratas" |
| `vsLastMonth` | "vs last month" | "vs bulan lalu" |
| `biggestTransactions` | "Biggest Transactions" | "Transaksi Terbesar" |
| `spendingByDay` | "Spending by Day of Week" | "Pengeluaran per Hari" |
| `unusualTransactions` | "Unusual Spending" | "Pengeluaran Tidak Biasa" |
| `noAnomalies` | "No unusual spending this month" | "Tidak ada pengeluaran tidak biasa bulan ini" |
| `savingsRateTrend` | "Savings Rate Trend" | "Tren Tingkat Tabungan" |
| `typicalSpend` | "Typical spend" | "Pengeluaran tipikal" |
| `timesTypical` | "×  your typical" | "× biasanya" |

## Testing

- `getSpendingInsights()`: unit tests for each computation (category comparison, anomaly detection, day-of-week)
- Anomaly detection: transaction 2.1× avg should appear; 1.9× should not
- Day-of-week: GROUP BY returns 7 rows even if some days have 0 spend
- API route: returns correct shape with valid month/year params
- Edge: month with no transactions → all zeroes, no crashes

## Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| No transactions this month | All sections show empty state with helpful message |
| < 3 months of data (new user) | `categoryComparison.lastMonth` = 0, `changePct` = null; anomaly detection skips (not enough baseline); savings trend shows available months only |
| Category with one expensive transaction ever | `categoryAvg` is that one amount; anomaly threshold is 2× it — unlikely to false-positive |
| Division by zero in savings rate | If income === 0, savingsRate = 0 (not -∞) |
| Performance with many transactions | Use DB aggregation (GROUP BY) not JS iteration; add indexes on date+type+category_id if missing |
| Day-of-week locale | Use dayIndex numbers; map to localized day names in the component using `date-fns` locale |
