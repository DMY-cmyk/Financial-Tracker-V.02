# Export & Report Template Redesign v2 — Design Spec

**Date:** 2026-03-25
**Scope:** Full redesign of all three export formats (XLSX, PDF, CSV) across `/export` and `/reports` pages.

---

## Goals

1. Replace static PNG chart images in XLSX with **native, live, adjustable Excel charts** via OpenXML injection
2. Fix all correctness bugs across XLSX, PDF, and CSV identified in the analysis
3. Eliminate duplicated XLSX template code shared between `export-utils.ts` and `report-generator.ts`
4. Make the PDF visually polished with a dark blue header style

---

## Architecture

### New files

| File | Purpose |
|------|---------|
| `src/lib/xlsx-template-builder.ts` | Shared XLSX layout builder — header block, data table, categories, payment methods, bills. Used by both `export-utils.ts` and `report-generator.ts`. |
| `src/lib/chart-xml-injector.ts` | JSZip + OpenXML chart injection — opens ExcelJS-generated XLSX ArrayBuffer, injects DrawingML chart XML, adds "Grafik" sheet, wires relationships, returns new `ArrayBuffer`. Runs client-side (browser). |

### Modified files

| File | Change |
|------|--------|
| `src/lib/export-utils.ts` | `exportExcel` delegates to builder + injector. `exportPDF` gets all 5 PDF fixes + dark header. `exportCSV` gets BOM + format fixes. |
| `src/features/reports/report-generator.ts` | `generateMonthlyReport` and `generateAnnualReport` delegate to builder + injector. Removes ~400 lines of duplicated layout code. |
| `src/lib/chart-renderer.ts` | Unchanged — still used for PDF chart PNG rendering only. |

### Dependencies

JSZip is already a transitive dependency of ExcelJS (`node_modules/jszip`). Add it as an explicit `package.json` dependency (`"jszip": "^3.10.1"`) so it can be directly imported. Import via `import JSZip from 'jszip'`.

### Types used

`Transaction` is imported from `@/lib/types`. It includes a `description: string` field (used for the new Deskripsi column). `Bill` is also imported from `@/lib/types`.

---

## Excel XLSX Changes

### Worksheet naming contract

`xlsx-template-builder.ts` **must** name the data worksheet exactly `"Laporan"` (via `workbook.addWorksheet('Laporan')`). The chart XML in `chart-xml-injector.ts` references data cells as `Laporan!H10`, `Laporan!H12`, etc. If the sheet name changes, all chart data references break silently.

### Locked cell positions (builder contract)

The following cell positions in the "Laporan" sheet are a **hard contract** that `xlsx-template-builder.ts` must preserve. The chart XML depends on them:

| Cell | Value |
|------|-------|
| `H10` | `totalIncome` |
| `H12` | `totalExpense` |
| `B13` | `totalAssets` |
| `D18:D{lastExpenseCatRow}` | Expense category names (one per row from row 18) |
| `E18:E{lastExpenseCatRow}` | Expense category totals (one per row from row 18) |

These must not be shifted without also updating the chart XML templates.

### New: "Grafik" sheet (native live charts)

The "Grafik" sheet is injected by `chart-xml-injector.ts` after ExcelJS builds the workbook. It appears as the **first tab** when the file opens.

**Layout — 2×1 grid:**

```
Row 1     │ Title: "Grafik Keuangan — <scopeLabel>" (merged A1:H1, bold 14pt)
Row 2     │ Generated date (italic, grey, A2)
Row 3     │ KPI labels: "Pemasukan" (B3), "Pengeluaran" (D3), "Saldo" (F3) — bold
Row 4     │ KPI formula values: =Laporan!H10 (B4), =Laporan!H12 (D4), =Laporan!B13 (F4)
           │   B4: green font #10B981, D4: red font #EF4444, F4: blue font #2563EB
           │   All formatted as "Rp"#,##0
Row 5     │ (empty spacer)
Row 6–22  │ LEFT cols A–H: Donut chart (income vs expense)
          │ RIGHT cols I–T: Cashflow bar chart (income / expense / saldo)
Row 23–40 │ cols A–T: Expense pie chart — full width
```

**Chart types and data references:**

| Chart | XML element | Data cells (Laporan sheet) |
|-------|-------------|---------------------------|
| Donut | `<c:doughnutChart>` | Series 1: label `H9` value `H10`; Series 2: label `H11` value `H12` |
| Cashflow bar | `<c:barChart>` with `<c:barDir val="bar"/>` | Labels: hardcoded strings; Values: `H10`, `H12`, `B13` |
| Expense pie | `<c:pieChart>` | Labels: `D18:D{n}`; Values: `E18:E{n}` |

**Colors (as OOXML hex ARGB — prefix `FF` for fully opaque):**
- Income/Pemasukan: `FF10B981`
- Expense/Pengeluaran: `FFEF4444`
- Saldo/Assets: `FF2563EB`
- Pie slices (in order): `FF2563EB`, `FF10B981`, `FFF59E0B`, `FFEF4444`, `FF8B5CF6`, `FF06B6D4`, `FFF97316`, `FF84CC16`, `FFEC4899`

**OpenXML injection steps (inside `chart-xml-injector.ts`):**

Input: `ArrayBuffer` from `workbook.xlsx.writeBuffer()`. Output: new `ArrayBuffer`. Uses `jszip.generateAsync({ type: 'arraybuffer' })`.

1. Open buffer with `JSZip.loadAsync(buffer)`
2. Read `[Content_Types].xml` — append `<Override>` entries:
   - `PartName="/xl/charts/chart1.xml"` → `ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"`
   - `PartName="/xl/charts/chart2.xml"` → same
   - `PartName="/xl/charts/chart3.xml"` → same
   - `PartName="/xl/drawings/drawing1.xml"` → `ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"`
   - `PartName="/xl/worksheets/sheet{N}.xml"` → `ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"`
3. Add `xl/charts/chart1.xml` (donut), `xl/charts/chart2.xml` (cashflow bar), `xl/charts/chart3.xml` (expense pie)
4. Add `xl/drawings/drawing1.xml` — anchors all 3 charts at their row positions on the Grafik sheet
5. Add `xl/drawings/_rels/drawing1.xml.rels` — links drawing → `../charts/chart1.xml`, `../charts/chart2.xml`, `../charts/chart3.xml`
6. Add new sheet XML `xl/worksheets/sheet{N}.xml` for Grafik (KPI cells + `<drawing r:id="rId1"/>`)
7. Add `xl/worksheets/_rels/sheet{N}.xml.rels` — links sheet → `../drawings/drawing1.xml`
8. Read `xl/workbook.xml`:
   - Parse existing `<sheet>` elements to find `maxSheetId = max of all existing sheetId values`
   - Parse existing `<sheet>` elements to find `maxRid = max numeric suffix of all existing r:id values` (e.g. `rId3` → `3`)
   - Assign `newSheetId = maxSheetId + 1`, `newRid = "rId" + (maxRid + 1)`
   - **Prepend** `<sheet name="Grafik" sheetId="{newSheetId}" r:id="{newRid}"/>` as the first `<sheet>` element inside `<sheets>`
9. Read `xl/workbook.xml.rels` — append:
   `<Relationship Id="{newRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{N}.xml"/>`
   where `N = (count of existing xl/worksheets/sheet*.xml files in the zip) + 1`
10. Call `zip.generateAsync({ type: 'arraybuffer' })` → return the new `ArrayBuffer`

**Deriving N (worksheet file index):** Count files matching `xl/worksheets/sheet\d+\.xml` in the JSZip archive. If ExcelJS generated `sheet1.xml` and `sheet2.xml`, then N = 3. The new Grafik sheet file is `xl/worksheets/sheet{N}.xml`.

### Laporan sheet fixes

| Issue | Fix |
|-------|-----|
| "Monthly Report" / "Annual Report" titles | → "Laporan Bulanan" / "Laporan Tahunan" |
| Column J header "Method" | → "Metode" |
| Payment method section "Payment Method" | → "Saldo (periode ini)" |
| `bill.isPaid` shows `TRUE`/`FALSE` | → `"✓ Lunas"` / `"○ Belum"` as text |
| Bills section always renders in monthly report | → Only render when `bills.length > 0` |
| Missing Description column | → See column layout below |
| Duplicated layout code | → Extracted to `xlsx-template-builder.ts` |

### Full column layout (income transaction table, rows 18+)

| Col | Before | After |
|-----|--------|-------|
| F | No | No |
| G | Tanggal | Tanggal |
| H | Jumlah | Jumlah |
| I | Kategori | Kategori |
| J | Method → **Metode** | **Deskripsi** (new) |
| K | — | **Metode** (shifted right) |

### Full column layout (expense transaction table, rows 18+)

| Col | Before | After |
|-----|--------|-------|
| L | No | No |
| M | Tanggal | Tanggal |
| N | Jumlah | Jumlah |
| O | Kategori | Kategori |
| P | Akun | **Deskripsi** (new) |
| Q | Catatan | **Akun** (shifted right) |
| R | — | **Catatan** (shifted right) |

### Shared builder interface

```typescript
// src/lib/xlsx-template-builder.ts
import type { Transaction, Bill } from '@/lib/types';

export interface XlsxTemplateInput {
  title: string;            // "Laporan Bulanan" | "Laporan Tahunan" | scope label
  scopeLabel: string;
  generatedAt: Date;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;
  incomeCategories: { category: string; total: number }[];
  expenseCategories: { category: string; total: number }[];
  incomeTxs: Transaction[];   // Transaction from @/lib/types — includes description field
  expenseTxs: Transaction[];
  paymentMethodBalances: { name: string; balance: number }[];
  bills: Bill[];              // pass [] to skip bills section
  filename: string;
}

// Returns workbook with "Laporan" sheet (and "Ringkasan Bulanan" for annual if provided)
export async function buildXlsxWorkbook(input: XlsxTemplateInput): Promise<ArrayBuffer>;
```

---

## PDF Changes

### Visual style: Dark Blue Header

jsPDF does not support CSS gradients or rgba transparency. The header is simulated using **20 horizontal `doc.rect()` strips**, each filled with an interpolated RGB color stepping from `#1E3A8A` (dark blue) at the top to `#3B82F6` (bright blue) at the bottom. Each strip is `headerHeight / 20` mm tall.

**Page 1 — full header** (height: 45mm):
```
Simulated gradient: 20 horizontal strips from rgb(30,58,138) → rgb(59,130,246)
Title: "Laporan Keuangan" — white, bold, 14pt, at y=10mm
Scope + date: white, normal, 9pt, at y=17mm
3 KPI boxes (solid fill rgb(255,255,255) at 15% brightness blend — use rgb(70,100,180)):
  Box 1: "Pemasukan" label + value (light green text rgb(110,231,183))
  Box 2: "Pengeluaran" label + value (light red text rgb(252,165,165))
  Box 3: "Saldo" label + value (white text)
  Boxes positioned at y=22mm, height 16mm, width=(CONTENT_W/3 - 3mm) each
Content starts at y = 45mm + 4mm margin
```

**Page 2+ — condensed header** (height: 12mm):
```
Simulated gradient: same 20-strip technique, but only 12mm tall
Title only: "Laporan Keuangan — <scopeLabel>" — white, bold, 10pt, at y=7mm
No KPI boxes on continuation pages
Content starts at y = 12mm + 4mm margin
```

**Page number footer** on every page — two-pass approach:

Pass 1: During `autoTable` / content rendering, use the `didDrawPage` callback to draw `"Halaman X / ?"` (question mark as placeholder) right-aligned at `y = PAGE_HEIGHT - 8mm`, grey `rgb(100,116,139)`, 8pt.

Pass 2: After all content is added, call `const total = doc.getNumberOfPages()`. Loop `for (let i = 1; i <= total; i++)`, call `doc.setPage(i)`, then overdraw the footer area with the resolved string `"Halaman ${i} / ${total}"` using the same position and style (white-fill the old text first with a white rect, then redraw).

This two-pass approach is fully supported by jsPDF's public API (`doc.setPage`, `doc.getNumberOfPages`) and requires no undocumented internals.

### Content fixes

| Issue | Fix |
|-------|-----|
| No income category breakdown | Add "Rekap Pemasukan" table (emerald header `[16,185,129]`) alongside "Rekap Pengeluaran" — side by side, each `CONTENT_W / 2 - 3` wide |
| No Description column | Add "Deskripsi" column after "Jumlah" in both income and expense transaction tables |
| Broken Unicode checkboxes ☑/☐ | → `"Lunas"` (emerald) / `"Belum"` (red) plain text in "Status" column |
| No page numbers | `"Halaman X / N"` footer via `jspdf-autotable` `didDrawPage` hook |
| Half-width tables | Remove `tableWidth: CONTENT_W / 2` — all tables use full `CONTENT_W` |

### Updated page flow

```
Page 1:
  Full dark header (45mm) with KPI boxes
  Charts: Donut (left 70mm) + Cashflow bar (right 105mm) — height 52mm
  Pie chart: centered 90mm wide — height 65mm
  Rekap Pemasukan (left half) + Rekap Pengeluaran (right half) — side by side
  Saldo per Metode Pembayaran — full width

Page 2+:
  Condensed dark header (12mm)
  PEMASUKAN table — columns: No, Tanggal, Jumlah, Deskripsi, Kategori, Metode
    alternateRowStyles: fillColor EMERALD_TINT [209,250,229]
  PENGELUARAN table — columns: No, Tanggal, Jumlah, Deskripsi, Kategori, Akun, Catatan
    alternateRowStyles: fillColor RED_TINT [254,226,226]

Page N (monthly scope with bills only):
  Condensed dark header (12mm)
  CATATAN TAGIHAN table — columns: Status, Tagihan, Jumlah
    Status: "Lunas" (green) / "Belum" (red) plain text
```

---

## CSV Changes

### Before
```
Date,Description,Category,Type,Amount,Payment Method,Notes
2026-03-01,Gaji Maret,Gaji,income,5200000,BCA,
```

### After
```
[UTF-8 BOM \uFEFF]
"// Laporan Keuangan - Maret 2026 | Diekspor: 25 Maret 2026"
"// Total Pemasukan: Rp 5.200.000 | Total Pengeluaran: Rp 3.800.000 | Saldo: Rp 1.400.000"
Tanggal,Deskripsi,Kategori,Tipe,Jumlah,Metode Pembayaran,Catatan
1 Maret 2026,Gaji Maret,Gaji,Pemasukan,"Rp 5.200.000",BCA,
```

The two comment rows are each a single quoted string in the first column (no commas in the content). They appear as literal data in Excel but clearly mark the file's scope and totals.

### Four changes

| Change | Detail |
|--------|--------|
| UTF-8 BOM | `\uFEFF` prepended to content string — Indonesian chars render correctly in Excel on Windows |
| Scope header rows | 2 quoted single-column rows at top: scope label + totals summary |
| Indonesian headers & values | Column names in Indonesian; `Tipe` values: `"Pemasukan"` / `"Pengeluaran"` |
| Formatted date & amount | `formatDateID(tx.date)` for dates; `"Rp X.XXX.XXX"` formatted string for amounts |

---

## Testing

Existing tests in `src/__tests__/` cover service-layer logic and do not directly test the client-side export functions (they run in the browser). No new test files are required. Manual verification:

1. **XLSX — native charts**: Download from `/export` → open in Excel → Grafik tab is first → click any chart → chart editor opens → edit a value in Laporan sheet → chart updates live
2. **XLSX — reports**: Download from `/reports` → same chart verification
3. **XLSX — fixes**: Verify "Laporan Bulanan" title, "Metode" column header, "Saldo (periode ini)" section, "✓ Lunas"/"○ Belum" bill status, Deskripsi column populated
4. **PDF — header**: Open in PDF viewer → blue gradient header on every page → KPI boxes on page 1 → condensed header on page 2+
5. **PDF — content**: Page numbers in footer → Description column in both tables → income category breakdown present → tables full width → "Lunas"/"Belum" readable
6. **CSV — Windows Excel**: Open downloaded CSV in Excel on Windows → no garbled chars → comment header rows visible → Indonesian column names → dates formatted as "1 Maret 2026"
