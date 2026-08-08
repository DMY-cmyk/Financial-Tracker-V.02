import type { ExportReportInput } from './types';
import { type Transaction } from './types';
import { renderDonutChart, renderCashflowChart, renderExpensePieChart } from './chart-renderer';
import { formatDateID } from './formatters';
import { buildXlsxWorkbook } from './xlsx-template-builder';
import { injectCharts } from './chart-xml-injector';

// --- CSV ---

/**
 * Render a value as a safe CSV cell.
 * Neutralizes formula/CSV injection: a leading =, +, -, @, tab or CR is
 * prefixed with a single quote so spreadsheet apps treat the cell as text and
 * never evaluate it as a formula. Embedded quotes are doubled and the cell is
 * always wrapped in quotes.
 */
export function csvCell(value: string): string {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) {
    v = "'" + v;
  }
  return '"' + v.replace(/"/g, '""') + '"';
}

export function exportCSV(
  transactions: Transaction[],
  filename: string,
  scopeLabel: string,
  totalIncome: number,
  totalExpense: number,
  totalAssets: number
): void {
  const fmtAmount = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);

  const commentScope = `"// Laporan Keuangan - ${scopeLabel} | Diekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}"`;
  const commentTotals = `"// Total Pemasukan: ${fmtAmount(totalIncome)} | Total Pengeluaran: ${fmtAmount(totalExpense)} | Saldo: ${fmtAmount(totalAssets)}"`;

  const headers = 'Tanggal,Deskripsi,Kategori,Tipe,Jumlah,Metode Pembayaran,Catatan';
  const rows = transactions.map((tx) =>
    [
      formatDateID(tx.date),
      csvCell(tx.description),
      csvCell(tx.category),
      tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      csvCell(fmtAmount(tx.amount)),
      csvCell(tx.paymentMethod),
      csvCell(tx.notes || ''),
    ].join(',')
  );
  // \uFEFF = UTF-8 BOM — required for correct Indonesian character rendering in Excel on Windows
  const content = '\uFEFF' + [commentScope, commentTotals, headers, ...rows].join('\n');
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
    const from: [number, number, number] = [30, 58, 138]; // #1E3A8A
    const to: [number, number, number] = [59, 130, 246]; // #3B82F6
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
    { label: 'Pemasukan', value: totalIncome, valueColor: [110, 231, 183] },
    { label: 'Pengeluaran', value: totalExpense, valueColor: [252, 165, 165] },
    { label: 'Saldo', value: totalAssets, valueColor: [255, 255, 255] },
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
  if (donutPng) doc.addImage(donutPng, 'PNG', MARGIN, y, 70, chartRowH);
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
    const rekapY =
      incomeCategories.length > 0
        ? y + 2 // same startY — side by side
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
  // If a period has neither income nor expense categories (e.g. an empty
  // month), no autoTable ran above and `lastAutoTable` is undefined — guard
  // it like the later sections do, otherwise reading `.finalY` crashes.
  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 6;

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
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ??
      CONDENSED_HEADER_H + 12;
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
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ??
      CONDENSED_HEADER_H + 12;
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
          data.cell.styles.textColor = data.cell.raw === 'Lunas' ? [16, 185, 129] : [239, 68, 68];
        }
      },
      columnStyles: { 0: { cellWidth: 18, halign: 'center' }, 2: { halign: 'right' } },
      margin: { left: MARGIN, right: MARGIN },
      didDrawPage: () => drawCondensedHeader(),
    });
  }

  // ── Pass 2: resolve page numbers ──────────────────────────────────────────
  // Pass 1 drew condensed headers via didDrawPage callback.
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
