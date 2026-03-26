import type { ExportReportInput } from './types';
import { type Transaction } from './types';
import { renderDonutChart, renderCashflowChart, renderExpensePieChart } from './chart-renderer';
import { formatDateID, formatDatetimeID } from './formatters';
import { buildXlsxWorkbook } from './xlsx-template-builder';
import { injectCharts } from './chart-xml-injector';

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

// --- Excel (xlsx-template-builder + chart-xml-injector) ---

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

// --- PDF (jsPDF + autotable — template layout) ---

export async function exportPDF(input: ExportReportInput): Promise<void> {
  const {
    transactions,
    totalIncome,
    totalExpense,
    totalAssets,
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
    const afterIncome =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? MARGIN;
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
    const afterExpense =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? MARGIN;
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
