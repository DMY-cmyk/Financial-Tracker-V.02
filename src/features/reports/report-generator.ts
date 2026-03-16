import * as XLSX from 'xlsx';
import type { MonthlyReportData, AnnualReportData } from './types';

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function dateToExcelSerial(dateStr: string): number {
  // Excel serial: days since 1899-12-30
  const d = new Date(dateStr);
  const msPerDay = 86400000;
  const excelEpoch = new Date('1899-12-30').getTime();
  return (d.getTime() - excelEpoch) / msPerDay;
}

export function generateMonthlyReport(data: MonthlyReportData): void {
  const wb = XLSX.utils.book_new();

  // Build a sparse array-of-arrays (26 columns wide, enough rows)
  // We'll use a plain object to set cells directly for precision
  const ws: XLSX.WorkSheet = {};

  // Helper to set a cell
  const set = (excelRow: number, colLetter: string, value: unknown) => {
    const addr = `${colLetter}${excelRow}`;
    if (typeof value === 'number') {
      ws[addr] = { v: value, t: 'n' };
    } else if (typeof value === 'boolean') {
      ws[addr] = { v: value, t: 'b' };
    } else {
      ws[addr] = { v: String(value ?? ''), t: 's' };
    }
  };

  // ── Header Section ──────────────────────────────────────────────────────────
  // Row 4: Title
  set(4, 'B', 'Monthly Report');

  // Row 7: Date serial for report month (1st of month)
  const firstOfMonth = `${data.year}-${String(data.month + 1).padStart(2, '0')}-01`;
  set(7, 'B', dateToExcelSerial(firstOfMonth));

  // Row 9: Labels
  set(9, 'B', 'B U L A N');
  set(9, 'D', 'T A H U N');

  // Row 10: Month name, Year, Total Income
  set(10, 'B', MONTH_NAMES_ID[data.month]);
  set(10, 'D', data.year);
  set(10, 'F', 'Total Pemasukan');
  set(10, 'G', data.totalIncome);

  // Row 12: Total Pengeluaran label + value
  set(12, 'B', 'T O T A L   A S S E T S');
  set(12, 'F', 'Total Pengeluaran');
  set(12, 'G', data.totalExpense);

  // Row 13: Total Assets value
  set(13, 'B', data.totalAssets);

  // ── Column Headers ──────────────────────────────────────────────────────────
  // Row 16: Section labels
  set(16, 'B', 'KATEGORI');
  set(16, 'F', 'P E M A S U K A N');
  set(16, 'L', 'P E N G E L U A R A N');
  set(16, 'S', 'Rekap Pengeluaran');

  // Row 17: Sub-headers
  set(17, 'B', 'Pemasukan');
  set(17, 'D', 'Pengeluaran');
  set(17, 'F', 'No');
  set(17, 'G', 'Tanggal');
  set(17, 'H', 'Jumlah');
  set(17, 'I', 'Kategori');
  set(17, 'J', 'Method');
  set(17, 'L', 'No');
  set(17, 'M', 'Tanggal');
  set(17, 'N', 'Jumlah');
  set(17, 'O', 'Kategori');
  set(17, 'P', 'Account');
  set(17, 'Q', 'Notes');
  set(17, 'S', 'Kategori');
  set(17, 'T', 'Total');

  // ── Income & Expense Transactions (starting at row 18) ─────────────────────
  const startRow = 18;

  // Income transactions (cols F-J)
  data.incomeTransactions.forEach((tx, i) => {
    const r = startRow + i;
    set(r, 'F', i + 1);
    set(r, 'G', tx.date);
    set(r, 'H', tx.amount);
    set(r, 'I', tx.category);
    set(r, 'J', tx.paymentMethod);
  });

  // Expense transactions (cols L-Q)
  data.expenseTransactions.forEach((tx, i) => {
    const r = startRow + i;
    set(r, 'L', i + 1);
    set(r, 'M', tx.date);
    set(r, 'N', tx.amount);
    set(r, 'O', tx.category);
    set(r, 'P', tx.paymentMethod);
    set(r, 'Q', tx.notes);
  });

  // Expense summary by category (cols S-T, starting row 18)
  data.expenseSummaryByCategory.forEach((item, i) => {
    const r = startRow + i;
    set(r, 'S', item.category);
    set(r, 'T', item.total);
  });

  // ── Payment Methods (row 32+) ───────────────────────────────────────────────
  set(32, 'B', 'Payment Method');
  set(32, 'D', 'Jumlah');
  data.paymentMethodBalances.forEach((pm, i) => {
    const r = 34 + i;
    set(r, 'B', pm.name);
    set(r, 'D', pm.balance);
  });

  // ── Bills Section (row 48+) ─────────────────────────────────────────────────
  set(48, 'B', 'C A T A T A N   T A G I H A N');
  set(50, 'C', 'Tagihan');
  set(50, 'D', 'Jumlah');
  data.bills.forEach((bill, i) => {
    const r = 51 + i;
    set(r, 'B', bill.isPaid);
    set(r, 'C', bill.name);
    set(r, 'D', bill.amount);
  });

  // ── Set worksheet ref range ──────────────────────────────────────────────────
  const lastRow = Math.max(
    60,
    startRow + Math.max(data.incomeTransactions.length, data.expenseTransactions.length) + 5,
    51 + data.bills.length + 2,
    34 + data.paymentMethodBalances.length + 2
  );
  ws['!ref'] = `A1:Z${lastRow}`;

  // Column widths
  ws['!cols'] = [
    { wch: 3 }, // A
    { wch: 20 }, // B
    { wch: 20 }, // C
    { wch: 12 }, // D
    { wch: 3 }, // E
    { wch: 5 }, // F (No)
    { wch: 12 }, // G (Tanggal)
    { wch: 14 }, // H (Jumlah)
    { wch: 18 }, // I (Kategori)
    { wch: 14 }, // J (Method)
    { wch: 3 }, // K
    { wch: 5 }, // L (No)
    { wch: 12 }, // M (Tanggal)
    { wch: 14 }, // N (Jumlah)
    { wch: 18 }, // O (Kategori)
    { wch: 14 }, // P (Account)
    { wch: 22 }, // Q (Notes)
    { wch: 3 }, // R
    { wch: 18 }, // S (Rekap Kategori)
    { wch: 14 }, // T (Total)
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report');

  // Trigger download
  const monthName = MONTH_NAMES_ID[data.month];
  XLSX.writeFile(wb, `Laporan_Bulanan_${monthName}_${data.year}.xlsx`);
}

export function generateAnnualReport(data: AnnualReportData): void {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Annual Summary ─────────────────────────────────────────────────
  const summaryRows: unknown[][] = [
    ['Ringkasan Tahunan', data.year],
    [],
    ['Bulan', 'Pemasukan', 'Pengeluaran', 'Net'],
    ...data.monthlyBreakdown.map((m) => [MONTH_NAMES_ID[m.month], m.income, m.expense, m.net]),
    [],
    ['Total', data.totalIncome, data.totalExpense, data.totalIncome - data.totalExpense],
    [],
    ['Total Aset', data.totalAssets],
    [],
    ['Kategori Teratas', '', 'Jumlah', 'Tipe'],
    ...data.topCategories.map((c) => [c.category, '', c.total, c.type]),
    [],
    ['Metode Pembayaran', '', 'Saldo'],
    ...data.paymentMethodBalances.map((p) => [p.name, '', p.balance]),
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 22 }, { wch: 4 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Tahunan');

  // ── Sheet 2: Transaction Detail ─────────────────────────────────────────────
  // All transactions for the year sorted by date, with month label grouping column.
  const detailRows: unknown[][] = [
    [`Detail Transaksi — ${data.year}`, '', '', '', '', '', ''],
    [],
    ['Bulan', 'Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Jumlah', 'Metode'],
  ];
  // Sort transactions by date
  const sorted = [...data.transactions].sort((a, b) => a.date.localeCompare(b.date));
  for (const tx of sorted) {
    const txDate = new Date(tx.date);
    const monthLabel = MONTH_NAMES_ID[txDate.getMonth()];
    detailRows.push([
      monthLabel,
      tx.date,
      tx.description,
      tx.category,
      tx.type,
      tx.amount,
      tx.paymentMethod,
    ]);
  }

  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 28 },
    { wch: 18 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Transaksi');

  XLSX.writeFile(wb, `Laporan_Tahunan_${data.year}.xlsx`);
}
