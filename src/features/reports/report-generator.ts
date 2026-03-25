// src/features/reports/report-generator.ts
// CLIENT-ONLY — called from useReportData.ts hooks only.
import type { MonthlyReportData, AnnualReportData } from '@/lib/api/contracts';
import {
  renderDonutChart,
  renderCashflowChart,
  renderExpensePieChart,
} from '@/lib/chart-renderer';
import { formatDateID, formatDatetimeID, MONTH_NAMES_ID } from '@/lib/formatters';

const CURRENCY_FMT = '"Rp"#,##0';

function stripBase64Prefix(dataUrl: string): string {
  return dataUrl.split(',')[1] ?? dataUrl;
}

async function triggerXlsxDownload(
  workbook: import('exceljs').Workbook,
  filename: string
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Monthly Report ───────────────────────────────────────────────────────────

export async function generateMonthlyReport(data: MonthlyReportData): Promise<void> {
  // 1. Render charts (failures are silent — chart slot is skipped)
  const [donutPng, cashflowPng, piePng] = await Promise.all([
    renderDonutChart(data.totalIncome, data.totalExpense).catch(() => null),
    renderCashflowChart(
      data.totalIncome,
      data.totalExpense,
      data.totalIncome - data.totalExpense
    ).catch(() => null),
    renderExpensePieChart(data.expenseCategories).catch(() => null),
  ]);

  // 2. Build workbook
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Monthly Report');

  // Column widths (A=1 in ExcelJS)
  ws.columns = [
    { width: 3 }, // A – spacer
    { width: 28 }, // B – left panel labels
    { width: 14 }, // C – left panel amounts
    { width: 28 }, // D – left panel labels (expense col)
    { width: 14 }, // E – left panel amounts (expense col)
    { width: 6 }, // F – No (income)
    { width: 14 }, // G – Tanggal (income)
    { width: 18 }, // H – Jumlah (income)
    { width: 22 }, // I – Kategori (income)
    { width: 18 }, // J – Method (income)
    { width: 3 }, // K – spacer
    { width: 6 }, // L – No (expense)
    { width: 14 }, // M – Tanggal (expense)
    { width: 18 }, // N – Jumlah (expense)
    { width: 22 }, // O – Kategori (expense)
    { width: 18 }, // P – Akun (expense)
    { width: 25 }, // Q – Catatan (expense)
    { width: 3 }, // R – spacer
    { width: 25 }, // S – Rekap kategori
    { width: 18 }, // T – Rekap total
  ];

  // ── Header block ──
  ws.mergeCells('B4:E4');
  const titleCell = ws.getCell('B4');
  titleCell.value = 'Monthly Report';
  titleCell.font = { bold: true, size: 16 };

  ws.getCell('B7').value = formatDatetimeID(new Date());
  ws.getCell('B7').font = { italic: true, size: 9, color: { argb: 'FF666666' } };

  ws.getCell('B9').value = 'B U L A N';
  ws.getCell('B9').font = { bold: true };
  ws.getCell('D9').value = 'T A H U N';
  ws.getCell('D9').font = { bold: true };
  ws.getCell('B10').value = MONTH_NAMES_ID[data.month];
  ws.getCell('D10').value = data.year;

  ws.getCell('G10').value = 'Total Pemasukan';
  ws.getCell('G10').font = { bold: true };
  ws.getCell('H10').value = data.totalIncome;
  ws.getCell('H10').numFmt = CURRENCY_FMT;
  ws.getCell('H10').font = { color: { argb: 'FF10B981' }, bold: true };

  ws.mergeCells('B12:E12');
  ws.getCell('B12').value = 'T O T A L   A S S E T S';
  ws.getCell('B12').font = { bold: true };
  ws.getCell('G12').value = 'Total Pengeluaran';
  ws.getCell('G12').font = { bold: true };
  ws.getCell('H12').value = data.totalExpense;
  ws.getCell('H12').numFmt = CURRENCY_FMT;
  ws.getCell('H12').font = { color: { argb: 'FFEF4444' }, bold: true };

  ws.getCell('B13').value = data.totalAssets;
  ws.getCell('B13').numFmt = CURRENCY_FMT;
  ws.getCell('B13').font = { bold: true, size: 13 };

  // ── Section headers (row 16) ──
  const headerFill = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FF2563EB' },
  };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } };

  ws.mergeCells('B16:E16');
  ws.getCell('B16').value = 'KATEGORI';
  ws.getCell('B16').fill = headerFill;
  ws.getCell('B16').font = headerFont;

  ws.mergeCells('F16:J16');
  ws.getCell('F16').value = 'P E M A S U K A N';
  ws.getCell('F16').fill = headerFill;
  ws.getCell('F16').font = headerFont;

  ws.mergeCells('L16:Q16');
  ws.getCell('L16').value = 'P E N G E L U A R A N';
  ws.getCell('L16').fill = headerFill;
  ws.getCell('L16').font = headerFont;

  ws.mergeCells('S16:T16');
  ws.getCell('S16').value = 'Rekap Pengeluaran';
  ws.getCell('S16').fill = headerFill;
  ws.getCell('S16').font = headerFont;

  // ── Column headers (row 17) ──
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
    ['J17', 'Method'],
  ] as [string, string][]) {
    ws.getCell(cell).value = label;
    ws.getCell(cell).font = colHdrFont;
  }
  for (const [cell, label] of [
    ['L17', 'No'],
    ['M17', 'Tanggal'],
    ['N17', 'Jumlah'],
    ['O17', 'Kategori'],
    ['P17', 'Akun'],
    ['Q17', 'Catatan'],
  ] as [string, string][]) {
    ws.getCell(cell).value = label;
    ws.getCell(cell).font = colHdrFont;
  }
  ws.getCell('S17').value = 'Kategori';
  ws.getCell('S17').font = colHdrFont;
  ws.getCell('T17').value = 'Total';
  ws.getCell('T17').font = colHdrFont;

  // ── Data rows starting at row 18 ──
  data.incomeCategories.forEach((cat, i) => {
    const r = 18 + i;
    ws.getCell(`B${r}`).value = cat.category;
    ws.getCell(`C${r}`).value = cat.total;
    ws.getCell(`C${r}`).numFmt = CURRENCY_FMT;
  });

  data.expenseCategories.forEach((cat, i) => {
    const r = 18 + i;
    ws.getCell(`D${r}`).value = cat.category;
    ws.getCell(`E${r}`).value = cat.total;
    ws.getCell(`E${r}`).numFmt = CURRENCY_FMT;
  });

  data.incomeTransactions.forEach((tx, i) => {
    const r = 18 + i;
    ws.getCell(`F${r}`).value = i + 1;
    ws.getCell(`G${r}`).value = formatDateID(tx.date);
    ws.getCell(`H${r}`).value = tx.amount;
    ws.getCell(`H${r}`).numFmt = CURRENCY_FMT;
    ws.getCell(`I${r}`).value = tx.category;
    ws.getCell(`J${r}`).value = tx.paymentMethod;
  });

  data.expenseTransactions.forEach((tx, i) => {
    const r = 18 + i;
    ws.getCell(`L${r}`).value = i + 1;
    ws.getCell(`M${r}`).value = formatDateID(tx.date);
    ws.getCell(`N${r}`).value = tx.amount;
    ws.getCell(`N${r}`).numFmt = CURRENCY_FMT;
    ws.getCell(`O${r}`).value = tx.category;
    ws.getCell(`P${r}`).value = tx.paymentMethod;
    ws.getCell(`Q${r}`).value = tx.notes || '';
  });

  data.expenseCategories.forEach((cat, i) => {
    const r = 18 + i;
    ws.getCell(`S${r}`).value = cat.category;
    ws.getCell(`T${r}`).value = cat.total;
    ws.getCell(`T${r}`).numFmt = CURRENCY_FMT;
  });

  // ── Payment Methods ──
  const catRows = Math.max(data.incomeCategories.length, data.expenseCategories.length);
  const pmStartRow = Math.max(32, 20 + catRows);
  ws.getCell(`B${pmStartRow}`).value = 'Payment Method';
  ws.getCell(`B${pmStartRow}`).font = { bold: true };
  ws.getCell(`D${pmStartRow}`).value = 'Jumlah';
  ws.getCell(`D${pmStartRow}`).font = { bold: true };
  data.paymentMethodBalances.forEach((pm, i) => {
    const r = pmStartRow + 2 + i;
    ws.getCell(`B${r}`).value = pm.name;
    ws.getCell(`D${r}`).value = pm.balance;
    ws.getCell(`D${r}`).numFmt = CURRENCY_FMT;
  });

  // ── Bills ──
  const billsStartRow = pmStartRow + 4 + data.paymentMethodBalances.length;
  ws.mergeCells(`B${billsStartRow}:E${billsStartRow}`);
  ws.getCell(`B${billsStartRow}`).value = 'C A T A T A N   T A G I H A N';
  ws.getCell(`B${billsStartRow}`).fill = headerFill;
  ws.getCell(`B${billsStartRow}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  const billsHdrRow = billsStartRow + 2;
  ws.getCell(`C${billsHdrRow}`).value = 'Tagihan';
  ws.getCell(`C${billsHdrRow}`).font = { bold: true };
  ws.getCell(`D${billsHdrRow}`).value = 'Jumlah';
  ws.getCell(`D${billsHdrRow}`).font = { bold: true };
  data.bills.forEach((bill, i) => {
    const r = billsHdrRow + 1 + i;
    ws.getCell(`B${r}`).value = bill.isPaid;
    ws.getCell(`C${r}`).value = bill.name;
    ws.getCell(`D${r}`).value = bill.amount;
    ws.getCell(`D${r}`).numFmt = CURRENCY_FMT;
  });

  // ── Embed chart images ──
  if (donutPng) {
    const id = workbook.addImage({ base64: stripBase64Prefix(donutPng), extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 1 }, ext: { width: 220, height: 220 } });
  }
  if (cashflowPng) {
    const id = workbook.addImage({ base64: stripBase64Prefix(cashflowPng), extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 9 }, ext: { width: 350, height: 140 } });
  }
  if (piePng) {
    const id = workbook.addImage({ base64: stripBase64Prefix(piePng), extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 16 }, ext: { width: 300, height: 215 } });
  }

  const monthStr = String(data.month + 1).padStart(2, '0');
  await triggerXlsxDownload(workbook, `Laporan-Keuangan-${data.year}-${monthStr}.xlsx`);
}

// ─── Annual Report ────────────────────────────────────────────────────────────

export async function generateAnnualReport(data: AnnualReportData): Promise<void> {
  const expenseCats = data.topCategories
    .filter((c) => c.type === 'expense')
    .map((c) => ({ category: c.category, total: c.total }));

  const [donutPng, cashflowPng, piePng] = await Promise.all([
    renderDonutChart(data.totalIncome, data.totalExpense).catch(() => null),
    renderCashflowChart(data.totalIncome, data.totalExpense, data.totalBalance).catch(() => null),
    renderExpensePieChart(expenseCats).catch(() => null),
  ]);

  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Annual Report');

  ws.columns = [
    { width: 3 }, // A
    { width: 28 }, // B
    { width: 14 }, // C
    { width: 28 }, // D
    { width: 14 }, // E
    { width: 6 }, // F
    { width: 14 }, // G
    { width: 18 }, // H
    { width: 22 }, // I
    { width: 18 }, // J
    { width: 3 }, // K
    { width: 6 }, // L
    { width: 14 }, // M
    { width: 18 }, // N
    { width: 22 }, // O
    { width: 18 }, // P
    { width: 25 }, // Q
    { width: 3 }, // R
    { width: 25 }, // S
    { width: 18 }, // T
  ];

  const headerFill = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FF2563EB' },
  };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } };

  ws.mergeCells('B4:E4');
  ws.getCell('B4').value = 'Annual Report';
  ws.getCell('B4').font = { bold: true, size: 16 };

  ws.getCell('B7').value = formatDatetimeID(new Date());
  ws.getCell('B7').font = { italic: true, size: 9, color: { argb: 'FF666666' } };

  ws.getCell('B9').value = 'T A H U N';
  ws.getCell('B9').font = { bold: true };
  ws.getCell('B10').value = data.year;

  ws.getCell('G10').value = 'Total Pemasukan';
  ws.getCell('G10').font = { bold: true };
  ws.getCell('H10').value = data.totalIncome;
  ws.getCell('H10').numFmt = '"Rp"#,##0';
  ws.getCell('H10').font = { color: { argb: 'FF10B981' }, bold: true };

  ws.mergeCells('B12:E12');
  ws.getCell('B12').value = 'T O T A L   A S S E T S';
  ws.getCell('B12').font = { bold: true };
  ws.getCell('G12').value = 'Total Pengeluaran';
  ws.getCell('G12').font = { bold: true };
  ws.getCell('H12').value = data.totalExpense;
  ws.getCell('H12').numFmt = '"Rp"#,##0';
  ws.getCell('H12').font = { color: { argb: 'FFEF4444' }, bold: true };

  ws.getCell('B13').value = data.totalAssets;
  ws.getCell('B13').numFmt = '"Rp"#,##0';
  ws.getCell('B13').font = { bold: true, size: 13 };

  // Section headers (row 16)
  ws.mergeCells('B16:E16');
  ws.getCell('B16').value = 'KATEGORI';
  ws.getCell('B16').fill = headerFill;
  ws.getCell('B16').font = headerFont;

  ws.mergeCells('F16:J16');
  ws.getCell('F16').value = 'P E M A S U K A N';
  ws.getCell('F16').fill = headerFill;
  ws.getCell('F16').font = headerFont;

  ws.mergeCells('L16:Q16');
  ws.getCell('L16').value = 'P E N G E L U A R A N';
  ws.getCell('L16').fill = headerFill;
  ws.getCell('L16').font = headerFont;

  ws.mergeCells('S16:T16');
  ws.getCell('S16').value = 'Rekap Pengeluaran';
  ws.getCell('S16').fill = headerFill;
  ws.getCell('S16').font = headerFont;

  // Column headers (row 17)
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
    ['J17', 'Method'],
  ] as [string, string][]) {
    ws.getCell(cell).value = label;
    ws.getCell(cell).font = colHdrFont;
  }
  for (const [cell, label] of [
    ['L17', 'No'],
    ['M17', 'Tanggal'],
    ['N17', 'Jumlah'],
    ['O17', 'Kategori'],
    ['P17', 'Akun'],
    ['Q17', 'Catatan'],
  ] as [string, string][]) {
    ws.getCell(cell).value = label;
    ws.getCell(cell).font = colHdrFont;
  }
  ws.getCell('S17').value = 'Kategori';
  ws.getCell('S17').font = colHdrFont;
  ws.getCell('T17').value = 'Total';
  ws.getCell('T17').font = colHdrFont;

  // Top income/expense categories in left panel (B18+/D18+)
  const incCats = data.topCategories.filter((c) => c.type === 'income');
  incCats.forEach((cat, i) => {
    ws.getCell(`B${18 + i}`).value = cat.category;
    ws.getCell(`C${18 + i}`).value = cat.total;
    ws.getCell(`C${18 + i}`).numFmt = '"Rp"#,##0';
  });
  expenseCats.forEach((cat, i) => {
    ws.getCell(`D${18 + i}`).value = cat.category;
    ws.getCell(`E${18 + i}`).value = cat.total;
    ws.getCell(`E${18 + i}`).numFmt = '"Rp"#,##0';
  });

  // All transactions sorted by date — income in F-J, expense in L-Q
  const incomeTxs = data.transactions
    .filter((tx) => tx.type === 'income')
    .sort((a, b) => a.date.localeCompare(b.date));
  const expenseTxs = data.transactions
    .filter((tx) => tx.type === 'expense')
    .sort((a, b) => a.date.localeCompare(b.date));

  incomeTxs.forEach((tx, i) => {
    const r = 18 + i;
    ws.getCell(`F${r}`).value = i + 1;
    ws.getCell(`G${r}`).value = formatDateID(tx.date);
    ws.getCell(`H${r}`).value = tx.amount;
    ws.getCell(`H${r}`).numFmt = '"Rp"#,##0';
    ws.getCell(`I${r}`).value = tx.category;
    ws.getCell(`J${r}`).value = tx.paymentMethod;
  });

  expenseTxs.forEach((tx, i) => {
    const r = 18 + i;
    ws.getCell(`L${r}`).value = i + 1;
    ws.getCell(`M${r}`).value = formatDateID(tx.date);
    ws.getCell(`N${r}`).value = tx.amount;
    ws.getCell(`N${r}`).numFmt = '"Rp"#,##0';
    ws.getCell(`O${r}`).value = tx.category;
    ws.getCell(`P${r}`).value = tx.paymentMethod;
    ws.getCell(`Q${r}`).value = tx.notes || '';
  });

  expenseCats.forEach((cat, i) => {
    ws.getCell(`S${18 + i}`).value = cat.category;
    ws.getCell(`T${18 + i}`).value = cat.total;
    ws.getCell(`T${18 + i}`).numFmt = '"Rp"#,##0';
  });

  // Chart images
  if (donutPng) {
    const id = workbook.addImage({ base64: donutPng.split(',')[1], extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 1 }, ext: { width: 220, height: 220 } });
  }
  if (cashflowPng) {
    const id = workbook.addImage({ base64: cashflowPng.split(',')[1], extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 9 }, ext: { width: 350, height: 140 } });
  }
  if (piePng) {
    const id = workbook.addImage({ base64: piePng.split(',')[1], extension: 'png' });
    ws.addImage(id, { tl: { col: 20, row: 16 }, ext: { width: 300, height: 215 } });
  }

  // Extra sheet: Ringkasan Bulanan
  const ws2 = workbook.addWorksheet('Ringkasan Bulanan');
  ws2.columns = [
    { width: 16 }, // Bulan
    { width: 20 }, // Pemasukan
    { width: 20 }, // Pengeluaran
    { width: 20 }, // Saldo
  ];
  ws2.getCell('A1').value = 'Bulan';
  ws2.getCell('B1').value = 'Pemasukan';
  ws2.getCell('C1').value = 'Pengeluaran';
  ws2.getCell('D1').value = 'Saldo';
  ['A1', 'B1', 'C1', 'D1'].forEach((ref) => {
    ws2.getCell(ref).font = { bold: true };
    ws2.getCell(ref).fill = headerFill;
    ws2.getCell(ref).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });
  data.monthlyBreakdown.forEach((m, i) => {
    const r = 2 + i;
    ws2.getCell(`A${r}`).value = MONTH_NAMES_ID[m.month];
    ws2.getCell(`B${r}`).value = m.income;
    ws2.getCell(`B${r}`).numFmt = '"Rp"#,##0';
    ws2.getCell(`C${r}`).value = m.expense;
    ws2.getCell(`C${r}`).numFmt = '"Rp"#,##0';
    ws2.getCell(`D${r}`).value = m.balance;
    ws2.getCell(`D${r}`).numFmt = '"Rp"#,##0';
  });

  await triggerXlsxDownload(workbook, `Laporan-Tahunan-${data.year}.xlsx`);
}
