# README.md & Plan.md Update — Design Spec

**Date:** 2026-03-25
**Scope:** Documentation-only — update README.md and Plan.md to reflect the Export Template Redesign shipped in PR #12.

---

## Motivation

Both files contain stale information:
- **SheetJS** listed as the XLSX export library (replaced by **ExcelJS** for writing)
- **Chart.js** not mentioned (added for off-screen chart rendering)
- Test count reads **243** (correct count is **241**)
- Branch strategy table lists `redesign` as active (all work is now on `main`)
- No mention of the Export Template Redesign feature anywhere

---

## README.md Changes

### 1. Tech Stack Table

| Row | Old | New |
|-----|-----|-----|
| Export | `SheetJS (xlsx), jsPDF (pdf), native CSV/JSON` | `ExcelJS (XLSX write) · Chart.js (embedded charts) · xlsx (bulk-import read) · jsPDF (PDF) · native CSV/JSON` |
| Charts | `Recharts (area, pie)` | `Recharts (area, pie) + Chart.js (off-screen PNG rendering for export)` |
| Testing | `Vitest (243 tests…)` | `Vitest (241 tests…)` |

### 2. Export Feature Bullets (Features → Export)

Remove:
- `- [x] Export options (include summary, group by date)` → change to `group by date` only (include summary was removed)
- `- [x] Excel export via SheetJS (formatted workbook with summary sheet)`
- `- [x] PDF export via jsPDF (styled report with summary and table)`

Add:
- `- [x] Excel export via ExcelJS — Indonesian-style template with 3 embedded Chart.js charts (income/expense donut, cash flow bar, expense category pie)`
- `- [x] PDF export via jsPDF — A4 portrait report with same 3 embedded charts + bills checklist`

### 3. New Section: `### Export Template Redesign`

Insert as a `###`-level section (peer of `### Export`, `### Transactions`, etc.), immediately after the `### Export` bullet block. Content:

```markdown
### Export Template Redesign

The `/export` and `/reports` pages generate publication-quality XLSX and PDF
documents with embedded charts, replacing the original flat SheetJS workbook.

**XLSX output** (ExcelJS):
- Indonesian-style template — positioned header, summary block, transaction table
- 3 embedded charts: income/expense donut, monthly cash flow bar, expense category pie
- Charts rendered off-screen via Chart.js canvas → PNG base64 → workbook cells
- Annual report: two sheets — "Ringkasan Tahunan" + "Detail Transaksi"

**PDF output** (jsPDF):
- A4 portrait with the same 3 charts embedded as images
- jsPDF-autotable for transaction rows with alternating row colors
- Bills checklist section (current month scope only)

**Architecture highlights:**
- `src/lib/chart-renderer.ts` — three async functions returning PNG base64
  (`renderDonutChart`, `renderCashflowChart`, `renderExpensePieChart`)
- `ExportReportInput` typed interface — single input for both Excel and PDF generators
- `xlsx` package kept for bulk-import reading; ExcelJS used exclusively for writing

<!-- Screenshots: capture from /export and /reports after deployment -->
![XLSX export template](docs/screenshots/export-xlsx-template.png)
![PDF export template](docs/screenshots/export-pdf-template.png)
```

### 4. Quality Scripts Block

`npm run test         # Run tests (Vitest, 243 tests)` → `241 tests`

### 5. Branch Strategy Table

Remove the `redesign` row. Table becomes single-row:

| Branch | Purpose |
|--------|---------|
| `main` | Production (deployed to Vercel) |

---

## Plan.md Changes

### 1. Tech Stack Table

| Row | Old | New |
|-----|-----|-----|
| Export | `CSV (native) + xlsx (SheetJS) + PDF (jspdf)` | `CSV (native) + ExcelJS (XLSX write, Chart.js charts) + xlsx (read-only, bulk-import) + PDF (jspdf)` |
| Testing | `Vitest (243 tests…)` | `Vitest (241 tests…)` |

### 2. V.02 Improvements — Reports Section

Old line:
```
- [x] XLSX generator (SheetJS) — monthly: Indonesian template format; annual: 2-sheet workbook
```

New line:
```
- [x] XLSX generator (ExcelJS) — monthly: Indonesian template format; annual: 2-sheet workbook
```

### 3. V.02 Improvements — Testing Section

`- [x] 243 tests total (up from 84) — balance service (15), PM service (16), report service (20), bulk-import (57)`
→ change `243` to `241`, keep the trailing breakdown unchanged.

### 4. New Subsection: `### Export Template Redesign`

Insert immediately after the `### Reports` block, before `### Load-More Transactions`. Content mirrors README with a checklist format:

```markdown
### Export Template Redesign

- [x] Replaced SheetJS with **ExcelJS** for all XLSX writing (reports + export pages)
- [x] Added **Chart.js** (`chart.js/auto`) for off-screen canvas chart rendering
- [x] `src/lib/chart-renderer.ts` — `renderDonutChart`, `renderCashflowChart`, `renderExpensePieChart` (all return PNG base64)
- [x] `ExportReportInput` interface — single typed input replacing old 4-argument export signatures
- [x] XLSX template: Indonesian-style layout with positioned header, summary block, 3 embedded charts
- [x] Annual XLSX: two sheets — "Ringkasan Tahunan" (monthly breakdown) + "Detail Transaksi"
- [x] PDF template: A4 portrait, 3 embedded chart images, bills checklist (current month only)
- [x] `xlsx` package retained as explicit dependency for bulk-import XLSX reading
- [x] `ExportOptions` simplified — removed `includeSummary` toggle (groupByDate only)
- [x] `src/lib/formatters.ts` extended — `formatDateID`, `formatDatetimeID`, `MONTH_NAMES_ID`
```

---

## Screenshot Placeholders

Two placeholder references added to README.md pointing to `docs/screenshots/`:
- `export-xlsx-template.png` — capture from `/export` page, XLSX download
- `export-pdf-template.png` — capture from `/export` page, PDF download

The `docs/screenshots/` directory does not exist yet and must be created. The markdown will render a broken image until the directory and captures are added.
