import type { ExportReportInput } from './types';
import { type Transaction } from './types';
import {
  renderDonutChart,
  renderCashflowChart,
  renderExpensePieChart,
} from './chart-renderer';
import { formatDateID, formatDatetimeID } from './formatters';

// --- CSV ---

export function exportCSV(transactions: Transaction[], filename: string): void {
  const headers = 'Date,Description,Category,Type,Amount,Payment Method,Notes';
  const rows = transactions.map(
    (tx) =>
      `${tx.date},"${tx.description.replace(/"/g, '""')}","${tx.category}",${tx.type},${tx.amount},"${tx.paymentMethod}","${(tx.notes || '').replace(/"/g, '""')}"`
  );
  const content = [headers, ...rows].join('\n');
  downloadBlob(content, filename, 'text/csv;charset=utf-8');
}

// --- Excel (ExcelJS template) ---

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

  const [donutPng, cashflowPng, piePng] = await Promise.all([
    renderDonutChart(totalIncome, totalExpense).catch(() => null),
    renderCashflowChart(totalIncome, totalExpense, totalAssets).catch(() => null),
    renderExpensePieChart(expenseCategories).catch(() => null),
  ]);

  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Report');

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
  const CURRENCY_FMT = '"Rp"#,##0';

  // Header
  ws.mergeCells('B4:E4');
  ws.getCell('B4').value = 'Laporan Keuangan';
  ws.getCell('B4').font = { bold: true, size: 16 };

  ws.getCell('B7').value = formatDatetimeID(new Date());
  ws.getCell('B7').font = { italic: true, size: 9, color: { argb: 'FF666666' } };

  ws.mergeCells('B9:E9');
  ws.getCell('B9').value = scopeLabel;
  ws.getCell('B9').font = { bold: true, size: 12 };

  ws.getCell('G10').value = 'Total Pemasukan';
  ws.getCell('G10').font = { bold: true };
  ws.getCell('H10').value = totalIncome;
  ws.getCell('H10').numFmt = CURRENCY_FMT;
  ws.getCell('H10').font = { color: { argb: 'FF10B981' }, bold: true };

  ws.mergeCells('B12:E12');
  ws.getCell('B12').value = 'T O T A L   A S S E T S';
  ws.getCell('B12').font = { bold: true };
  ws.getCell('G12').value = 'Total Pengeluaran';
  ws.getCell('G12').font = { bold: true };
  ws.getCell('H12').value = totalExpense;
  ws.getCell('H12').numFmt = CURRENCY_FMT;
  ws.getCell('H12').font = { color: { argb: 'FFEF4444' }, bold: true };

  ws.getCell('B13').value = totalAssets;
  ws.getCell('B13').numFmt = CURRENCY_FMT;
  ws.getCell('B13').font = { bold: true, size: 13 };

  // Section headers
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

  // Column headers row 17
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

  // Data
  incomeCategories.forEach((cat, i) => {
    ws.getCell(`B${18 + i}`).value = cat.category;
    ws.getCell(`C${18 + i}`).value = cat.total;
    ws.getCell(`C${18 + i}`).numFmt = CURRENCY_FMT;
  });
  expenseCategories.forEach((cat, i) => {
    ws.getCell(`D${18 + i}`).value = cat.category;
    ws.getCell(`E${18 + i}`).value = cat.total;
    ws.getCell(`E${18 + i}`).numFmt = CURRENCY_FMT;
  });

  const incomeTxs = transactions.filter((tx) => tx.type === 'income');
  const expenseTxs = transactions.filter((tx) => tx.type === 'expense');

  incomeTxs.forEach((tx, i) => {
    const r = 18 + i;
    ws.getCell(`F${r}`).value = i + 1;
    ws.getCell(`G${r}`).value = formatDateID(tx.date);
    ws.getCell(`H${r}`).value = tx.amount;
    ws.getCell(`H${r}`).numFmt = CURRENCY_FMT;
    ws.getCell(`I${r}`).value = tx.category;
    ws.getCell(`J${r}`).value = tx.paymentMethod;
  });
  expenseTxs.forEach((tx, i) => {
    const r = 18 + i;
    ws.getCell(`L${r}`).value = i + 1;
    ws.getCell(`M${r}`).value = formatDateID(tx.date);
    ws.getCell(`N${r}`).value = tx.amount;
    ws.getCell(`N${r}`).numFmt = CURRENCY_FMT;
    ws.getCell(`O${r}`).value = tx.category;
    ws.getCell(`P${r}`).value = tx.paymentMethod;
    ws.getCell(`Q${r}`).value = tx.notes || '';
  });
  expenseCategories.forEach((cat, i) => {
    ws.getCell(`S${18 + i}`).value = cat.category;
    ws.getCell(`T${18 + i}`).value = cat.total;
    ws.getCell(`T${18 + i}`).numFmt = CURRENCY_FMT;
  });

  // Payment Methods
  const catRows = Math.max(incomeCategories.length, expenseCategories.length);
  const pmRow = Math.max(32, 20 + catRows);
  ws.getCell(`B${pmRow}`).value = 'Saldo (periode ini)';
  ws.getCell(`B${pmRow}`).font = { bold: true };
  ws.getCell(`D${pmRow}`).value = 'Jumlah';
  ws.getCell(`D${pmRow}`).font = { bold: true };
  paymentMethodBalances.forEach((pm, i) => {
    const r = pmRow + 2 + i;
    ws.getCell(`B${r}`).value = pm.name;
    ws.getCell(`D${r}`).value = pm.balance;
    ws.getCell(`D${r}`).numFmt = CURRENCY_FMT;
  });

  // Bills (only for single-month scope — caller passes empty array otherwise)
  if (bills.length > 0) {
    const billsRow = pmRow + 4 + paymentMethodBalances.length;
    ws.mergeCells(`B${billsRow}:E${billsRow}`);
    ws.getCell(`B${billsRow}`).value = 'C A T A T A N   T A G I H A N';
    ws.getCell(`B${billsRow}`).fill = headerFill;
    ws.getCell(`B${billsRow}`).font = headerFont;
    const billsHdrRow = billsRow + 2;
    ws.getCell(`C${billsHdrRow}`).value = 'Tagihan';
    ws.getCell(`C${billsHdrRow}`).font = { bold: true };
    ws.getCell(`D${billsHdrRow}`).value = 'Jumlah';
    ws.getCell(`D${billsHdrRow}`).font = { bold: true };
    bills.forEach((bill, i) => {
      const r = billsHdrRow + 1 + i;
      ws.getCell(`B${r}`).value = bill.isPaid;
      ws.getCell(`C${r}`).value = bill.name;
      ws.getCell(`D${r}`).value = bill.amount;
      ws.getCell(`D${r}`).numFmt = CURRENCY_FMT;
    });
  }

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

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filename);
}

// --- PDF (jsPDF + autotable — template layout) ---

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
  const MARGIN = 15;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const BLUE: [number, number, number] = [37, 99, 235];
  const EMERALD_TINT: [number, number, number] = [209, 250, 229];
  const RED_TINT: [number, number, number] = [254, 226, 226];

  let y = MARGIN;

  // ── Title ──
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Laporan Keuangan', MARGIN, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`${scopeLabel}  |  Dibuat: ${new Date().toLocaleDateString('id-ID')}`, MARGIN, y);
  doc.setTextColor(0);
  y += 8;

  // ── Totals row (3 boxes) ──
  const boxW = CONTENT_W / 3 - 2;
  const boxes: { label: string; value: number; color: [number, number, number] }[] = [
    { label: 'Total Pemasukan', value: totalIncome, color: [16, 185, 129] },
    { label: 'Total Pengeluaran', value: totalExpense, color: [239, 68, 68] },
    { label: 'Total Assets', value: totalAssets, color: BLUE },
  ];
  boxes.forEach((box, idx) => {
    const x = MARGIN + idx * (boxW + 3);
    doc.setDrawColor(200);
    doc.roundedRect(x, y, boxW, 14, 2, 2, 'S');
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text(box.label, x + 3, y + 5);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...box.color);
    const fmt = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(box.value);
    doc.text(fmt, x + 3, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
  });
  y += 18;

  // ── Charts row: donut (left) + cashflow (right) ──
  const chartRowH = 52;
  if (donutPng) {
    doc.addImage(donutPng, 'PNG', MARGIN, y, 70, chartRowH);
  }
  if (cashflowPng) {
    doc.addImage(cashflowPng, 'PNG', MARGIN + 75, y, 105, chartRowH);
  }
  y += chartRowH + 4;

  // ── Pie chart (centered) ──
  if (piePng) {
    const pieW = 90;
    doc.addImage(piePng, 'PNG', MARGIN + (CONTENT_W - pieW) / 2, y, pieW, 65);
    y += 69;
  }

  // ── Rekap Pengeluaran table ──
  if (expenseCategories.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Rekap Pengeluaran', MARGIN, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Kategori', 'Total']],
      body: expenseCategories.map((c) => [
        c.category,
        new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(c.total),
      ]),
      theme: 'striped',
      headStyles: { fillColor: BLUE, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: MARGIN },
      tableWidth: CONTENT_W / 2,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ── Payment Methods table ──
  if (paymentMethodBalances.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Saldo (periode ini)', MARGIN, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Metode Pembayaran', 'Saldo']],
      body: paymentMethodBalances.map((pm) => [
        pm.name,
        new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(pm.balance),
      ]),
      theme: 'striped',
      headStyles: { fillColor: BLUE, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: MARGIN },
      tableWidth: CONTENT_W / 2,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ── Page 2+: Income transactions ──
  const incomeTxs = transactions.filter((tx) => tx.type === 'income');
  if (incomeTxs.length > 0) {
    doc.addPage();
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('P E M A S U K A N', MARGIN, MARGIN);
    autoTable(doc, {
      startY: MARGIN + 4,
      head: [['No', 'Tanggal', 'Jumlah', 'Kategori', 'Metode']],
      body: incomeTxs.map((tx, i) => [
        i + 1,
        formatDateID(tx.date),
        new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(tx.amount),
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
    });
  }

  // ── Expense transactions ──
  const expenseTxs = transactions.filter((tx) => tx.type === 'expense');
  if (expenseTxs.length > 0) {
    const afterIncome = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      ?.finalY ?? MARGIN;
    let expenseStartY: number;
    if (afterIncome + 8 < 260) {
      expenseStartY = afterIncome + 8;
    } else {
      doc.addPage();
      expenseStartY = MARGIN;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('P E N G E L U A R A N', MARGIN, expenseStartY - 4);
    autoTable(doc, {
      startY: expenseStartY,
      head: [['No', 'Tanggal', 'Jumlah', 'Kategori', 'Akun', 'Catatan']],
      body: expenseTxs.map((tx, i) => [
        i + 1,
        formatDateID(tx.date),
        new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(tx.amount),
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
    });
  }

  // ── Bills (monthly scope only — caller passes empty array for other scopes) ──
  if (bills.length > 0) {
    const afterExpense = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      ?.finalY ?? MARGIN;
    let billsStartY: number;
    if (afterExpense + 8 < 260) {
      billsStartY = afterExpense + 8;
    } else {
      doc.addPage();
      billsStartY = MARGIN;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('C A T A T A N   T A G I H A N', MARGIN, billsStartY - 4);
    autoTable(doc, {
      startY: billsStartY,
      head: [['Lunas', 'Tagihan', 'Jumlah']],
      body: bills.map((bill) => [
        bill.isPaid ? '☑' : '☐',
        bill.name,
        new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(bill.amount),
      ]),
      theme: 'striped',
      headStyles: { fillColor: BLUE, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 2: { halign: 'right' } },
      margin: { left: MARGIN, right: MARGIN },
    });
  }

  doc.save(filename);
}

// --- Helpers ---

function downloadBlob(content: string | Blob, filename: string, mimeType?: string): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType ?? 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
