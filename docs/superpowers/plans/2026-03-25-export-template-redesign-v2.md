# Export & Report Template Redesign v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static PNG charts in XLSX with native live Excel charts via OpenXML injection, fix all identified bugs across XLSX/PDF/CSV, and eliminate ~400 lines of duplicated XLSX layout code.

**Architecture:** New `src/lib/xlsx-template-builder.ts` builds the "Laporan" worksheet via ExcelJS. New `src/lib/chart-xml-injector.ts` post-processes the resulting ArrayBuffer with JSZip — injects 3 DrawingML chart XML files and a new "Grafik" first-tab sheet. Both `export-utils.ts` and `report-generator.ts` delegate to these shared modules, removing all duplicated layout code.

**Tech Stack:** ExcelJS 4.x, JSZip 3.x (explicit dep, already transitive via ExcelJS), jsPDF + jspdf-autotable, TypeScript strict

---

## File Map

| Status | File | Change |
|--------|------|--------|
| Create | `src/lib/xlsx-template-builder.ts` | Shared XLSX layout (Laporan sheet) — all fixes, Deskripsi col, correct labels |
| Create | `src/lib/chart-xml-injector.ts` | JSZip + OpenXML injection — 3 charts + Grafik sheet |
| Modify | `src/lib/export-utils.ts` | `exportExcel` → builder+injector; `exportPDF` → dark header + fixes; `exportCSV` → BOM + format fixes |
| Modify | `src/features/reports/report-generator.ts` | Both generate functions → builder+injector |
| Modify | `package.json` | Add `"jszip": "^3.10.1"` as explicit dependency |

---

## Cell position contract (DO NOT SHIFT)

`xlsx-template-builder.ts` must keep these cells exactly. Chart XML in `chart-xml-injector.ts` references them:

| Cell | Value |
|------|-------|
| `H10` | `totalIncome` |
| `H12` | `totalExpense` |
| `B13` | `totalAssets` |
| `D18:D{n}` | Expense category names (row 18 + index) |
| `E18:E{n}` | Expense category totals |

---

## Task 1 — Add jszip dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add jszip to package.json**

Open `package.json`. In the `"dependencies"` block, add directly after the `"jspdf-autotable"` line:

```json
"jszip": "^3.10.1",
```

- [ ] **Step 2: Install**

```bash
npm install
```

Expected: `added 0 packages` (jszip is already in node_modules as ExcelJS transitive dep; this just makes it explicit).

- [ ] **Step 3: Verify import resolves**

```bash
npx tsc --noEmit --allowImportingTsExtensions 2>&1 | grep jszip
```

Expected: no errors about jszip.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add jszip as explicit dependency for OpenXML chart injection"
```

---

## Task 2 — Create xlsx-template-builder.ts

**Files:**
- Create: `src/lib/xlsx-template-builder.ts`

This module builds the "Laporan" worksheet and returns an `ArrayBuffer`. It is the single source of truth for the XLSX layout — both `export-utils.ts` and `report-generator.ts` will call it.

**Key invariants:**
- Worksheet is named exactly `"Laporan"` (chart XML hardcodes this name)
- Column layout is 20 columns A–T (no spacers between income/expense)
- H10, H12, B13 are the KPI cells; D18:D{n}, E18:E{n} are expense category ranges

- [ ] **Step 1: Create the file**

Create `src/lib/xlsx-template-builder.ts` with full content:

```typescript
// src/lib/xlsx-template-builder.ts
// CLIENT-ONLY — called from export-utils.ts and report-generator.ts only.
// Returns an ArrayBuffer of the built workbook. Callers then pipe through
// chart-xml-injector.ts to add native charts before triggering download.
import type { Transaction, Bill } from '@/lib/types';
import { formatDateID, formatDatetimeID } from '@/lib/formatters';

export interface XlsxTemplateInput {
  /** "Laporan Bulanan" | "Laporan Tahunan" | scope label for export page */
  title: string;
  scopeLabel: string;
  generatedAt: Date;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;
  incomeCategories: { category: string; total: number }[];
  /** CHART CONTRACT: D18:D{n} = names, E18:E{n} = totals */
  expenseCategories: { category: string; total: number }[];
  incomeTxs: Transaction[];
  expenseTxs: Transaction[];
  /** { name, balance } — balance is income minus expense for the scope period */
  paymentMethodBalances: { name: string; balance: number }[];
  /** Pass [] to skip the bills section entirely */
  bills: Bill[];
  filename: string;
}

const CURRENCY_FMT = '"Rp"#,##0';

const HEADER_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FF2563EB' },
};
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };

/**
 * Builds an ExcelJS workbook with a single "Laporan" worksheet.
 * Returns the raw ArrayBuffer — callers should pass this through
 * injectCharts() before triggering the browser download.
 */
export async function buildXlsxWorkbook(input: XlsxTemplateInput): Promise<ArrayBuffer> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  // Sheet name MUST be "Laporan" — chart XML in chart-xml-injector.ts references
  // cell addresses as "Laporan!$H$10" etc. Changing this name breaks charts silently.
  const ws = workbook.addWorksheet('Laporan');

  // 20 columns A–T.
  // Old layout had spacers at K and R; new layout uses K for Metode (income)
  // and R for Catatan (expense), eliminating both spacers to fit Deskripsi columns.
  ws.columns = [
    { width: 3 },  // A  spacer
    { width: 28 }, // B  left panel: category names (income)
    { width: 14 }, // C  left panel: category totals (income)
    { width: 28 }, // D  left panel: category names (expense) — CHART CONTRACT D18:D{n}
    { width: 14 }, // E  left panel: category totals (expense) — CHART CONTRACT E18:E{n}
    { width: 6 },  // F  No (income tx)
    { width: 14 }, // G  Tanggal (income tx)
    { width: 18 }, // H  Jumlah (income tx) — CHART CONTRACT H10=income, H12=expense
    { width: 22 }, // I  Kategori (income tx)
    { width: 22 }, // J  Deskripsi (income tx) — NEW
    { width: 18 }, // K  Metode (income tx) — was spacer col, now content
    { width: 6 },  // L  No (expense tx)
    { width: 14 }, // M  Tanggal (expense tx)
    { width: 18 }, // N  Jumlah (expense tx)
    { width: 22 }, // O  Kategori (expense tx)
    { width: 22 }, // P  Deskripsi (expense tx) — NEW
    { width: 18 }, // Q  Akun (expense tx) — shifted right from P
    { width: 25 }, // R  Catatan (expense tx) — was spacer col, now content
    { width: 25 }, // S  Rekap Pengeluaran: category
    { width: 18 }, // T  Rekap Pengeluaran: total
  ];

  // ── Header block ──────────────────────────────────────────────────────────
  ws.mergeCells('B4:E4');
  ws.getCell('B4').value = input.title;
  ws.getCell('B4').font = { bold: true, size: 16 };

  ws.getCell('B7').value = formatDatetimeID(input.generatedAt);
  ws.getCell('B7').font = { italic: true, size: 9, color: { argb: 'FF666666' } };

  ws.getCell('B9').value = input.scopeLabel;
  ws.getCell('B9').font = { bold: true };

  // G10/G12 are human-readable labels; H9/H11 are the same labels positioned
  // for chart series label references in chart-xml-injector.ts chart1.xml
  ws.getCell('H9').value = 'Total Pemasukan';
  ws.getCell('H9').font = { bold: true };
  ws.getCell('G10').value = 'Total Pemasukan';
  ws.getCell('G10').font = { bold: true };
  ws.getCell('H10').value = input.totalIncome; // CHART CONTRACT
  ws.getCell('H10').numFmt = CURRENCY_FMT;
  ws.getCell('H10').font = { color: { argb: 'FF10B981' }, bold: true };

  ws.mergeCells('B12:E12');
  ws.getCell('B12').value = 'T O T A L   A S S E T S';
  ws.getCell('B12').font = { bold: true };

  ws.getCell('H11').value = 'Total Pengeluaran';
  ws.getCell('H11').font = { bold: true };
  ws.getCell('G12').value = 'Total Pengeluaran';
  ws.getCell('G12').font = { bold: true };
  ws.getCell('H12').value = input.totalExpense; // CHART CONTRACT
  ws.getCell('H12').numFmt = CURRENCY_FMT;
  ws.getCell('H12').font = { color: { argb: 'FFEF4444' }, bold: true };

  ws.getCell('B13').value = input.totalAssets; // CHART CONTRACT
  ws.getCell('B13').numFmt = CURRENCY_FMT;
  ws.getCell('B13').font = { bold: true, size: 13 };

  // ── Section headers row 16 ────────────────────────────────────────────────
  ws.mergeCells('B16:E16');
  ws.getCell('B16').value = 'KATEGORI';
  ws.getCell('B16').fill = HEADER_FILL;
  ws.getCell('B16').font = HEADER_FONT;

  ws.mergeCells('F16:K16'); // 6 cols: No, Tanggal, Jumlah, Kategori, Deskripsi, Metode
  ws.getCell('F16').value = 'P E M A S U K A N';
  ws.getCell('F16').fill = HEADER_FILL;
  ws.getCell('F16').font = HEADER_FONT;

  ws.mergeCells('L16:R16'); // 7 cols: No, Tanggal, Jumlah, Kategori, Deskripsi, Akun, Catatan
  ws.getCell('L16').value = 'P E N G E L U A R A N';
  ws.getCell('L16').fill = HEADER_FILL;
  ws.getCell('L16').font = HEADER_FONT;

  ws.mergeCells('S16:T16');
  ws.getCell('S16').value = 'Rekap Pengeluaran';
  ws.getCell('S16').fill = HEADER_FILL;
  ws.getCell('S16').font = HEADER_FONT;

  // ── Column headers row 17 ─────────────────────────────────────────────────
  const colHdrFont = { bold: true };
  ws.getCell('B17').value = 'Pemasukan';
  ws.getCell('B17').font = colHdrFont;
  ws.getCell('D17').value = 'Pengeluaran';
  ws.getCell('D17').font = colHdrFont;

  for (const [cell, label] of [
    ['F17', 'No'],
    ['G17', 'Tanggal'],
    ['H17', 'Jumlah'],
    ['I17', 'Kategori'],
    ['J17', 'Deskripsi'], // NEW — was "Method" / missing
    ['K17', 'Metode'],    // was spacer column
  ] as [string, string][]) {
    ws.getCell(cell).value = label;
    ws.getCell(cell).font = colHdrFont;
  }

  for (const [cell, label] of [
    ['L17', 'No'],
    ['M17', 'Tanggal'],
    ['N17', 'Jumlah'],
    ['O17', 'Kategori'],
    ['P17', 'Deskripsi'], // NEW — was "Akun"
    ['Q17', 'Akun'],      // shifted right
    ['R17', 'Catatan'],   // was spacer column
  ] as [string, string][]) {
    ws.getCell(cell).value = label;
    ws.getCell(cell).font = colHdrFont;
  }

  ws.getCell('S17').value = 'Kategori';
  ws.getCell('S17').font = colHdrFont;
  ws.getCell('T17').value = 'Total';
  ws.getCell('T17').font = colHdrFont;

  // ── Data rows (start at row 18) ───────────────────────────────────────────
  // CHART CONTRACT: D18:D{n} = expense category names, E18:E{n} = totals
  input.incomeCategories.forEach((cat, i) => {
    const r = 18 + i;
    ws.getCell(`B${r}`).value = cat.category;
    ws.getCell(`C${r}`).value = cat.total;
    ws.getCell(`C${r}`).numFmt = CURRENCY_FMT;
  });

  input.expenseCategories.forEach((cat, i) => {
    const r = 18 + i;
    ws.getCell(`D${r}`).value = cat.category; // CHART CONTRACT
    ws.getCell(`E${r}`).value = cat.total;    // CHART CONTRACT
    ws.getCell(`E${r}`).numFmt = CURRENCY_FMT;
  });

  input.incomeTxs.forEach((tx, i) => {
    const r = 18 + i;
    ws.getCell(`F${r}`).value = i + 1;
    ws.getCell(`G${r}`).value = formatDateID(tx.date);
    ws.getCell(`H${r}`).value = tx.amount;
    ws.getCell(`H${r}`).numFmt = CURRENCY_FMT;
    ws.getCell(`H${r}`).font = { color: { argb: 'FF10B981' } };
    ws.getCell(`I${r}`).value = tx.category;
    ws.getCell(`J${r}`).value = tx.description; // NEW Deskripsi
    ws.getCell(`K${r}`).value = tx.paymentMethod; // Metode (was J)
  });

  input.expenseTxs.forEach((tx, i) => {
    const r = 18 + i;
    ws.getCell(`L${r}`).value = i + 1;
    ws.getCell(`M${r}`).value = formatDateID(tx.date);
    ws.getCell(`N${r}`).value = tx.amount;
    ws.getCell(`N${r}`).numFmt = CURRENCY_FMT;
    ws.getCell(`N${r}`).font = { color: { argb: 'FFEF4444' } };
    ws.getCell(`O${r}`).value = tx.category;
    ws.getCell(`P${r}`).value = tx.description;   // NEW Deskripsi
    ws.getCell(`Q${r}`).value = tx.paymentMethod; // Akun (shifted from P)
    ws.getCell(`R${r}`).value = tx.notes || '';   // Catatan (shifted from Q)
  });

  // Rekap Pengeluaran (right side panel)
  input.expenseCategories.forEach((cat, i) => {
    ws.getCell(`S${18 + i}`).value = cat.category;
    ws.getCell(`T${18 + i}`).value = cat.total;
    ws.getCell(`T${18 + i}`).numFmt = CURRENCY_FMT;
  });

  // ── Payment Methods ───────────────────────────────────────────────────────
  const catRows = Math.max(input.incomeCategories.length, input.expenseCategories.length);
  const pmRow = Math.max(32, 20 + catRows);
  ws.getCell(`B${pmRow}`).value = 'Saldo (periode ini)'; // Fixed: was "Payment Method"
  ws.getCell(`B${pmRow}`).font = { bold: true };
  ws.getCell(`D${pmRow}`).value = 'Jumlah';
  ws.getCell(`D${pmRow}`).font = { bold: true };
  input.paymentMethodBalances.forEach((pm, i) => {
    const r = pmRow + 2 + i;
    ws.getCell(`B${r}`).value = pm.name;
    ws.getCell(`D${r}`).value = pm.balance;
    ws.getCell(`D${r}`).numFmt = CURRENCY_FMT;
  });

  // ── Bills (skip entirely when empty) ─────────────────────────────────────
  if (input.bills.length > 0) {
    const billsRow = pmRow + 4 + input.paymentMethodBalances.length;
    ws.mergeCells(`B${billsRow}:E${billsRow}`);
    ws.getCell(`B${billsRow}`).value = 'C A T A T A N   T A G I H A N';
    ws.getCell(`B${billsRow}`).fill = HEADER_FILL;
    ws.getCell(`B${billsRow}`).font = HEADER_FONT;
    const billsHdrRow = billsRow + 2;
    ws.getCell(`C${billsHdrRow}`).value = 'Tagihan';
    ws.getCell(`C${billsHdrRow}`).font = { bold: true };
    ws.getCell(`D${billsHdrRow}`).value = 'Jumlah';
    ws.getCell(`D${billsHdrRow}`).font = { bold: true };
    input.bills.forEach((bill, i) => {
      const r = billsHdrRow + 1 + i;
      // Fixed: was bill.isPaid (boolean rendered as TRUE/FALSE)
      ws.getCell(`B${r}`).value = bill.isPaid ? '✓ Lunas' : '○ Belum';
      ws.getCell(`B${r}`).font = {
        color: { argb: bill.isPaid ? 'FF10B981' : 'FFEF4444' },
      };
      ws.getCell(`C${r}`).value = bill.name;
      ws.getCell(`D${r}`).value = bill.amount;
      ws.getCell(`D${r}`).numFmt = CURRENCY_FMT;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/xlsx-template-builder.ts
git commit -m "feat: add xlsx-template-builder — shared Laporan sheet layout with all fixes"
```

---

## Task 3 — Create chart-xml-injector.ts

**Files:**
- Create: `src/lib/chart-xml-injector.ts`

This module takes an ArrayBuffer from `buildXlsxWorkbook`, uses JSZip to open it, injects 3 DrawingML chart XML files and a new "Grafik" worksheet, then returns a new ArrayBuffer. The Grafik sheet is the first tab when the file opens.

The Grafik sheet contains:
- Rows 1–4: title + KPI header
- Rows 6–22: Donut chart (left, A–H) + Cashflow bar chart (right, I–T)
- Rows 23–40: Expense pie chart (full width, A–T)
- Rows 44–46: helper data cells with formulas referencing Laporan (used by chart XML as contiguous ranges)

- [ ] **Step 1: Create the file**

Create `src/lib/chart-xml-injector.ts`:

```typescript
// src/lib/chart-xml-injector.ts
// CLIENT-ONLY — browser only. Uses JSZip to post-process an ExcelJS-generated
// XLSX ArrayBuffer and inject 3 native DrawingML charts + a "Grafik" sheet.
import JSZip from 'jszip';

export interface ChartInjectorInput {
  buffer: ArrayBuffer;
  scopeLabel: string;
  generatedAt: Date;
  expCatCount: number; // number of expense categories — determines pie chart range
}

// OOXML color palette for pie/donut slices (fully opaque ARGB)
const PIE_COLORS = [
  'FF2563EB', 'FF10B981', 'FFF59E0B', 'FFEF4444',
  'FF8B5CF6', 'FF06B6D4', 'FFF97316', 'FF84CC16', 'FFEC4899',
];

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Chart XML templates ──────────────────────────────────────────────────────

function donutChartXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:autoTitleDeleted val="1"/>
    <c:plotArea>
      <c:doughnutChart>
        <c:varyColors val="0"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:dPt><c:idx val="0"/><c:spPr><a:solidFill><a:srgbClr val="10B981"/></a:solidFill></c:spPr></c:dPt>
          <c:dPt><c:idx val="1"/><c:spPr><a:solidFill><a:srgbClr val="EF4444"/></a:solidFill></c:spPr></c:dPt>
          <c:cat>
            <c:strRef><c:f>Grafik!$A$44:$A$45</c:f></c:strRef>
          </c:cat>
          <c:val>
            <c:numRef><c:f>Grafik!$B$44:$B$45</c:f></c:numRef>
          </c:val>
        </c:ser>
        <c:holeSize val="50"/>
      </c:doughnutChart>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/></c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

function cashflowBarChartXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:autoTitleDeleted val="1"/>
    <c:plotArea>
      <c:barChart>
        <c:barDir val="bar"/>
        <c:grouping val="clustered"/>
        <c:varyColors val="1"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:dPt><c:idx val="0"/><c:spPr><a:solidFill><a:srgbClr val="10B981"/></a:solidFill></c:spPr></c:dPt>
          <c:dPt><c:idx val="1"/><c:spPr><a:solidFill><a:srgbClr val="EF4444"/></a:solidFill></c:spPr></c:dPt>
          <c:dPt><c:idx val="2"/><c:spPr><a:solidFill><a:srgbClr val="2563EB"/></a:solidFill></c:spPr></c:dPt>
          <c:cat>
            <c:strRef><c:f>Grafik!$A$44:$A$46</c:f></c:strRef>
          </c:cat>
          <c:val>
            <c:numRef><c:f>Grafik!$B$44:$B$46</c:f></c:numRef>
          </c:val>
        </c:ser>
      </c:barChart>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/></c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

function expensePieChartXml(lastRow: number): string {
  const dPts = PIE_COLORS.map((clr, i) =>
    `<c:dPt><c:idx val="${i}"/><c:spPr><a:solidFill><a:srgbClr val="${clr.slice(2)}"/></a:solidFill></c:spPr></c:dPt>`
  ).join('\n        ');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:autoTitleDeleted val="1"/>
    <c:plotArea>
      <c:pieChart>
        <c:varyColors val="1"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          ${dPts}
          <c:cat>
            <c:strRef><c:f>Laporan!$D$18:$D$${lastRow}</c:f></c:strRef>
          </c:cat>
          <c:val>
            <c:numRef><c:f>Laporan!$E$18:$E$${lastRow}</c:f></c:numRef>
          </c:val>
        </c:ser>
        <c:firstSliceAng val="0"/>
      </c:pieChart>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/></c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

// ── Drawing XML (anchors 3 charts on Grafik sheet) ────────────────────────────

function drawingXml(): string {
  // Rows are 0-indexed in OOXML twoCellAnchor.
  // Spec layout (1-indexed): rows 6–22 = donut+bar; rows 23–40 = pie
  // 0-indexed: donut+bar rows 5–21; pie rows 22–39
  // Cols: donut A–H = 0–7; bar I–T = 8–19; pie A–T = 0–19
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>5</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>7</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>21</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr>
      <xdr:cNvPr id="2" name="Donut"/><xdr:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></xdr:cNvGraphicFramePr>
    </xdr:nvGraphicFramePr>
    <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart r:id="rId1"/>
    </a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/>
  </xdr:twoCellAnchor>
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>5</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>19</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>21</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr>
      <xdr:cNvPr id="3" name="Cashflow"/><xdr:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></xdr:cNvGraphicFramePr>
    </xdr:nvGraphicFramePr>
    <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart r:id="rId2"/>
    </a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/>
  </xdr:twoCellAnchor>
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>22</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>19</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>39</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr>
      <xdr:cNvPr id="4" name="Pie"/><xdr:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></xdr:cNvGraphicFramePr>
    </xdr:nvGraphicFramePr>
    <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart r:id="rId3"/>
    </a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`;
}

// ── Grafik sheet XML ──────────────────────────────────────────────────────────

function grafikSheetXml(scopeLabel: string, generatedAt: Date): string {
  const dateStr = formatDateShort(generatedAt);
  // Rows 44–46 are helper data cells for chart series references.
  // A44:A46 = category labels (used as c:strRef in chart XML)
  // B44:B46 = formula values referencing Laporan KPI cells (used as c:numRef)
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Grafik Keuangan \u2014 ${scopeLabel}</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>Dibuat: ${dateStr}</t></is></c>
    </row>
    <row r="3">
      <c r="B3" t="inlineStr"><is><t>Pemasukan</t></is></c>
      <c r="D3" t="inlineStr"><is><t>Pengeluaran</t></is></c>
      <c r="F3" t="inlineStr"><is><t>Saldo</t></is></c>
    </row>
    <row r="4">
      <c r="B4"><f>Laporan!H10</f><v>0</v></c>
      <c r="D4"><f>Laporan!H12</f><v>0</v></c>
      <c r="F4"><f>Laporan!B13</f><v>0</v></c>
    </row>
    <row r="44">
      <c r="A44" t="inlineStr"><is><t>Total Pemasukan</t></is></c>
      <c r="B44"><f>Laporan!H10</f><v>0</v></c>
    </row>
    <row r="45">
      <c r="A45" t="inlineStr"><is><t>Total Pengeluaran</t></is></c>
      <c r="B45"><f>Laporan!H12</f><v>0</v></c>
    </row>
    <row r="46">
      <c r="A46" t="inlineStr"><is><t>Saldo</t></is></c>
      <c r="B46"><f>Laporan!B13</f><v>0</v></c>
    </row>
  </sheetData>
  <mergeCells count="1">
    <mergeCell ref="A1:H1"/>
  </mergeCells>
  <drawing r:id="rId1"/>
</worksheet>`;
}

// ── Main injection function ───────────────────────────────────────────────────

/**
 * Opens the ExcelJS-generated XLSX ArrayBuffer with JSZip, injects:
 *   - xl/charts/chart1.xml (donut)
 *   - xl/charts/chart2.xml (cashflow bar)
 *   - xl/charts/chart3.xml (expense pie)
 *   - xl/drawings/drawing1.xml
 *   - xl/drawings/_rels/drawing1.xml.rels
 *   - xl/worksheets/sheet{N}.xml  (Grafik sheet)
 *   - xl/worksheets/_rels/sheet{N}.xml.rels
 * Updates [Content_Types].xml, workbook.xml (prepend Grafik as first sheet),
 * workbook.xml.rels. Returns new ArrayBuffer.
 */
export async function injectCharts(input: ChartInjectorInput): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(input.buffer);
  const lastExpCatRow = 17 + input.expCatCount; // e.g., 5 cats → row 22

  // ── Step 1: Count existing worksheets to determine N ─────────────────────
  const existingSheets = Object.keys(zip.files).filter((f) =>
    /^xl\/worksheets\/sheet\d+\.xml$/.test(f)
  );
  const N = existingSheets.length + 1; // Grafik sheet file index

  // ── Step 2: Parse existing sheetId and rId maxima ────────────────────────
  const wbXml = await zip.file('xl/workbook.xml')!.async('string');
  const sheetIdMatches = [...wbXml.matchAll(/sheetId="(\d+)"/g)];
  const maxSheetId = sheetIdMatches.reduce((max, m) => Math.max(max, parseInt(m[1])), 0);
  const rIdMatches = [...wbXml.matchAll(/r:id="rId(\d+)"/g)];
  const maxRid = rIdMatches.reduce((max, m) => Math.max(max, parseInt(m[1])), 0);
  const newSheetId = maxSheetId + 1;
  const newRid = `rId${maxRid + 1}`;

  // ── Step 3: Add chart XML files ───────────────────────────────────────────
  zip.file('xl/charts/chart1.xml', donutChartXml());
  zip.file('xl/charts/chart2.xml', cashflowBarChartXml());
  zip.file('xl/charts/chart3.xml', expensePieChartXml(lastExpCatRow));

  // ── Step 4: Add drawing XML and its rels ─────────────────────────────────
  zip.file('xl/drawings/drawing1.xml', drawingXml());
  zip.file(
    'xl/drawings/_rels/drawing1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart3.xml"/>
</Relationships>`
  );

  // ── Step 5: Add Grafik worksheet and its rels ─────────────────────────────
  zip.file(
    `xl/worksheets/sheet${N}.xml`,
    grafikSheetXml(input.scopeLabel, input.generatedAt)
  );
  zip.file(
    `xl/worksheets/_rels/sheet${N}.xml.rels`,
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`
  );

  // ── Step 6: Update [Content_Types].xml ───────────────────────────────────
  const ctXml = await zip.file('[Content_Types].xml')!.async('string');
  const chartOverrides = [
    `<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`,
    `<Override PartName="/xl/charts/chart2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`,
    `<Override PartName="/xl/charts/chart3.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`,
    `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
    `<Override PartName="/xl/worksheets/sheet${N}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ].join('\n');
  zip.file('[Content_Types].xml', ctXml.replace('</Types>', `${chartOverrides}\n</Types>`));

  // ── Step 7: Prepend Grafik as first sheet in workbook.xml ─────────────────
  const grafikSheetEl = `<sheet name="Grafik" sheetId="${newSheetId}" r:id="${newRid}"/>`;
  // Insert Grafik before the first existing <sheet element inside <sheets>
  zip.file(
    'xl/workbook.xml',
    wbXml.replace(/<sheets>/, `<sheets>${grafikSheetEl}`)
  );

  // ── Step 8: Add Grafik relationship in workbook.xml.rels ──────────────────
  const wbRelsXml = await zip.file('xl/_rels/workbook.xml.rels')!.async('string');
  const grafikRel = `<Relationship Id="${newRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${N}.xml"/>`;
  zip.file('xl/_rels/workbook.xml.rels', wbRelsXml.replace('</Relationships>', `${grafikRel}\n</Relationships>`));

  // ── Step 9: Generate and return new buffer ────────────────────────────────
  return zip.generateAsync({ type: 'arraybuffer' });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/chart-xml-injector.ts
git commit -m "feat: add chart-xml-injector — JSZip OpenXML injection for native Excel charts"
```

---

## Task 4 — Update exportExcel in export-utils.ts

**Files:**
- Modify: `src/lib/export-utils.ts` (lines 1–253)

Replace `exportExcel` to delegate to `buildXlsxWorkbook` + `injectCharts`. Remove the chart-renderer PNG import from the Excel path (PDF still uses it).

- [ ] **Step 1: Update imports at top of file**

Current top of `src/lib/export-utils.ts`:
```typescript
import type { ExportReportInput } from './types';
import { type Transaction } from './types';
import { renderDonutChart, renderCashflowChart, renderExpensePieChart } from './chart-renderer';
import { formatDateID, formatDatetimeID } from './formatters';
```

Replace with:
```typescript
import type { ExportReportInput } from './types';
import { type Transaction } from './types';
import { renderDonutChart, renderCashflowChart, renderExpensePieChart } from './chart-renderer';
import { formatDateID, formatDatetimeID } from './formatters';
import { buildXlsxWorkbook } from './xlsx-template-builder';
import { injectCharts } from './chart-xml-injector';
```

- [ ] **Step 2: Replace exportExcel function (lines 20–253)**

Delete everything from `export async function exportExcel` through the closing `}` at line 253. Replace with:

```typescript
export async function exportExcel(input: ExportReportInput): Promise<void> {
  const {
    transactions,
    totalIncome,
    totalExpense,
    totalAssets,
    incomeCategories,
    expenseCategories,
    paymentMethodBalances,
    bills,
    scopeLabel,
    filename,
  } = input;

  const incomeTxs = transactions.filter((tx) => tx.type === 'income');
  const expenseTxs = transactions.filter((tx) => tx.type === 'expense');

  const buffer = await buildXlsxWorkbook({
    title: scopeLabel,
    scopeLabel,
    generatedAt: new Date(),
    totalIncome,
    totalExpense,
    totalAssets,
    incomeCategories,
    expenseCategories,
    incomeTxs,
    expenseTxs,
    paymentMethodBalances,
    bills,
    filename,
  });

  const finalBuffer = await injectCharts({
    buffer,
    scopeLabel,
    generatedAt: new Date(),
    expCatCount: expenseCategories.length,
  });

  downloadBlob(
    new Blob([finalBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run typecheck 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/export-utils.ts
git commit -m "feat: wire exportExcel through xlsx-template-builder + chart-xml-injector"
```

---

## Task 5 — Fix exportCSV in export-utils.ts

**Files:**
- Modify: `src/lib/export-utils.ts` (lines 8–16)

Four changes: UTF-8 BOM, 2 quoted comment header rows, Indonesian column names and type values, formatted dates and amounts.

- [ ] **Step 1: Replace exportCSV function**

Delete lines 8–16. Replace with:

```typescript
export function exportCSV(
  transactions: Transaction[],
  filename: string,
  scopeLabel: string,
  totalIncome: number,
  totalExpense: number,
  totalAssets: number
): void {
  const fmtAmount = (n: number) =>
    'Rp ' + new Intl.NumberFormat('id-ID').format(n);

  const commentScope = `"// Laporan Keuangan - ${scopeLabel} | Diekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}"`;
  const commentTotals = `"// Total Pemasukan: ${fmtAmount(totalIncome)} | Total Pengeluaran: ${fmtAmount(totalExpense)} | Saldo: ${fmtAmount(totalAssets)}"`;

  const headers = 'Tanggal,Deskripsi,Kategori,Tipe,Jumlah,Metode Pembayaran,Catatan';
  const rows = transactions.map(
    (tx) =>
      `${formatDateID(tx.date)},"${tx.description.replace(/"/g, '""')}","${tx.category}",${tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'},"${fmtAmount(tx.amount)}","${tx.paymentMethod}","${(tx.notes || '').replace(/"/g, '""')}"`
  );
  // \uFEFF = UTF-8 BOM — required for correct Indonesian character rendering in Excel on Windows
  const content = '\uFEFF' + [commentScope, commentTotals, headers, ...rows].join('\n');
  downloadBlob(content, filename, 'text/csv;charset=utf-8');
}
```

- [ ] **Step 2: Fix call sites**

The `exportCSV` signature changed — it now takes `scopeLabel, totalIncome, totalExpense, totalAssets`. Find all call sites:

```bash
grep -rn "exportCSV(" src/ --include="*.ts" --include="*.tsx"
```

Expected locations: `src/features/export/useExport.ts`, `src/app/transactions/page.tsx`

In each location, add the new arguments. Example — in `useExport.ts`, the call likely looks like:

```typescript
exportCSV(transactions, filename)
```

Update to:
```typescript
exportCSV(transactions, filename, input.scopeLabel, input.totalIncome, input.totalExpense, input.totalAssets)
```

Do the same for the transactions page call site. Read each file before editing to find the exact line.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/export-utils.ts src/features/export/useExport.ts src/app/transactions/page.tsx
git commit -m "fix: exportCSV — UTF-8 BOM, scope header, Indonesian labels, formatted dates/amounts"
```

---

## Task 6 — Rewrite exportPDF in export-utils.ts

**Files:**
- Modify: `src/lib/export-utils.ts` — `exportPDF` function (lines 257–509)

Five fixes + dark gradient header:
1. Dark gradient header (page 1: 45mm full; page 2+: 12mm condensed)
2. Two-pass page number footer (`"Halaman X / N"`)
3. Income category breakdown (side-by-side with expense breakdown)
4. Add Deskripsi column to both transaction tables
5. Fix bill status `☑/☐` → `"Lunas"`/`"Belum"` plain text
6. Remove `tableWidth: CONTENT_W / 2` (half-width tables) from all tables

- [ ] **Step 1: Replace exportPDF function**

Delete lines 257–509. Replace with:

```typescript
export async function exportPDF(input: ExportReportInput): Promise<void> {
  const {
    transactions,
    totalIncome,
    totalExpense,
    totalAssets,
    incomeCategories,
    expenseCategories,
    paymentMethodBalances,
    bills,
    scopeLabel,
    filename,
  } = input;

  const [donutPng, cashflowPng, piePng] = await Promise.all([
    renderDonutChart(totalIncome, totalExpense).catch(() => null),
    renderCashflowChart(totalIncome, totalExpense, totalAssets).catch(() => null),
    renderExpensePieChart(expenseCategories).catch(() => null),
  ]);

  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 15;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const BLUE: [number, number, number] = [37, 99, 235];
  const EMERALD_TINT: [number, number, number] = [209, 250, 229];
  const RED_TINT: [number, number, number] = [254, 226, 226];

  const fmtIDR = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n);

  // ── Gradient header helpers ───────────────────────────────────────────────
  // jsPDF does not support CSS gradients. Simulate with 20 horizontal strips
  // interpolating RGB from #1E3A8A (dark blue) to #3B82F6 (bright blue).
  function drawGradientHeader(h: number): void {
    const from: [number, number, number] = [30, 58, 138];   // #1E3A8A
    const to: [number, number, number] = [59, 130, 246];    // #3B82F6
    const strips = 20;
    const stripH = h / strips;
    for (let i = 0; i < strips; i++) {
      const t = i / (strips - 1);
      doc.setFillColor(
        Math.round(from[0] + (to[0] - from[0]) * t),
        Math.round(from[1] + (to[1] - from[1]) * t),
        Math.round(from[2] + (to[2] - from[2]) * t)
      );
      doc.rect(0, i * stripH, PAGE_W, stripH + 0.5, 'F');
    }
  }

  // ── Page 1 full header (45mm) ─────────────────────────────────────────────
  const FULL_HEADER_H = 45;
  const CONDENSED_HEADER_H = 12;
  drawGradientHeader(FULL_HEADER_H);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Laporan Keuangan', MARGIN, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${scopeLabel}  |  Dibuat: ${new Date().toLocaleDateString('id-ID')}`, MARGIN, 17);

  // 3 KPI boxes at y=22mm
  const boxW = CONTENT_W / 3 - 3;
  const kpiBoxes: { label: string; value: number; valueColor: [number, number, number] }[] = [
    { label: 'Pemasukan',   value: totalIncome,   valueColor: [110, 231, 183] },
    { label: 'Pengeluaran', value: totalExpense,   valueColor: [252, 165, 165] },
    { label: 'Saldo',       value: totalAssets,   valueColor: [255, 255, 255] },
  ];
  kpiBoxes.forEach((box, idx) => {
    const x = MARGIN + idx * (boxW + 4.5);
    doc.setFillColor(70, 100, 180); // solid fill — rgba not supported in jsPDF
    doc.roundedRect(x, 22, boxW, 16, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 220, 255);
    doc.text(box.label, x + 3, 28);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...box.valueColor);
    doc.text(fmtIDR(box.value), x + 3, 35);
  });

  doc.setTextColor(0, 0, 0);
  let y = FULL_HEADER_H + 4;

  // ── Charts ────────────────────────────────────────────────────────────────
  const chartRowH = 52;
  if (donutPng)   doc.addImage(donutPng,    'PNG', MARGIN,      y, 70,  chartRowH);
  if (cashflowPng) doc.addImage(cashflowPng, 'PNG', MARGIN + 75, y, 105, chartRowH);
  y += chartRowH + 4;

  if (piePng) {
    const pieW = 90;
    doc.addImage(piePng, 'PNG', MARGIN + (CONTENT_W - pieW) / 2, y, pieW, 65);
    y += 69;
  }

  // ── Rekap Pemasukan + Rekap Pengeluaran side-by-side ─────────────────────
  const halfW = CONTENT_W / 2 - 3;
  if (incomeCategories.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Rekap Pemasukan', MARGIN, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Kategori', 'Total']],
      body: incomeCategories.map((c) => [c.category, fmtIDR(c.total)]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: MARGIN },
      tableWidth: halfW,
    });
  }
  if (expenseCategories.length > 0) {
    const rekapY = incomeCategories.length > 0
      ? y + 2  // same startY — side by side
      : y;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Rekap Pengeluaran', MARGIN + halfW + 6, y);
    autoTable(doc, {
      startY: rekapY + (incomeCategories.length > 0 ? 0 : 2),
      head: [['Kategori', 'Total']],
      body: expenseCategories.map((c) => [c.category, fmtIDR(c.total)]),
      theme: 'striped',
      headStyles: { fillColor: BLUE, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: MARGIN + halfW + 6 },
      tableWidth: halfW,
    });
  }
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ── Saldo per Metode Pembayaran (full width) ──────────────────────────────
  if (paymentMethodBalances.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Saldo (periode ini)', MARGIN, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Metode Pembayaran', 'Saldo']],
      body: paymentMethodBalances.map((pm) => [pm.name, fmtIDR(pm.balance)]),
      theme: 'striped',
      headStyles: { fillColor: BLUE, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ── Page 2+: transaction tables with condensed header ────────────────────
  // Helper: draws condensed header on current page (called via didDrawPage callback)
  function drawCondensedHeader(): void {
    drawGradientHeader(CONDENSED_HEADER_H);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Laporan Keuangan \u2014 ${scopeLabel}`, MARGIN, 7);
    doc.setTextColor(0, 0, 0);
  }

  const incomeTxs = transactions.filter((tx) => tx.type === 'income');
  if (incomeTxs.length > 0) {
    doc.addPage();
    drawCondensedHeader();
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('P E M A S U K A N', MARGIN, CONDENSED_HEADER_H + 8);
    autoTable(doc, {
      startY: CONDENSED_HEADER_H + 12,
      head: [['No', 'Tanggal', 'Jumlah', 'Deskripsi', 'Kategori', 'Metode']],
      body: incomeTxs.map((tx, i) => [
        i + 1,
        formatDateID(tx.date),
        fmtIDR(tx.amount),
        tx.description,
        tx.category,
        tx.paymentMethod,
      ]),
      theme: 'striped',
      headStyles: { fillColor: BLUE, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: EMERALD_TINT },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => drawCondensedHeader(),
    });
  }

  const expenseTxs = transactions.filter((tx) => tx.type === 'expense');
  if (expenseTxs.length > 0) {
    const afterIncome =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? CONDENSED_HEADER_H + 12;
    let expenseStartY: number;
    if (afterIncome + 8 < PAGE_H - 20) {
      expenseStartY = afterIncome + 8;
    } else {
      doc.addPage();
      drawCondensedHeader();
      expenseStartY = CONDENSED_HEADER_H + 12;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('P E N G E L U A R A N', MARGIN, expenseStartY - 4);
    autoTable(doc, {
      startY: expenseStartY,
      head: [['No', 'Tanggal', 'Jumlah', 'Deskripsi', 'Kategori', 'Akun', 'Catatan']],
      body: expenseTxs.map((tx, i) => [
        i + 1,
        formatDateID(tx.date),
        fmtIDR(tx.amount),
        tx.description,
        tx.category,
        tx.paymentMethod,
        tx.notes || '',
      ]),
      theme: 'striped',
      headStyles: { fillColor: BLUE, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: RED_TINT },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => drawCondensedHeader(),
    });
  }

  if (bills.length > 0) {
    const afterExpense =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? CONDENSED_HEADER_H + 12;
    let billsStartY: number;
    if (afterExpense + 8 < PAGE_H - 20) {
      billsStartY = afterExpense + 8;
    } else {
      doc.addPage();
      drawCondensedHeader();
      billsStartY = CONDENSED_HEADER_H + 12;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('C A T A T A N   T A G I H A N', MARGIN, billsStartY - 4);
    autoTable(doc, {
      startY: billsStartY,
      head: [['Status', 'Tagihan', 'Jumlah']],
      body: bills.map((bill) => [
        bill.isPaid ? 'Lunas' : 'Belum', // Fixed: was ☑/☐ which breaks in jsPDF
        bill.name,
        fmtIDR(bill.amount),
      ]),
      theme: 'striped',
      headStyles: { fillColor: BLUE, fontSize: 8 },
      styles: { fontSize: 8 },
      bodyStyles: {},
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          data.cell.styles.textColor =
            data.cell.raw === 'Lunas' ? [16, 185, 129] : [239, 68, 68];
        }
      },
      columnStyles: { 0: { cellWidth: 18, halign: 'center' }, 2: { halign: 'right' } },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => drawCondensedHeader(),
    });
  }

  // ── Pass 2: resolve page numbers ──────────────────────────────────────────
  // Pass 1 drew "Halaman ? / ?" placeholders via didDrawPage.
  // Pass 2 overwrites each footer with the resolved "Halaman X / N" string.
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    // White-out the placeholder area
    doc.setFillColor(255, 255, 255);
    doc.rect(MARGIN, PAGE_H - 12, CONTENT_W, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Halaman ${i} / ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0);

  doc.save(filename);
}
```

> **Note on page numbers:** The `didDrawPage` callback above only draws the condensed header on continuation pages. Page number footers are drawn entirely in Pass 2 (the loop at the end), which resolves the total page count once all content is added.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run typecheck 2>&1 | tail -5
```

- [ ] **Step 3: Run tests to verify nothing broke**

```bash
npm test 2>&1 | tail -10
```

Expected: all tests pass (PDF/Excel functions are client-side, not in test suite).

- [ ] **Step 4: Commit**

```bash
git add src/lib/export-utils.ts
git commit -m "feat: exportPDF dark gradient header, Deskripsi column, income breakdown, page numbers, bill text fix"
```

---

## Task 7 — Update report-generator.ts

**Files:**
- Modify: `src/features/reports/report-generator.ts`

Both `generateMonthlyReport` and `generateAnnualReport` currently duplicate ~400 lines of XLSX layout identical to `export-utils.ts`. Replace both with calls to `buildXlsxWorkbook` + `injectCharts`.

The annual report also has a second sheet "Ringkasan Bulanan". Keep that by adding it to the workbook **before** calling `workbook.xlsx.writeBuffer()` — but since the builder now returns an ArrayBuffer (not a workbook), add the Ringkasan sheet by re-opening via JSZip and inserting it as a separate step.

The simplest approach: extend `XlsxTemplateInput` with an optional `ringkasanSheet` field, and have `buildXlsxWorkbook` add it when present.

> **Ordering note:** Complete steps in order. Step 4 (replace imports + add `triggerDownload`) must be done **before** Steps 2 and 3, because both functions call `triggerDownload`. If you follow numeric order you will get a compile error at Step 2 that is resolved by Step 4. Complete Step 4 first, then Steps 1, 2, 3, 5–8.

- [ ] **Step 1: Add optional ringkasanSheet to XlsxTemplateInput**

In `src/lib/xlsx-template-builder.ts`, add the optional field to the interface:

```typescript
export interface XlsxTemplateInput {
  // ... existing fields ...
  /**
   * Optional second worksheet (e.g. "Ringkasan Bulanan" for annual reports).
   * When provided, buildXlsxWorkbook adds it after the Laporan sheet.
   */
  ringkasanSheet?: {
    name: string;
    columns: { header: string; key: string; width: number }[];
    rows: Record<string, string | number>[];
    headerArgb?: string; // fill color for header row, default 'FF2563EB'
  };
}
```

At the end of `buildXlsxWorkbook`, just before `const buffer = await workbook.xlsx.writeBuffer()`, add:

```typescript
  // Optional second sheet (used by annual report for monthly breakdown)
  if (input.ringkasanSheet) {
    const ws2 = workbook.addWorksheet(input.ringkasanSheet.name);
    ws2.columns = input.ringkasanSheet.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width,
    }));
    const fill2 = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: input.ringkasanSheet.headerArgb ?? 'FF2563EB' },
    };
    // ExcelJS only iterates cells that have been explicitly written, so eachCell()
    // on row 1 (header) may yield nothing. Address cells by column index instead.
    input.ringkasanSheet.columns.forEach((_, colIdx) => {
      const cell = ws2.getCell(1, colIdx + 1);
      cell.fill = fill2;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });
    input.ringkasanSheet.rows.forEach((row) => ws2.addRow(row));
    // Format all number cells in the ringkasan sheet
    ws2.eachRow((row, rn) => {
      if (rn === 1) return;
      row.eachCell((cell) => {
        if (typeof cell.value === 'number') cell.numFmt = CURRENCY_FMT;
      });
    });
  }
```

- [ ] **Step 2: Rewrite generateMonthlyReport**

In `src/features/reports/report-generator.ts`, delete everything in `generateMonthlyReport` (lines 31–259) and replace:

```typescript
export async function generateMonthlyReport(data: MonthlyReportData): Promise<void> {
  const { buildXlsxWorkbook } = await import('@/lib/xlsx-template-builder');
  const { injectCharts } = await import('@/lib/chart-xml-injector');
  const { MONTH_NAMES_ID } = await import('@/lib/formatters');

  const scopeLabel = `${MONTH_NAMES_ID[data.month]} ${data.year}`;
  const pm = data.paymentMethodBalances.map((b) => ({ name: b.name, balance: b.balance }));

  const buffer = await buildXlsxWorkbook({
    title: 'Laporan Bulanan',
    scopeLabel,
    generatedAt: new Date(),
    totalIncome: data.totalIncome,
    totalExpense: data.totalExpense,
    totalAssets: data.totalAssets,
    incomeCategories: data.incomeCategories,
    expenseCategories: data.expenseCategories,
    incomeTxs: data.incomeTransactions,
    expenseTxs: data.expenseTransactions,
    paymentMethodBalances: pm,
    bills: data.bills,
    filename: '',
  });

  const finalBuffer = await injectCharts({
    buffer,
    scopeLabel,
    generatedAt: new Date(),
    expCatCount: data.expenseCategories.length,
  });

  const monthStr = String(data.month + 1).padStart(2, '0');
  triggerDownload(finalBuffer, `Laporan-Keuangan-${data.year}-${monthStr}.xlsx`);
}
```

- [ ] **Step 3: Rewrite generateAnnualReport**

Delete everything in `generateAnnualReport` (lines 264–484) and replace:

```typescript
export async function generateAnnualReport(data: AnnualReportData): Promise<void> {
  const { buildXlsxWorkbook } = await import('@/lib/xlsx-template-builder');
  const { injectCharts } = await import('@/lib/chart-xml-injector');
  const { MONTH_NAMES_ID } = await import('@/lib/formatters');

  const expenseCats = data.topCategories
    .filter((c) => c.type === 'expense')
    .map((c) => ({ category: c.category, total: c.total }));
  const incomeCats = data.topCategories
    .filter((c) => c.type === 'income')
    .map((c) => ({ category: c.category, total: c.total }));
  const incomeTxs = data.transactions
    .filter((tx) => tx.type === 'income')
    .sort((a, b) => a.date.localeCompare(b.date));
  const expenseTxs = data.transactions
    .filter((tx) => tx.type === 'expense')
    .sort((a, b) => a.date.localeCompare(b.date));
  const pm = data.paymentMethodBalances.map((b) => ({ name: b.name, balance: b.balance }));

  const buffer = await buildXlsxWorkbook({
    title: 'Laporan Tahunan',
    scopeLabel: `Tahun ${data.year}`,
    generatedAt: new Date(),
    totalIncome: data.totalIncome,
    totalExpense: data.totalExpense,
    totalAssets: data.totalAssets,
    incomeCategories: incomeCats,
    expenseCategories: expenseCats,
    incomeTxs,
    expenseTxs,
    paymentMethodBalances: pm,
    bills: [], // annual reports have no bills section
    filename: '',
    ringkasanSheet: {
      name: 'Ringkasan Bulanan',
      columns: [
        { header: 'Bulan',       key: 'bulan',       width: 16 },
        { header: 'Pemasukan',   key: 'pemasukan',   width: 20 },
        { header: 'Pengeluaran', key: 'pengeluaran', width: 20 },
        { header: 'Saldo',       key: 'saldo',       width: 20 },
      ],
      rows: data.monthlyBreakdown.map((m) => ({
        bulan:       MONTH_NAMES_ID[m.month],
        pemasukan:   m.income,
        pengeluaran: m.expense,
        saldo:       m.balance,
      })),
    },
  });

  const finalBuffer = await injectCharts({
    buffer,
    scopeLabel: `Tahun ${data.year}`,
    generatedAt: new Date(),
    expCatCount: expenseCats.length,
  });

  triggerDownload(finalBuffer, `Laporan-Tahunan-${data.year}.xlsx`);
}
```

- [ ] **Step 4: Add triggerDownload helper and clean up imports**

Replace the old `triggerXlsxDownload` helper and imports at the top of `report-generator.ts`:

```typescript
// src/features/reports/report-generator.ts
// CLIENT-ONLY — called from useReportData.ts hooks only.
import type { MonthlyReportData, AnnualReportData } from '@/lib/api/contracts';

function triggerDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

Remove the old imports of `renderDonutChart`, `renderCashflowChart`, `renderExpensePieChart`, `formatDateID`, `formatDatetimeID`, `MONTH_NAMES_ID` from the top (they're now dynamically imported inside the functions).

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run typecheck 2>&1 | tail -5
```

- [ ] **Step 6: Run full test suite**

```bash
npm test 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 7: Run preflight**

```bash
npm run preflight 2>&1 | tail -20
```

Expected: format check ✓, typecheck ✓, lint ✓, build ✓.

- [ ] **Step 8: Commit**

```bash
git add src/features/reports/report-generator.ts src/lib/xlsx-template-builder.ts
git commit -m "refactor: report-generator delegates to xlsx-template-builder + chart-xml-injector, removes ~400 lines of duplicated layout"
```

---

## Manual Verification Checklist

After all tasks complete, verify each format manually:

**XLSX — native charts:**
1. Navigate to `/export`, download any scope as XLSX
2. Open in Excel → "Grafik" tab should be the FIRST tab
3. Click any chart → chart editor opens (not a static image)
4. Edit a value in the Laporan sheet → chart updates live

**XLSX — fixes:**
5. Check title cell B4: "Laporan Bulanan" (not "Monthly Report")
6. Check column K17: "Metode" (not "Method")
7. Check section header B{pmRow}: "Saldo (periode ini)" (not "Payment Method")
8. Check bill rows: "✓ Lunas" / "○ Belum" text (not TRUE/FALSE)
9. Check column J17: "Deskripsi" present; J18+ populated with transaction descriptions

**PDF — header:**
10. Open downloaded PDF → blue gradient header on page 1 (45mm)
11. KPI boxes visible in header (Pemasukan / Pengeluaran / Saldo)
12. Page 2+ has condensed header (12mm, title only)
13. Footer: "Halaman X / N" on every page

**PDF — content:**
14. "Deskripsi" column present in both income and expense tables
15. "Rekap Pemasukan" table appears alongside "Rekap Pengeluaran"
16. Bills section shows "Lunas" (green) / "Belum" (red)
17. All tables span full content width

**CSV — Windows Excel:**
18. Open downloaded CSV in Excel → no garbled Indonesian characters
19. First two rows are comment headers (scope label + totals)
20. Column headers are Indonesian: "Tanggal, Deskripsi, Kategori, Tipe, Jumlah, Metode Pembayaran, Catatan"
21. Dates formatted as "1 Maret 2026" (not "2026-03-01")
