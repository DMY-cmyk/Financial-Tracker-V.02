# Export & Report Template Redesign

**Date:** 2026-03-25
**Status:** Approved

## Overview

Redesign all downloadable report and export outputs (XLSX and PDF) to match the user's Excel template (`Financial Tracker Downloadable Report (Monthly).xlsx`). The template features a rich multi-panel layout with transaction lists, category summaries, payment method balances, a bills checklist, and three embedded charts. CSV export is unchanged.

## Scope

### Affected features
- `/reports` page — monthly XLSX download
- `/reports` page — annual XLSX download
- `/export` page — XLSX download (all scopes: current month, all, date range)
- `/export` page — PDF download (all scopes)

### Not affected
- `/export` page — CSV download (stays as flat data rows, no changes)
- All API routes (no backend changes)
- All UI components and pages

## Dependencies

### Added
- `chart.js` — client-side canvas chart rendering (donut, horizontal bar, pie)
- `exceljs` — XLSX write with first-class image embedding (`worksheet.addImage()`)

### Removed
- `xlsx` (SheetJS) — replaced by ExcelJS for writing; no longer needed

### Unchanged
- `jspdf` + `jspdf-autotable` — PDF generation

## Architecture

### New file
**`src/lib/chart-renderer.ts`**

Client-only module — must never be imported from a Server Component or API route. All three functions use dynamic `import('chart.js/auto')` internally (no static top-level import of chart.js) so the module itself is safe to import in hooks but does not pollute the server bundle.

```typescript
renderDonutChart(income: number, expense: number): Promise<string>
renderCashflowChart(income: number, expense: number, net: number): Promise<string>
renderExpensePieChart(categories: { category: string; total: number }[]): Promise<string>
```

Each function creates an off-screen `<canvas>` element, renders a Chart.js chart, returns a base64 PNG data URL string, then destroys the canvas.

### New interface
**`ExportReportInput`** (defined in `src/lib/export-utils.ts` or `src/lib/types.ts`)

Used by both `exportExcel()` and `exportPDF()` on the export page. Replaces the old `(transactions, filename, scopeLabel, includeSummary)` signature.

```typescript
interface ExportReportInput {
  scopeLabel: string;                   // e.g. "Januari 2026" or "Jan 2025 – Mar 2026"
  transactions: Transaction[];          // all transactions in scope
  totalIncome: number;                  // computed from transactions
  totalExpense: number;                 // computed from transactions
  totalAssets: number;                  // totalIncome - totalExpense
  incomeCategories: { category: string; total: number }[];   // grouped from transactions
  expenseCategories: { category: string; total: number }[];  // grouped from transactions
  paymentMethodBalances: { name: string; balance: number }[]; // scoped net per method (see note)
  bills: Bill[];                        // from REST API (see note); canonical Bill type from src/lib/types.ts
  filename: string;
}
```

**Note — payment method balances in the export path:**
`MonthlyReportData` provides accurate per-method balances including beginning balance. In the export path (raw transactions), we cannot compute beginning balance, so `paymentMethodBalances` is computed as: group transactions by `paymentMethod` string, sum income minus expense per method. This gives a net balance over the selected scope, not an all-time account balance. The section header in the output will read "Saldo (periode ini)" to reflect this.

**Note — bills in the export path:**
Bills are API-backed (`api.bills.list({ month, year })`). For the **current-month** scope, `useExport` calls `api.bills.list({ month, year })` and includes the result in `ExportReportInput.bills`. For the **annual** report and **multi-month range** exports, the bills section is omitted entirely (bills are inherently monthly).

For the **reports path**, bills already arrive in `MonthlyReportData.bills` — no additional fetch needed.

### Modified files
| File | Change |
|------|--------|
| `src/features/reports/report-generator.ts` | Full rewrite using ExcelJS; functions become `async` (see signatures below) |
| `src/lib/export-utils.ts` | `exportExcel(input: ExportReportInput): Promise<void>` and `exportPDF(input: ExportReportInput): Promise<void>` — new signatures; `includeSummary` flag retired |
| `src/features/reports/useReportData.ts` | `await generateMonthlyReport(...)` and `await generateAnnualReport(...)` at call sites (currently called synchronously) |
| `src/features/export/useExport.ts` | Compute `ExportReportInput`, call `api.bills.list()` for monthly scope, pass to generators |
| `src/lib/types.ts` | Remove `includeSummary` from `ExportState` |
| `src/features/export/ExportOptions.tsx` | Remove `includeSummary` from `ExportOptionsState` and UI checkbox |
| `package.json` | Add `chart.js`, `exceljs`; remove `xlsx` |

### Generator function signatures (updated — now async)

```typescript
// src/features/reports/report-generator.ts
generateMonthlyReport(data: MonthlyReportData): Promise<void>
generateAnnualReport(data: AnnualReportData): Promise<void>
```

Both functions must `await` the three `renderXxxChart()` calls before building the workbook. Call sites in `useReportData.ts` must be updated from synchronous to `await generateMonthlyReport(...)` / `await generateAnnualReport(...)`.

### ExcelJS browser download pattern
ExcelJS does not use `XLSX.writeFile()`. The correct browser pattern is:
```typescript
const buffer = await workbook.xlsx.writeBuffer(); // returns ArrayBuffer
const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
const url = URL.createObjectURL(blob);
// trigger download via <a> click, then URL.revokeObjectURL(url)
```

## Chart Renderer Detail

### `renderDonutChart(income, expense)`
- **Type:** Doughnut
- **Segments:** Emerald `#10b981` (Pemasukan) + Red `#ef4444` (Pengeluaran)
- **Center label:** Rendered via a custom `afterDraw` plugin callback on the Chart.js instance using Canvas 2D `ctx.fillText()` — no external plugin dependency needed
- **Canvas:** 300×300px

### `renderCashflowChart(income, expense, net)`
- **Type:** Horizontal Bar (`indexAxis: 'y'`)
- **Rows:** Pemasukan (green `#10b981`), Pengeluaran (red `#ef4444`), Saldo (blue `#2563eb` if ≥ 0, amber `#f59e0b` if < 0)
- **Canvas:** 500×200px

### `renderExpensePieChart(categories)`
- **Type:** Pie
- **Segments:** Top 8 expense categories by total; remainder summed as "Lainnya"
- **If `categories` is empty:** Render single grey segment labelled "Tidak ada data"
- **Legend:** `position: 'right'`
- **Canvas:** 400×300px

## XLSX Template Layout

Mirrors the Excel template column structure exactly.

### Column zones
| Columns | Content |
|---------|---------|
| B–D | Header, totals, category summary, payment methods, bills |
| F–J | Pemasukan transactions (No, Tanggal, Jumlah, Kategori, Method) |
| L–Q | Pengeluaran transactions (No, Tanggal, Jumlah, Kategori, Acc, Notes) |
| S–T | Rekap Pengeluaran (category totals) |
| U+ | Floating chart images |

### Row zones
| Rows | Content |
|------|---------|
| 2–4 | Title ("Monthly Report" or "Annual Report"), generated timestamp |
| 6–7 | Month/Year (or date range) labels and values |
| 9–10 | Total Pemasukan, Total Pengeluaran, Total Assets |
| 12–13 | "TOTAL ASSETS" summary |
| 16 | Section headers: KATEGORI, P E M A S U K A N, P E N G E L U A R A N, Rekap Pengeluaran |
| 17 | Column headers for all transaction tables |
| 18+ | Transaction data rows |
| After transactions | Payment Method balances, C A T A T A N T A G I H A N |

### Chart image positions (floating, ExcelJS `addImage`)
| Chart | Anchor cell | Approx size |
|-------|-------------|-------------|
| Donut | Col U, Row 2 | 6 cols × 8 rows |
| Cashflow | Col U, Row 10 | 6 cols × 6 rows |
| Pie (Rekap) | Col U, Row 17 | 6 cols × 10 rows |

### Annual XLSX additions
- Header reads "Annual Report" + Year
- All transactions for the year, sorted by date
- Extra sheet "Ringkasan Bulanan": 12-row table (Bulan, Pemasukan, Pengeluaran, Saldo)
- Charts reflect full-year aggregates
- **Rekap Pengeluaran** uses `AnnualReportData.topCategories` filtered to `type === 'expense'`
- **Bills section omitted** — bills are monthly; not applicable to annual view

### Multi-month export scope
- Header shows date range label (e.g., "Jan 2025 – Mar 2026")
- All transactions in range included
- Charts reflect full-range aggregates
- Category grouping: group by `tx.category` string from transaction objects
- **Bills section omitted** — only shown for single-month scope

### `includeSummary` flag
The `options.includeSummary` flag in `useExport` is **retired**. The new template always includes the full summary panel (totals, categories, payment methods). The flag is removed from `ExportOptions` UI and `useExport` state.

## PDF Template Layout

PDF flows vertically; portrait A4, 15mm margins.

### Page 1 — Summary & Charts
1. **Header:** Title (14pt bold), scope label + generated date (10pt gray)
2. **Totals row:** Three bordered boxes — Total Pemasukan | Total Pengeluaran | Total Assets
3. **Charts row:** Donut (70mm wide) + Cashflow (100mm wide), side by side, 5mm gap, total ~175mm
4. **Pie chart:** Centered, 90mm wide, below charts row
5. **Rekap Pengeluaran table:** Kategori | Total
6. **Payment Method Balances table:** Method | Saldo

### Page 2+ — Transactions & Bills
1. **PEMASUKAN table:** No | Tanggal | Jumlah | Kategori | Method
2. **PENGELUARAN table:** No | Tanggal | Jumlah | Kategori | Acc | Notes
3. **CATATAN TAGIHAN** (monthly scope only): bill name | amount | paid checkbox

### Annual PDF additions
- "Ringkasan Bulanan" 12-row table inserted on Page 1, between Payment Methods and transactions

### Styling
- Section headers: Blue (`#2563EB`) fill, white text, bold
- Income rows: Emerald tint `#d1fae5`
- Expense rows: Red tint `#fee2e2`
- Alternating row stripes on transaction tables
- Currency columns: Right-aligned
- Font size: 8pt for table rows, 9pt for table headers, 10pt for labels, 14pt for page title

### Loading state
No new loading state needed. The existing `isExporting` (in `useExport`) and `isGenerating` (in `useReportData`) flags already disable UI during generation. Chart rendering latency (~200–500ms) is covered by these existing states.

## Data Sources

| Data needed | Source |
|-------------|--------|
| Monthly transactions, totals, categories, payment methods, bills | `MonthlyReportData` from `/api/reports/monthly` |
| Annual transactions, totals, categories, monthly breakdown | `AnnualReportData` from `/api/reports/annual` |
| Export page transactions | `api.transactions.list()` in `useExport()` |
| Export page bills | REST API via `api.bills.list({ month, year })` in `useExport()` (monthly scope only) |
| Export page payment method balances | Computed from scoped transactions (net per method) |
| Export page category breakdowns | Computed from scoped transactions (group by `tx.category`) |

## Error Handling

- If Chart.js fails to render a chart, that chart slot is skipped silently; the rest of the document still generates
- If ExcelJS `writeBuffer()` fails, error is caught in `useReportData` / `useExport` and surfaced as a Sonner toast (existing pattern)
- If `categories` array is empty, pie chart renders a single grey "Tidak ada data" segment
- If bills store is empty, bills section renders with no rows (section header still shown for monthly scope)

## Testing

- Existing 312 tests are unaffected (no backend changes, no service changes)
- Manual QA: download monthly XLSX, annual XLSX, export XLSX, export PDF — verify layout matches template and all three charts appear
- QA checklist: verify ExcelJS output opens correctly in Excel and LibreOffice
- QA checklist: verify PDF chart images render on both Chromium and Firefox
- QA checklist: verify multi-month range scope omits bills section correctly
