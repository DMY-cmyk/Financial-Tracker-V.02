import * as XLSX from 'xlsx';
import type { MonthlyReportData, AnnualReportData } from '@/lib/api/contracts';

const CURRENCY_FMT = '"Rp"#,##0';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function formatDatetimeID(date: Date): string {
  const day = DAY_NAMES_ID[date.getDay()];
  const d = date.getDate();
  const m = MONTH_NAMES_ID[date.getMonth()];
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${day}, ${d} ${m} ${y}, ${hh}.${mm}.${ss}`;
}

function setCurrency(ws: XLSX.WorkSheet, ref: string, value: number): void {
  if (!ws[ref]) ws[ref] = {};
  ws[ref].v = value;
  ws[ref].t = 'n';
  ws[ref].z = CURRENCY_FMT;
}

function setString(ws: XLSX.WorkSheet, ref: string, value: string): void {
  if (!ws[ref]) ws[ref] = {};
  ws[ref].v = value;
  ws[ref].t = 's';
}

function setNumber(ws: XLSX.WorkSheet, ref: string, value: number): void {
  if (!ws[ref]) ws[ref] = {};
  ws[ref].v = value;
  ws[ref].t = 'n';
}

function buildRange(maxRow: number, maxCol: number): string {
  return `A1:${XLSX.utils.encode_col(maxCol)}${maxRow}`;
}

export function generateMonthlyReport(data: MonthlyReportData): void {
  const ws: XLSX.WorkSheet = { '!ref': buildRange(50, 8) };

  // Header section
  setString(ws, 'B5', 'LAPORAN KEUANGAN BULANAN');
  setString(ws, 'B7', formatDatetimeID(new Date()));
  setString(ws, 'B9', 'Bulan:');
  setString(ws, 'C9', MONTH_NAMES_ID[data.month]);
  setString(ws, 'B10', 'Tahun:');
  setNumber(ws, 'C10', data.year);
  setString(ws, 'G10', 'Total Pemasukan:');
  setCurrency(ws, 'H10', data.totalIncome);
  setString(ws, 'G12', 'Total Pengeluaran:');
  setCurrency(ws, 'H12', data.totalExpense);

  // Section headers
  setString(ws, 'B15', 'PEMASUKAN');
  setString(ws, 'D15', 'PENGELUARAN');

  // Income categories (B18+)
  data.incomeCategories.forEach((cat, i) => {
    const row = 18 + i;
    setString(ws, `B${row}`, cat.category);
    setCurrency(ws, `C${row}`, cat.total);
  });

  // Expense categories (D18+)
  data.expenseCategories.forEach((cat, i) => {
    const row = 18 + i;
    setString(ws, `D${row}`, cat.category);
    setCurrency(ws, `E${row}`, cat.total);
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report');

  const monthStr = String(data.month + 1).padStart(2, '0');
  XLSX.writeFile(wb, `Laporan-Keuangan-${data.year}-${monthStr}.xlsx`);
}

export function generateAnnualReport(data: AnnualReportData): void {
  // Sheet 1: Monthly breakdown
  const ws1: XLSX.WorkSheet = { '!ref': buildRange(25, 6) };
  setString(ws1, 'B5', 'LAPORAN KEUANGAN TAHUNAN');
  setString(ws1, 'B7', formatDatetimeID(new Date()));
  setString(ws1, 'B9', 'Tahun:');
  setNumber(ws1, 'C9', data.year);
  setString(ws1, 'G10', 'Total Pemasukan:');
  setCurrency(ws1, 'H10', data.totalIncome);
  setString(ws1, 'G12', 'Total Pengeluaran:');
  setCurrency(ws1, 'H12', data.totalExpense);

  // Column headers
  setString(ws1, 'B15', 'Bulan');
  setString(ws1, 'C15', 'Pemasukan');
  setString(ws1, 'D15', 'Pengeluaran');
  setString(ws1, 'E15', 'Saldo');

  // 12-month rows
  data.monthlyBreakdown.forEach((m, i) => {
    const row = 16 + i;
    setString(ws1, `B${row}`, MONTH_NAMES_ID[m.month]);
    setCurrency(ws1, `C${row}`, m.income);
    setCurrency(ws1, `D${row}`, m.expense);
    setCurrency(ws1, `E${row}`, m.balance);
  });

  // Sheet 2: Transaction detail
  const ws2 = XLSX.utils.json_to_sheet(
    data.transactions.map((tx) => ({
      Tanggal: tx.date,
      Deskripsi: tx.description,
      Kategori: tx.category,
      Tipe: tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      Jumlah: tx.amount,
      'Metode Pembayaran': tx.paymentMethod,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan Tahunan');
  XLSX.utils.book_append_sheet(wb, ws2, 'Detail Transaksi');

  XLSX.writeFile(wb, `Laporan-Tahunan-${data.year}.xlsx`);
}
