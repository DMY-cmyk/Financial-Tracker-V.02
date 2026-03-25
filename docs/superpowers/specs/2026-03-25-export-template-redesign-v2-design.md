# Export & Report Template Redesign v2 — Design Spec

**Date:** 2026-03-25
**Scope:** Full redesign of all three export formats (XLSX, PDF, CSV) across `/export` and `/reports` pages.

---

## Goals

1. Replace static PNG chart images in XLSX with **native, live, adjustable Excel charts** via OpenXML injection
2. Fix all correctness bugs across XLSX, PDF, and CSV identified in the analysis
3. Eliminate duplicated XLSX template code shared between `export-utils.ts` and `report-generator.ts`
4. Make the PDF visually polished with a dark gradient header style

---

## Architecture

### New files

| File | Purpose |
|------|---------|
| `src/lib/xlsx-template-builder.ts` | Shared XLSX layout builder — header block, data table, categories, payment methods, bills. Used by both `export-utils.ts` and `report-generator.ts`. |
| `src/lib/chart-xml-injector.ts` | JSZip + OpenXML chart injection — opens ExcelJS-generated XLSX buffer, injects DrawingML chart XML, adds "Grafik" sheet, wires relationships, returns new buffer. |

### Modified files

| File | Change |
|------|--------|
| `src/lib/export-utils.ts` | `exportExcel` delegates to builder + injector. `exportPDF` gets all 5 PDF fixes + dark header. `exportCSV` gets BOM + format fixes. |
| `src/features/reports/report-generator.ts` | `generateMonthlyReport` and `generateAnnualReport` delegate to builder + injector. Removes ~400 lines of duplicated layout code. |
| `src/lib/chart-renderer.ts` | Unchanged — still used for PDF chart PNG rendering only. |

### No new npm dependencies

JSZip is already a transitive dependency of ExcelJS (`node_modules/jszip`). It must be added as an explicit `package.json` dependency (`jszip`) so it can be imported directly.

---

## Excel XLSX Changes

### New: "Grafik" sheet (native live charts)

The "Grafik" sheet is injected by `chart-xml-injector.ts` after ExcelJS builds the workbook. It appears as the **first tab** when the file opens.

**Layout — 2×1 grid:**

```
Row 1–2   │ Title: "Grafik Keuangan — <scopeLabel>"
Row 3     │ Generated date (italic, grey)
Row 4–5   │ KPI row: 3 formula cells → Laporan!H10, Laporan!H12, Laporan!B13
Row 6–22  │ LEFT: Donut chart (income vs expense)
          │ RIGHT: Cashflow bar chart (income / expense / saldo)
Row 23–40 │ Expense pie chart — full width
```

**Chart types and data references:**

| Chart | Type | Data cells (Laporan sheet) |
|-------|------|---------------------------|
| Donut | `<c:doughnutChart>` | `H10` (income), `H12` (expense) |
| Cashflow bar | `<c:barChart barDir="bar">` | `H10`, `H12`, `B13` |
| Expense pie | `<c:pieChart>` | `D18:D{n}` (labels), `E18:E{n}` (values) |

**Colors match app design system:**
- Income: `#10B981` (Emerald)
- Expense: `#EF4444` (Red)
- Saldo/Assets: `#2563EB` (Blue)
- Pie slices: `#2563EB`, `#10B981`, `#F59E0B`, `#EF4444`, `#8B5CF6`, `#06B6D4`, `#F97316`, `#84CC16`, `#EC4899`

**OpenXML injection steps (inside `chart-xml-injector.ts`):**
1. Open XLSX buffer with JSZip
2. Read `[Content_Types].xml` — add entries for chart files and drawing
3. Add `xl/charts/chart1.xml` (donut), `chart2.xml` (bar), `chart3.xml` (pie)
4. Add `xl/drawings/drawing1.xml` — positions all 3 charts on the Grafik sheet
5. Add `xl/drawings/_rels/drawing1.xml.rels` — links drawing → charts
6. Add new sheet XML `xl/worksheets/sheetN.xml` for Grafik (KPI cells + drawing reference)
7. Add `xl/worksheets/_rels/sheetN.xml.rels` — links sheet → drawing
8. Update `xl/workbook.xml` — add `<sheet name="Grafik" sheetId="N" r:id="rIdN"/>` as first sheet
9. Update `xl/workbook.xml.rels` — add relationship for new sheet
10. Re-zip → return new ArrayBuffer

### Laporan sheet fixes

| Issue | Fix |
|-------|-----|
| "Monthly Report" / "Annual Report" titles | → "Laporan Bulanan" / "Laporan Tahunan" |
| Column J header "Method" | → "Metode" |
| Payment method section "Payment Method" | → "Saldo (periode ini)" |
| `bill.isPaid` shows `TRUE`/`FALSE` | → `"✓ Lunas"` / `"○ Belum"` as text |
| Bills section always renders in monthly report | → Only render when `data.bills.length > 0` |
| Missing Description column (income & expense) | → Add "Deskripsi" column: after Kategori in income (col K), after Kategori in expense (col R) |
| Duplicated layout code | → Extracted to `xlsx-template-builder.ts` |

### Shared builder interface

```typescript
interface XlsxTemplateInput {
  title: string;            // "Laporan Bulanan" / "Laporan Tahunan" / scope label
  scopeLabel: string;
  generatedAt: Date;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;
  incomeCategories: { category: string; total: number }[];
  expenseCategories: { category: string; total: number }[];
  incomeTxs: Transaction[];
  expenseTxs: Transaction[];
  paymentMethodBalances: { name: string; balance: number }[];
  bills: Bill[];            // pass [] to skip bills section
  filename: string;
}
```

---

## PDF Changes

### Visual style: Dark Gradient Header

Every page gets a rich blue gradient header block:

```
Background: linear gradient #1E3A8A → #2563EB → #3B82F6 (135°)
Height: ~45mm
Content:
  - Report title (bold, white, 14pt)
  - Scope + generated date (white, 9pt, 70% opacity)
  - 3 KPI cards (frosted glass: rgba(255,255,255,0.12), border-radius 4mm)
    - Pemasukan → Emerald (#6EE7B7 text)
    - Pengeluaran → Red (#FCA5A5 text)
    - Saldo → White text
```

The gradient header is drawn on **every page** via a `drawHeader()` helper function called before each page's content.

### Content fixes

| Issue | Fix |
|-------|-----|
| No income category breakdown | Add "Rekap Pemasukan" table (green header) alongside "Rekap Pengeluaran" in a 2-column layout on page 1 |
| No Description column | Add "Deskripsi" column after "Jumlah" in both income and expense transaction tables |
| Broken Unicode checkboxes ☑/☐ | → `"Lunas"` (green) / `"Belum"` (red) plain text in status column |
| No page numbers | Add `"Halaman X / N"` footer (right-aligned, grey, 8pt) on every page |
| Half-width tables | Remove `tableWidth: CONTENT_W / 2` — all tables use full `CONTENT_W` |

### Updated page flow

```
Page 1 (after dark header):
  Charts row: Donut (left) + Cashflow bar (right)
  Pie chart: centered, full width
  Rekap Pemasukan + Rekap Pengeluaran: side-by-side, full combined width
  Saldo per Metode Pembayaran: full width

Page 2+:
  PEMASUKAN table (columns: No, Tanggal, Jumlah, Deskripsi, Kategori, Metode)
  PENGELUARAN table (columns: No, Tanggal, Jumlah, Deskripsi, Kategori, Akun, Catatan)

Page N (if monthly scope with bills):
  CATATAN TAGIHAN table (columns: Status, Tagihan, Jumlah)
  Status: "Lunas" / "Belum" plain text
```

---

## CSV Changes

### Before
```csv
Date,Description,Category,Type,Amount,Payment Method,Notes
2026-03-01,Gaji Maret,Gaji,income,5200000,BCA,
```

### After
```csv
[UTF-8 BOM]
// Laporan Keuangan - Maret 2026 | Diekspor: 25 Maret 2026
// Total Pemasukan: Rp 5.200.000 | Total Pengeluaran: Rp 3.800.000 | Saldo: Rp 1.400.000
Tanggal,Deskripsi,Kategori,Tipe,Jumlah,Metode Pembayaran,Catatan
1 Maret 2026,Gaji Maret,Gaji,Pemasukan,"Rp 5.200.000",BCA,
```

### Four changes

| Change | Detail |
|--------|--------|
| UTF-8 BOM | `\uFEFF` prepended — Indonesian chars render correctly in Excel on Windows |
| Scope header comments | 2 comment rows (`//` prefix) with period, export date, and totals |
| Indonesian headers & values | Column names in Indonesian; `Tipe` values: `"Pemasukan"` / `"Pengeluaran"` |
| Formatted date & amount | `formatDateID(tx.date)` for dates; `"Rp X.XXX.XXX"` string for amounts |

---

## Testing

Existing tests in `src/__tests__/` cover service-layer logic and do not directly test the client-side export functions (they run in the browser). No new test files are required. Manual verification:

1. Download XLSX from `/export` → open in Excel → Grafik sheet appears first → click chart → chart editor opens → modify data in Laporan sheet → chart updates
2. Download XLSX from `/reports` → same verification
3. Download PDF from `/export` → open in any PDF viewer → dark gradient header visible → page numbers in footer → Description column present → "Lunas"/"Belum" readable
4. Download CSV from `/export` → open in Excel on Windows → no garbled Indonesian characters → header comment rows visible → Indonesian column names
