# Merge, Docs Update & Deployment Verification — Design Spec

**Date:** 2026-03-26
**Scope:** Merge PR #13 (export template redesign v2), update README.md and Plan.md, verify Vercel deployment.

---

## Goals

1. Merge `feat/export-template-redesign-v2` into `main` via GitHub PR #13
2. Update `README.md` — add "Export Template Redesign v2" subsection alongside the existing v1 section; update Features → Export bullets and Tech Stack table
3. Update `Plan.md` — add a new completed batch section for Export Template Redesign v2
4. Push docs updates to `main`
5. Verify CI passes and Vercel deployment is live

---

## README.md Changes

### Export Template Redesign v2 subsection (add after existing v1 block)

Add a new `### Export Template Redesign v2` subsection directly below the existing `### Export Template Redesign` block:

```markdown
### Export Template Redesign v2

Native live Excel charts, polished PDF, and Windows-friendly CSV — replacing all static PNG embeds.

**XLSX output** (ExcelJS + JSZip OpenXML):
- Native live Excel charts: donut (income vs expense), cashflow bar, expense category pie — injected via JSZip + DrawingML; charts update when data changes, no static images
- "Grafik" tab opens first when file loads — 2×1 chart grid + KPI header rows
- Shared layout builder (`xlsx-template-builder.ts`) — single source of truth for both `/export` and `/reports`; eliminates ~400 lines of duplicated code
- Fixes: "Laporan Bulanan"/"Laporan Tahunan" titles, "Metode" column header, "Saldo (periode ini)" section, "✓ Lunas"/"○ Belum" bill status, new Deskripsi column

**PDF output** (jsPDF):
- Dark blue gradient header (20-strip simulation `#1E3A8A → #3B82F6`): 45mm full header with 3 KPI boxes on page 1; 12mm condensed header on page 2+
- Two-pass page numbering: "Halaman X / N" footer on every page
- Income category breakdown ("Rekap Pemasukan") side-by-side with expense breakdown
- Deskripsi column added to both income and expense transaction tables
- Bill status as "Lunas" (green) / "Belum" (red) plain text

**CSV output:**
- UTF-8 BOM prepended — Indonesian characters render correctly in Excel on Windows
- Two quoted header rows: scope+date and totals summary
- Indonesian column names: Tanggal, Deskripsi, Kategori, Tipe, Jumlah, Metode Pembayaran, Catatan
- Formatted dates ("1 Maret 2026") and amounts ("Rp 5.200.000")

**Architecture highlights:**
- `src/lib/xlsx-template-builder.ts` — shared Laporan sheet builder (chart contract cells H10/H12/B13/D18:Dn/E18:En)
- `src/lib/chart-xml-injector.ts` — JSZip post-processor that injects 3 DrawingML charts + Grafik worksheet into XLSX buffer
```

### Features → Export section updates

Update the existing Export bullets:
- Change: `Excel export via ExcelJS — Indonesian-style template with 3 embedded Chart.js charts (income/expense donut, cash flow bar, expense category pie)`
- To: `Excel export via ExcelJS + JSZip — Indonesian-style template with 3 **native live** Excel charts (income/expense donut, cash flow bar, expense category pie); "Grafik" tab opens first`
- Change: `PDF export via jsPDF — A4 portrait report with same 3 embedded charts + bills checklist`
- To: `PDF export via jsPDF — A4 portrait with dark gradient header, KPI boxes, page numbers, income/expense breakdown, Deskripsi column`

### Tech Stack table update

In the Export row, add `jszip` and update the description:
- Change: `ExcelJS (XLSX write) · Chart.js (embedded charts) · xlsx (bulk-import read) · jsPDF (PDF) · native CSV/JSON`
- To: `ExcelJS (XLSX write) · JSZip (OpenXML chart injection) · Chart.js (PDF chart rendering) · xlsx (bulk-import read) · jsPDF (PDF) · native CSV/JSON`

---

## Plan.md Changes

Add a new section at the end of the implementation checklist (before the Project Structure section):

```markdown
### Export Template Redesign v2

- [x] Added `jszip@^3.10.1` as explicit dependency (already transitive via ExcelJS)
- [x] Created `src/lib/xlsx-template-builder.ts` — shared Laporan sheet builder: 20-col layout, all label fixes, Deskripsi column, bill status text, ringkasanSheet optional field for annual reports
- [x] Created `src/lib/chart-xml-injector.ts` — JSZip OpenXML injection: donut chart (income/expense), cashflow bar chart, expense pie chart; Grafik first-tab worksheet with KPI header + helper data rows; null guards; hasPieData guard for zero expense categories
- [x] Rewired `exportExcel` in `export-utils.ts` to delegate to `buildXlsxWorkbook` + `injectCharts`
- [x] Rewrote `exportCSV` in `export-utils.ts`: UTF-8 BOM, scope+totals comment rows, Indonesian headers/type values, `formatDateID` dates, formatted amounts; updated call sites in `useExport.ts` and `transactions/page.tsx`
- [x] Rewrote `exportPDF` in `export-utils.ts`: dark gradient header (20-strip #1E3A8A→#3B82F6), full 45mm header with 3 KPI boxes (page 1), 12mm condensed header (page 2+), two-pass page numbers, income category breakdown side-by-side, Deskripsi column, bill status "Lunas"/"Belum" text
- [x] Rewrote `generateMonthlyReport` and `generateAnnualReport` in `report-generator.ts` to delegate to shared builder+injector — removes ~400 lines of duplicated layout code
```

---

## Deployment Verification

After merging PR #13 and pushing docs updates:

1. Poll `gh run list --branch main --limit 5` until the CI run triggered by the merge shows `completed` / `success`
2. Check Vercel deployment via the live URL: `https://financial-tracker-v-02.vercel.app/`
3. Confirm the app loads and `/export` page is reachable

---

## Success Criteria

- PR #13 merged to `main`
- README.md shows v2 subsection with correct content
- Plan.md shows new batch with all 7 items checked
- CI passes (typecheck, lint, format, test, build all green)
- Vercel deployment live and reachable
