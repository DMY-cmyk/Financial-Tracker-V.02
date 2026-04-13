---
feature: Spending Insights Page
type: spec
date: 2026-04-13
status: approved
tier: 2
supersedes: 2026-03-27-spending-insights-page-design.md
---

# Spending Insights Page — Final Design Spec

## Overview

A dedicated `/insights` page that answers "what's changing in my spending?" — transforming the app from a tracker into an advisor. Five widgets on a single page, all computed server-side in a single API call:

1. **Monthly Health Score** — KPI card with savings rate, color ring, comparison to last month
2. **Category Comparison** — horizontal bar chart showing this month vs last month per category with % change badges
3. **Biggest Transactions** — top 5 expense transactions this month
4. **Day-of-Week Pattern** — inline pill row with heatmap-style opacity, summary sentence
5. **Unusual Spending** — top 5 outliers ranked by absolute delta from 3-month category average

## Goals

- Surface month-over-month category spending changes with % deltas
- Show the top 5 biggest transactions of the current month
- Visualize day-of-week spending habits via compact inline pill row
- Surface top 5 spending outliers ranked by absolute delta from category average
- Show a monthly health score KPI with savings rate + comparison to prior month

## Non-Goals

- No ML/AI-based recommendations
- No custom date ranges in v1 (month/year from Zustand UI state)
- No editing from this page (read-only analytics)
- No 6-month savings trend chart (Reports page already covers this in its monthly breakdown table)
- No peer benchmarking (compare to other users)

---

## Part 1: API Design

### New: GET /api/insights/spending?month=0..11&year=YYYY

JWT-protected (standard middleware). Returns all 5 insight computations in one response.

```typescript
interface SpendingInsightsResponse {
  // 1. Category comparison: this month vs last month (expense only)
  categoryComparison: Array<{
    categoryId: string
    category: string
    color: string
    thisMonth: number
    lastMonth: number
    changePct: number | null  // null if lastMonth === 0
    changeDelta: number       // thisMonth - lastMonth (signed)
  }>

  // 2. Top 5 biggest expense transactions
  biggestTransactions: Array<{
    id: string
    description: string
    amount: number
    date: string
    category: string
    color: string
    paymentMethod: string
  }>  // top 5 by amount DESC, expense only

  // 3. Day-of-week spending pattern (expense only)
  dayOfWeekPattern: Array<{
    dayIndex: number     // 0=Sunday .. 6=Saturday
    totalAmount: number
    count: number
    avgAmount: number
  }>  // always 7 items (zero-fill days with no spend)

  // 4. Top 5 spending outliers by absolute delta
  outliers: Array<{
    id: string
    description: string
    amount: number
    date: string
    category: string
    color: string
    categoryAvg: number     // 3-month per-transaction avg for category
    delta: number           // amount - categoryAvg (always positive)
    multiplier: number      // amount / categoryAvg
  }>  // top 5 by delta DESC, min delta Rp 50.000

  // 5. Monthly health score
  healthScore: {
    income: number
    expense: number
    savingsRate: number       // (income-expense)/income*100, 0 if no income
    lastMonthRate: number | null // null if no prior month data
    rateChange: number | null   // savingsRate - lastMonthRate
  }

  period: { month: number; year: number }
}
```

### API Client Addition

Add to `src/lib/api/client.ts`:

```typescript
insights: {
  spending(month: number, year: number): Promise<ApiResult<SpendingInsightsResponse>>
    // GET /api/insights/spending?month={month}&year={year}
}
```

---

## Part 2: Service Layer

### New: src/server/services/insights.service.ts

**`getSpendingInsights(month: number, year: number): ServiceResult<SpendingInsightsResponse>`**

Five query groups:

**Query 1 — categoryComparison:**
Two `GROUP BY category_id` queries — this month's expenses and last month's expenses. Full outer join in JS (left join both results by categoryId). Compute `changePct` and `changeDelta`. Sort by thisMonth DESC. Max 8 categories; bucket remainder into "Other" with summed amounts.

**Query 2 — biggestTransactions:**
`SELECT` top 5 expense transactions for month/year `ORDER BY amount DESC LIMIT 5`. Join categories for color.

**Query 3 — dayOfWeekPattern:**
`GROUP BY strftime('%w', date)` for expense transactions in month/year. Returns day indexes 0-6. Zero-fill missing days in JS to always return 7 items. Compute `avgAmount = totalAmount / count` (0 for zero-spend days).

**Query 4 — outliers:**
Subquery: per-category average transaction amount over last 3 months (expense only). Outer query: this month's expense transactions joined to category averages. Compute `delta = amount - categoryAvg`. Filter `delta >= 50000`. Order by delta DESC, LIMIT 5. Join categories for color. If < 3 months of data exist, return empty array (not enough baseline).

**Query 5 — healthScore:**
Two `SUM(amount) GROUP BY type` queries — this month and last month. Compute savingsRate for both. Compute rateChange = this - last. If income === 0, savingsRate = 0 (no division by zero).

### Performance Notes

- All queries use existing indexes: `idx_transactions_date`, `idx_transactions_category_id`, `idx_transactions_type`
- SQLite `strftime('%w', date)` is efficient on indexed date column
- Outlier subquery scans 3 months of expenses — bounded, not full table
- Response payload is small: max 8 categories + 5 transactions + 7 days + 5 outliers + 1 KPI

---

## Part 3: Components & Page Layout

### Feature Module: src/features/insights/

**New files (7 components + 1 hook):**

| File | Responsibility |
|------|---------------|
| `useInsightsData.ts` | React Query hook — fetches `GET /api/insights/spending`, returns data + isLoading |
| `HealthScoreCard.tsx` | Circular ring with savings rate %. Ring color: emerald >20%, amber 0-20%, red <0%. Comparison text + income/expense summary |
| `CategoryComparisonChart.tsx` | Recharts horizontal BarChart (layout="vertical"). Blue (this month) + gray (last month) bars. % change badge: red for increase, green for decrease (inverted — expenses, less is better). Max 8 categories + "Other" bucket |
| `BiggestTransactionsCard.tsx` | Simple list of 5 items. Description, category + date in muted text, amount in red monospace. Stagger animation |
| `DayOfWeekPills.tsx` | 7 pill badges in flex row. Opacity maps to relative spending intensity (normalized 0.15–0.6). Top 2 days get amber highlight. Amount below each pill. Summary: "You spend most on Saturdays". Day names via date-fns locale. Pure Tailwind — no Recharts |
| `OutlierAlerts.tsx` | Card per outlier with amber left border. Shows multiplier text "4.2× your typical Shopping spend", actual amount, typical amount. Empty state: "No unusual spending this month" with checkmark |

### Page: src/app/insights/page.tsx

Page layout (responsive grid, max-w-7xl):

```
Desktop (lg+):
┌─────────────────────────────────────────────────┐
│ Health Score KPI (full width)                    │
├───────────────────────────┬─────────────────────┤
│ Category Comparison (2/3) │ Biggest Txns (1/3)  │
├───────────────────────────┴─────────────────────┤
│ Day-of-Week Pills (full width)                   │
├─────────────────────────────────────────────────┤
│ Unusual Spending (full width)                    │
└─────────────────────────────────────────────────┘

Mobile (<640px):
All widgets stack single column, full width.
Health Score compact (centered ring + text).
Category bars stack vertically.
Pill row shrinks gracefully (smaller pills).
```

Month/year comes from Zustand `ui.month` / `ui.year` (same as dashboard, controlled by top bar navigation).

### Responsive Grid

| Row | Desktop (lg+) | Mobile (<640px) |
|-----|---------------|-----------------|
| 1 | Health Score — full width | Health Score — full width, compact |
| 2 | Category (2/3) + Biggest (1/3) | Category full → Biggest full (stacked) |
| 3 | Day of Week — full width | Day of Week — full width (pills shrink) |
| 4 | Unusual Spending — full width | Unusual Spending — full width |

### Animations

- Page sections use `fadeInUp` entrance from `src/lib/motion.ts`
- BiggestTransactionsCard and OutlierAlerts use `staggerList` preset (40ms stagger)
- DayOfWeekPills: pills fade in with subtle stagger on mount
- All animations respect `prefers-reduced-motion`

### Accessibility

- Page has `role="main"` with `aria-label` for the insights region
- HealthScoreCard ring has `aria-label` describing the percentage
- CategoryComparisonChart: data table fallback not needed (Recharts provides tooltips + bar labels)
- DayOfWeekPills: amounts shown as text (not color-only)
- OutlierAlerts: multiplier text provides context beyond color coding
- All user-facing strings via `t(locale, key)` i18n function

---

## Part 4: Navigation

### Sidebar (desktop)

Add "Insights" as the **first item** in the Tools group in `src/features/navigation/nav-config.ts`:

```typescript
{ href: '/insights', labelKey: 'insights', icon: TrendingUp }
```

Placed before Reports, Upload, Export.

### Bottom Nav (mobile)

Add "Insights" to the **More drawer** items in `src/components/layout/BottomNav.tsx`. No change to the 4 main bottom tabs (at capacity). Insights goes in the drawer alongside Bills, Recurring, Savings, etc.

---

## Part 5: i18n Keys

Added to `src/lib/i18n.ts`. Check for duplicates before adding.

| Key | EN | ID |
|-----|----|----|
| `insights` | Insights | Analitik |
| `spendingInsights` | Spending Insights | Analitik Pengeluaran |
| `healthScore` | Monthly Health Score | Skor Kesehatan Bulanan |
| `fromLastMonth` | from last month | dari bulan lalu |
| `topCategories` | Category Comparison | Perbandingan Kategori |
| `vsLastMonth` | vs last month | vs bulan lalu |
| `biggestTransactions` | Biggest Transactions | Transaksi Terbesar |
| `spendingByDay` | Spending by Day of Week | Pengeluaran per Hari |
| `youSpendMostOn` | You spend most on | Paling banyak di hari |
| `unusualSpending` | Unusual Spending | Pengeluaran Tidak Biasa |
| `noAnomalies` | No unusual spending this month | Tidak ada pengeluaran tidak biasa |
| `timesTypical` | your typical | biasanya |
| `typicalSpend` | typical | tipikal |
| `noExpensesThisMonth` | No expenses this month | Tidak ada pengeluaran bulan ini |
| `other` | Other | Lainnya |

Day names (Mon–Sun / Sen–Sab) use `date-fns` locale formatting in the component, not i18n keys.

---

## Testing

Following existing Vitest pattern in `src/__tests__/`.

### insights.service.test.ts (13 tests)

**categoryComparison:**
- returns correct thisMonth/lastMonth totals with changePct
- changePct is null when lastMonth is 0 (new category)
- max 8 categories, remainder bucketed as "Other"

**biggestTransactions:**
- returns top 5 expense transactions sorted by amount DESC
- excludes income transactions

**dayOfWeekPattern:**
- returns 7 items even if some days have 0 spend
- avgAmount = totalAmount / count for each day

**outliers:**
- returns top 5 by absolute delta, filtered by Rp 50.000 minimum
- returns empty array when less than 3 months of data
- multiplier = amount / categoryAvg is correct

**healthScore:**
- savingsRate = 0 when income is 0 (no division by zero)
- lastMonthRate is null when no prior month data

**Edge case:**
- returns all sections empty/zeroed for a month with no transactions

---

## Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| No transactions this month | All widgets show empty states with helpful messages. Health score shows 0%. No crashes. |
| New user (< 3 months of data) | categoryComparison: lastMonth = 0, changePct = null. Outliers: returns empty (not enough baseline). Health score: lastMonthRate = null. Everything still renders. |
| Division by zero in savings rate | If income === 0, savingsRate = 0 (guard in service). Tested explicitly. |
| Category with one expensive transaction ever | categoryAvg equals that transaction. Delta = 0. Won't appear in outliers (below Rp 50K floor). |
| Day-of-week locale (EN vs ID) | API returns dayIndex (0-6). Component maps to localized day names using date-fns locale. No hardcoded English. |
| More than 8 categories | Top 8 by thisMonth DESC; remainder summed into "Other" bucket. Service handles this. |

---

## Summary of All Files

### New Files (9)

| File | Purpose |
|------|---------|
| `src/server/services/insights.service.ts` | All 5 insight computations |
| `src/app/api/insights/spending/route.ts` | API endpoint |
| `src/app/insights/page.tsx` | Page layout composing all widgets |
| `src/features/insights/useInsightsData.ts` | React Query hook |
| `src/features/insights/HealthScoreCard.tsx` | KPI ring + comparison |
| `src/features/insights/CategoryComparisonChart.tsx` | Horizontal bar chart (Recharts) |
| `src/features/insights/BiggestTransactionsCard.tsx` | Top 5 list card |
| `src/features/insights/DayOfWeekPills.tsx` | 7-pill intensity row |
| `src/features/insights/OutlierAlerts.tsx` | Outlier cards with amber border |

### Modified Files (5)

| File | Change |
|------|--------|
| `src/features/navigation/nav-config.ts` | Add Insights to Tools group (first position) |
| `src/components/layout/BottomNav.tsx` | Add Insights to More drawer |
| `src/lib/api/client.ts` | Add `insights.spending()` method |
| `src/lib/api/contracts.ts` | Add `SpendingInsightsResponse` type |
| `src/lib/i18n.ts` | 15 new translation keys |
