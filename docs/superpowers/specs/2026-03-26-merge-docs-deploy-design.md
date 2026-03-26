# Merge, Docs Update & Deployment Verification — Design Spec

**Date:** 2026-03-26
**Scope:** Merge PR #13 (export template redesign v2), update README.md and Plan.md, verify Vercel deployment.

---

## Goals

1. Merge `feat/export-template-redesign-v2` into `main` via GitHub PR #13
2. Update `README.md` — add "Export Template Redesign v2" subsection alongside existing v1; update Features → Export bullets and Tech Stack Export row
3. Update `Plan.md` — add a new `### Export Template Redesign v2` subsection inside `## V.02 Improvements`, directly after the existing `### Export Template Redesign` subsection (line 573)
4. Commit and push docs updates to `main`
5. Verify CI passes and Vercel deployment is live

---

## README.md Changes

### 1. Add "Export Template Redesign v2" subsection

**Insertion point:** After the closing `![PDF export template](...)` line of the existing `### Export Template Redesign` block (currently line 85), and before the `### Settings` heading.

Add this block verbatim:

```markdown
### Export Template Redesign v2

Native live Excel charts, polished PDF, and Windows-friendly CSV — replacing all static PNG embeds.

**XLSX output** (ExcelJS + JSZip OpenXML):
- Native live Excel charts: donut (income vs expense), cashflow bar, expense category pie — injected via JSZip + DrawingML; charts update when data changes, no static images
- "Grafik" tab opens first when the file loads — 2×1 chart grid + KPI header rows with formulas referencing the Laporan data sheet
- Shared layout builder (`xlsx-template-builder.ts`) — single source of truth for both `/export` and `/reports`; eliminates ~400 lines of duplicated layout code
- Fixes: "Laporan Bulanan"/"Laporan Tahunan" titles, "Metode" column header, "Saldo (periode ini)" section label, "✓ Lunas"/"○ Belum" bill status text, new Deskripsi column in transaction tables

**PDF output** (jsPDF):
- Dark blue gradient header (20-strip simulation `#1E3A8A → #3B82F6`): 45mm full header with 3 KPI boxes on page 1; 12mm condensed header on page 2+
- Two-pass page numbering: "Halaman X / N" footer on every page
- "Rekap Pemasukan" income category table rendered side-by-side with "Rekap Pengeluaran"
- Deskripsi column added to both income and expense transaction tables
- Bill status as "Lunas" (green) / "Belum" (red) plain text (replaces broken Unicode checkboxes)

**CSV output:**
- UTF-8 BOM prepended — Indonesian characters render correctly in Excel on Windows
- Two quoted comment header rows: scope+date and totals summary
- Indonesian column names: Tanggal, Deskripsi, Kategori, Tipe, Jumlah, Metode Pembayaran, Catatan
- Formatted dates ("1 Maret 2026") and amounts ("Rp 5.200.000")

**Architecture highlights:**
- `src/lib/xlsx-template-builder.ts` — shared Laporan sheet builder; chart contract cells H10/H12/B13/D18:D{n}/E18:E{n} locked for chart XML references
- `src/lib/chart-xml-injector.ts` — JSZip post-processor: injects 3 DrawingML charts + Grafik worksheet into the XLSX buffer
```

### 2. Update Features → Export bullet for Excel

**Find this line** (currently line 56):
```
- [x] Excel export via ExcelJS — Indonesian-style template with 3 embedded Chart.js charts (income/expense donut, cash flow bar, expense category pie)
```

**Replace with:**
```
- [x] Excel export via ExcelJS + JSZip — Indonesian-style template with 3 **native live** Excel charts (income/expense donut, cash flow bar, expense category pie); "Grafik" tab opens first
```

### 3. Update Features → Export bullet for PDF

**Find this line** (currently line 57):
```
- [x] PDF export via jsPDF — A4 portrait report with same 3 embedded charts + bills checklist
```

**Replace with:**
```
- [x] PDF export via jsPDF — A4 portrait with dark gradient header, KPI boxes, page numbers, income/expense breakdown, Deskripsi column
```

### 4. Update Tech Stack Export row

**Find this line** (currently line 135) in the Tech Stack table:
```
| **Export** | ExcelJS (XLSX write) · Chart.js (embedded charts) · xlsx (bulk-import read) · jsPDF (PDF) · native CSV/JSON |
```

**Replace with:**
```
| **Export** | ExcelJS (XLSX write) · JSZip (OpenXML chart injection) · Chart.js (PDF chart rendering) · xlsx (bulk-import read) · jsPDF (PDF) · native CSV/JSON |
```

---

## Plan.md Changes

### Add "Export Template Redesign v2" subsection

**Insertion point:** After the last line of the existing `### Export Template Redesign` subsection (currently line 572: `- [x] src/lib/formatters.ts extended...`), and before the `### Load-More Transactions` heading (line 574).

Add this block verbatim:

```markdown
### Export Template Redesign v2

- [x] Added `jszip@^3.10.1` as explicit dependency (already transitive via ExcelJS)
- [x] Created `src/lib/xlsx-template-builder.ts` — shared Laporan sheet builder: 20-col A–T layout, Indonesian label fixes, Deskripsi column, "✓ Lunas"/"○ Belum" bill status, optional `ringkasanSheet` field for annual reports
- [x] Created `src/lib/chart-xml-injector.ts` — JSZip OpenXML injection: donut chart (income/expense), cashflow bar chart, expense pie chart; Grafik first-tab worksheet with KPI header + helper data rows (44–46); null guards on required ZIP entries; `hasPieData` guard for zero expense categories
- [x] Rewired `exportExcel` in `export-utils.ts` to delegate to `buildXlsxWorkbook` + `injectCharts`
- [x] Rewrote `exportCSV` in `export-utils.ts`: UTF-8 BOM, scope+totals comment rows, Indonesian headers/type values, `formatDateID` dates, formatted amounts; updated call sites in `useExport.ts` and `transactions/page.tsx`
- [x] Rewrote `exportPDF` in `export-utils.ts`: dark gradient header (20-strip `#1E3A8A→#3B82F6`), full 45mm header with 3 KPI boxes (page 1), 12mm condensed header (page 2+), two-pass page numbers, income category breakdown side-by-side, Deskripsi column, bill status "Lunas"/"Belum" plain text
- [x] Rewrote `generateMonthlyReport` and `generateAnnualReport` in `report-generator.ts` to delegate to shared builder+injector — removes ~400 lines of duplicated layout code
```

---

## Deployment Verification

After merging PR #13 and pushing docs updates to `main`:

1. Run `gh run list --branch main --limit 5` — wait until the CI run shows `completed` status with `success` conclusion
2. Fetch the live URL `https://financial-tracker-v-02.vercel.app/` — expect HTTP 200
3. Success if both CI and the live URL return without errors

---

## Success Criteria

- PR #13 merged to `main`
- `README.md`: v2 subsection present after v1 block; Excel/PDF Export bullets updated; Tech Stack Export row updated with JSZip
- `Plan.md`: `### Export Template Redesign v2` subsection present inside `## V.02 Improvements`, after `### Export Template Redesign`, with all 7 items checked
- CI run triggered by the merge completes with `success`
- `https://financial-tracker-v-02.vercel.app/` returns HTTP 200
