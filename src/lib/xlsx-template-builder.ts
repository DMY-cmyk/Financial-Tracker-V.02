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
    { width: 3 }, // A  spacer
    { width: 28 }, // B  left panel: category names (income)
    { width: 14 }, // C  left panel: category totals (income)
    { width: 28 }, // D  left panel: category names (expense) — CHART CONTRACT D18:D{n}
    { width: 14 }, // E  left panel: category totals (expense) — CHART CONTRACT E18:E{n}
    { width: 6 }, // F  No (income tx)
    { width: 14 }, // G  Tanggal (income tx)
    { width: 18 }, // H  Jumlah (income tx) — CHART CONTRACT H10=income, H12=expense
    { width: 22 }, // I  Kategori (income tx)
    { width: 22 }, // J  Deskripsi (income tx) — NEW
    { width: 18 }, // K  Metode (income tx) — was spacer col, now content
    { width: 6 }, // L  No (expense tx)
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
    ['K17', 'Metode'], // was spacer column
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
    ['Q17', 'Akun'], // shifted right
    ['R17', 'Catatan'], // was spacer column
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
    ws.getCell(`E${r}`).value = cat.total; // CHART CONTRACT
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
    ws.getCell(`P${r}`).value = tx.description; // NEW Deskripsi
    ws.getCell(`Q${r}`).value = tx.paymentMethod; // Akun (shifted from P)
    ws.getCell(`R${r}`).value = tx.notes || ''; // Catatan (shifted from Q)
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

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
