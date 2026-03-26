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

// ─── Monthly Report ───────────────────────────────────────────────────────────

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

// ─── Annual Report ────────────────────────────────────────────────────────────

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
        { header: 'Bulan', key: 'bulan', width: 16 },
        { header: 'Pemasukan', key: 'pemasukan', width: 20 },
        { header: 'Pengeluaran', key: 'pengeluaran', width: 20 },
        { header: 'Saldo', key: 'saldo', width: 20 },
      ],
      rows: data.monthlyBreakdown.map((m) => ({
        bulan: MONTH_NAMES_ID[m.month],
        pemasukan: m.income,
        pengeluaran: m.expense,
        saldo: m.balance,
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
