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
    listPaymentMethodBalances(month, year),
    listBills({ month, year }),
  ]);

  if (balancesResult.error) return { error: balancesResult.error };
  if (billsResult.error) return { error: billsResult.error };
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

  const incomeCategoryMap = new Map<string, number>();
  for (const tx of incomeTransactions) {
    incomeCategoryMap.set(tx.category, (incomeCategoryMap.get(tx.category) ?? 0) + tx.amount);
  }
  const incomeCategories = Array.from(incomeCategoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const expenseCategories = expenseSummaryByCategory;

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
      incomeCategories,
      expenseCategories,
      paymentMethodBalances,
      bills,
    },
  };
}

export async function getAnnualReportData(year: number): Promise<ServiceResult<AnnualReportData>> {
  await ensureSeeded();

  const [monthSummaries, balancesResult, allYearResult, prevYearResult] = await Promise.all([
    txRepo.getMonthSummaries(year),
    listPaymentMethodBalances(),
    txRepo.findFiltered({ year, yearOnly: true, page: 1, pageSize: 10000 }),
    txRepo.findFiltered({ year: year - 1, yearOnly: true, page: 1, pageSize: 10000 }),
  ]);

  if (balancesResult.error) return { error: balancesResult.error };
  const paymentMethodBalances = balancesResult.data ?? [];

  // 12-month breakdown
  const summaryMap = new Map(monthSummaries.map((s) => [s.month, s]));
  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const s = summaryMap.get(i);
    const income = s?.income ?? 0;
    const expense = s?.expense ?? 0;
    const net = income - expense;
    return {
      month: i,
      income,
      expense,
      net,
      balance: net,
      monthKey: `${year}-${String(i + 1).padStart(2, '0')}`,
    };
  });

  const totalIncome = monthlyBreakdown.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthlyBreakdown.reduce((s, m) => s + m.expense, 0);
  const totalAssets = paymentMethodBalances.reduce((s, b) => s + b.balance, 0);
  const totalBalance = totalIncome - totalExpense;
  const transactionCount = allYearResult.rows.length;
  const savingsRate =
    totalIncome > 0 ? Math.round(Math.max(0, (totalBalance / totalIncome) * 100)) : 0;

  // Top categories (all types, top 10) — kept for XLSX generator
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

  // Top expense categories (expense-only, top 5) — for web UI
  const expenseCatMap = new Map<string, number>();
  for (const tx of allYearResult.rows) {
    if (tx.type === 'expense') {
      expenseCatMap.set(tx.category, (expenseCatMap.get(tx.category) ?? 0) + tx.amount);
    }
  }
  const topExpenseCategories = Array.from(expenseCatMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Previous year data
  const prevRows = prevYearResult.rows;
  let previousYear: AnnualReportData['previousYear'] = null;
  let comparison: AnnualReportData['comparison'] = null;

  if (prevRows.length > 0) {
    const prevIncomeTotal = prevRows
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const prevExpenseTotal = prevRows
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const prevTotalBalance = prevIncomeTotal - prevExpenseTotal;
    const prevTransactionCount = prevRows.length;
    const prevSavingsRate =
      prevIncomeTotal > 0 ? Math.round(Math.max(0, (prevTotalBalance / prevIncomeTotal) * 100)) : 0;

    previousYear = {
      year: year - 1,
      totalIncome: prevIncomeTotal,
      totalExpense: prevExpenseTotal,
      totalBalance: prevTotalBalance,
      transactionCount: prevTransactionCount,
      savingsRate: prevSavingsRate,
    };

    const pctChange = (curr: number, prev: number): number | null => {
      if (prev === 0) return null;
      return Math.round(((curr - prev) / prev) * 100);
    };
    comparison = {
      incomeChange: pctChange(totalIncome, prevIncomeTotal),
      expenseChange: pctChange(totalExpense, prevExpenseTotal),
      balanceChange: pctChange(totalBalance, prevTotalBalance),
      savingsRateChange: pctChange(savingsRate, prevSavingsRate),
    };
  }

  return {
    data: {
      year,
      totalIncome,
      totalExpense,
      totalAssets,
      totalBalance,
      transactionCount,
      savingsRate,
      topCategories,
      topExpenseCategories,
      previousYear,
      comparison,
      monthlyBreakdown,
      paymentMethodBalances,
      transactions: allYearResult.rows,
    },
  };
}
