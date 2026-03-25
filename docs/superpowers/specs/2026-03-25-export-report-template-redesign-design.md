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
- `/export` page — CSV download (stays as flat data rows)
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
Renders three chart types to off-screen `<canvas>` elements using Chart.js and returns base64 PNG strings.

```
renderDonutChart(income, expense): Promise<string>
renderCashflowChart(income, expense, net): Promise<string>
renderExpensePieChart(categories): Promise<string>
```

All functions use dynamic `import('chart.js')` for code-splitting.

### Modified files
| File | Change |
|------|--------|
| `src/features/reports/report-generator.ts` | Full rewrite using ExcelJS + chart-renderer |
| `src/lib/export-utils.ts` | Update `exportExcel()` and `exportPDF()` |
| `package.json` | Add chart.js, exceljs; remove xlsx |

## Chart Renderer Detail

### `renderDonutChart(income, expense)`
- **Type:** Doughnut
- **Segments:** Emerald (Pemasukan) + Red (Pengeluaran)
- **Center label:** Net balance value
- **Canvas:** 300×300px

### `renderCashflowChart(income, expense, net)`
- **Type:** Horizontal Bar
- **Rows:** Pemasukan (green), Pengeluaran (red), Saldo (blue if positive, amber if negative)
- **Canvas:** 500×200px

### `renderExpensePieChart(categories)`
- **Type:** Pie
- **Segments:** Top 8 expense categories; remainder grouped as "Lainnya"
- **Legend:** Shown alongside chart
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

### Chart image positions (floating)
| Chart | Anchor |
|-------|--------|
| Donut | Col U, Row 2 |
| Cashflow | Col U, Row 9 |
| Pie (Rekap) | Col U, Row 16 |

### Annual XLSX additions
- Header reads "Annual Report" + Year
- All transactions for the year, sorted by date
- Extra sheet: "Ringkasan Bulanan" — 12-row table (Bulan, Pemasukan, Pengeluaran, Saldo)
- Charts reflect full-year aggregates

### Multi-month export scope
- Header shows date range label (e.g., "Jan 2025 – Mar 2026")
- All transactions in range included
- Charts reflect full-range aggregates

## PDF Template Layout

PDF flows vertically across pages.

### Page 1 — Summary & Charts
1. **Header:** Title, month/year (or range), generated date
2. **Totals row:** Three boxes — Total Pemasukan | Total Pengeluaran | Total Assets
3. **Charts row:** Donut chart + Cashflow chart side by side
4. **Pie chart:** Full-width Rekap Pengeluaran pie
5. **Rekap Pengeluaran table:** Category | Total
6. **Payment Method Balances table**

### Page 2+ — Transactions & Bills
1. **PEMASUKAN table:** No | Tanggal | Jumlah | Kategori | Method
2. **PENGELUARAN table:** No | Tanggal | Jumlah | Kategori | Acc | Notes
3. **CATATAN TAGIHAN:** Checklist of bills with amounts

### Annual PDF additions
- "Ringkasan Bulanan" summary table inserted between charts and transactions on Page 1

### Styling
- Section headers: Blue (`#2563EB`) fill, white text
- Income rows: Emerald tint
- Expense rows: Red tint
- Alternating row stripes on transaction tables
- Currency columns: Right-aligned, monospace font
- Font size: 8–9pt for tables, 10pt for labels, 14pt for title

## Data Sources

All data comes from existing API contracts — no backend changes needed.

| Data needed | Source |
|-------------|--------|
| Monthly transactions, totals, categories, payment methods, bills | `MonthlyReportData` (already returned by `/api/reports/monthly`) |
| Annual transactions, totals, categories, monthly breakdown | `AnnualReportData` (already returned by `/api/reports/annual`) |
| Export page transactions | Fetched via `api.transactions.list()` in `useExport()` hook |

For the `/export` page, since it fetches raw transactions (not the full `MonthlyReportData` shape), the export function will compute totals, category breakdowns, and payment method balances locally from the transaction array before generating charts and layout.

## Error Handling

- If Chart.js fails to render a chart (e.g., no data), that chart slot is skipped silently — the rest of the document still generates
- If ExcelJS fails, error is caught in `useReportData` / `useExport` and surfaced as a Sonner toast (existing pattern)
- If `categories` array is empty, pie chart renders a single "No Data" segment

## Testing

- Existing 312 tests are unaffected (no backend changes)
- Manual QA: download monthly XLSX, annual XLSX, export XLSX, export PDF — verify layout matches template and all three charts appear
- QA checklist item: verify ExcelJS output opens correctly in both Excel and LibreOffice
