import { createTransactionRepository } from '@/server/repositories/transaction.repository';
import { listBills } from '@/server/services/bill.service';
import { listPaymentMethodBalances } from '@/server/services/balance.service';
import { ensureSeeded } from '@/server/db/seed';
import type { MonthlyReportData, AnnualReportData } from '@/lib/api/contracts';

const txRepo = createTransactionRepository();

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string };
}

export async function getMonthlyReportData(
  month: number,
  year: number
): Promise<ServiceResult<MonthlyReportData>> {
  await ensureSeeded();

  // Fetch income and expense transactions for the month
  const [incomeResult, expenseResult, balancesResult, billsResult] = await Promise.all([
    txRepo.findFiltered({ month, year, type: 'income', page: 1, pageSize: 1000 }),
    txRepo.findFiltered({ month, year, type: 'expense', page: 1, pageSize: 1000 }),
    listPaymentMethodBalances(),
    listBills({ month, year }),
  ]);

  const incomeTransactions = incomeResult.rows;
  const expenseTransactions = expenseResult.rows;
  const paymentMethodBalances = balancesResult.data ?? [];
  const bills = billsResult.data ?? [];

  const totalIncome = incomeTransactions.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((s, t) => s + t.amount, 0);
  const totalAssets = paymentMethodBalances.reduce((s, b) => s + b.balance, 0);

  // Group expenses by category
  const categoryMap = new Map<string, number>();
  for (const tx of expenseTransactions) {
    categoryMap.set(tx.category, (categoryMap.get(tx.category) ?? 0) + tx.amount);
  }
  const expenseSummaryByCategory = Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return {
    data: {
      month,
      year,
      totalIncome,
      totalExpense,
      totalAssets,
      incomeTransactions,
      expenseTransactions,
      expenseSummaryByCategory,
      paymentMethodBalances,
      bills,
    },
  };
}

export async function getAnnualReportData(
  year: number
): Promise<ServiceResult<AnnualReportData>> {
  await ensureSeeded();

  const [monthSummaries, balancesResult, allYearResult] = await Promise.all([
    txRepo.getMonthSummaries(year),
    listPaymentMethodBalances(),
    txRepo.findFiltered({ year, yearOnly: true, page: 1, pageSize: 10000 }),
  ]);

  const paymentMethodBalances = balancesResult.data ?? [];

  // Build 12-month breakdown (fill missing months with zeros)
  // Note: getMonthSummaries uses `CAST(SUBSTR(date,6,2) AS INTEGER) - 1 as month`
  // which already returns 0-based months (January=0 ... December=11).
  const summaryMap = new Map(monthSummaries.map((s) => [s.month, s]));
  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const s = summaryMap.get(i); // 0-based: i=0 → January
    return {
      month: i,
      income: s?.income ?? 0,
      expense: s?.expense ?? 0,
      net: (s?.income ?? 0) - (s?.expense ?? 0),
    };
  });

  const totalIncome = monthlyBreakdown.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthlyBreakdown.reduce((s, m) => s + m.expense, 0);
  const totalAssets = paymentMethodBalances.reduce((s, b) => s + b.balance, 0);

  // Top categories by total
  const catMap = new Map<string, { total: number; type: 'income' | 'expense' }>();
  for (const tx of allYearResult.rows) {
    const existing = catMap.get(tx.category);
    if (existing) {
      existing.total += tx.amount;
    } else {
      catMap.set(tx.category, { total: tx.amount, type: tx.type });
    }
  }
  const topCategories = Array.from(catMap.entries())
    .map(([category, { total, type }]) => ({ category, type, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    data: {
      year,
      totalIncome,
      totalExpense,
      totalAssets,
      monthlyBreakdown,
      topCategories,
      paymentMethodBalances,
      transactions: allYearResult.rows,
    },
  };
}
