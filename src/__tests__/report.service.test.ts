import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { getMonthlyReportData, getAnnualReportData } from '@/server/services/report.service';
import { createTransaction } from '@/server/services/transaction.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('getMonthlyReportData', () => {
  it('returns zero totals for a month with no transactions', async () => {
    const result = await getMonthlyReportData(0, 2026);
    expect(result.error).toBeUndefined();
    expect(result.data!.totalIncome).toBe(0);
    expect(result.data!.totalExpense).toBe(0);
    expect(result.data!.incomeTransactions).toHaveLength(0);
    expect(result.data!.expenseTransactions).toHaveLength(0);
  });

  it('separates income and expense transactions correctly', async () => {
    await createTransaction({
      date: '2026-01-10',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-15',
      description: 'Food',
      category: 'Food',
      categoryId: 'c2',
      type: 'expense',
      amount: 200000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    // month=0 (January), year=2026
    const result = await getMonthlyReportData(0, 2026);
    expect(result.error).toBeUndefined();
    expect(result.data!.incomeTransactions).toHaveLength(1);
    expect(result.data!.expenseTransactions).toHaveLength(1);
    expect(result.data!.totalIncome).toBe(5000000);
    expect(result.data!.totalExpense).toBe(200000);
  });

  it('groups expense transactions by category', async () => {
    await createTransaction({
      date: '2026-01-15',
      description: 'Lunch',
      category: 'Food',
      categoryId: 'c2',
      type: 'expense',
      amount: 50000,
      paymentMethod: 'Cash',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-16',
      description: 'Dinner',
      category: 'Food',
      categoryId: 'c2',
      type: 'expense',
      amount: 80000,
      paymentMethod: 'Cash',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-17',
      description: 'Bus',
      category: 'Transport',
      categoryId: 'c3',
      type: 'expense',
      amount: 20000,
      paymentMethod: 'Cash',
      notes: '',
    });
    const result = await getMonthlyReportData(0, 2026);
    expect(result.error).toBeUndefined();
    const food = result.data!.expenseSummaryByCategory.find((s) => s.category === 'Food');
    expect(food!.total).toBe(130000);
    expect(result.data!.expenseSummaryByCategory).toHaveLength(2);
  });

  it('does not include transactions from other months', async () => {
    await createTransaction({
      date: '2026-02-10',
      description: 'Feb Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    const result = await getMonthlyReportData(0, 2026); // January
    expect(result.error).toBeUndefined();
    expect(result.data!.incomeTransactions).toHaveLength(0);
  });
});

describe('getAnnualReportData', () => {
  it('returns 12 months in monthly breakdown', async () => {
    const result = await getAnnualReportData(2026);
    expect(result.error).toBeUndefined();
    expect(result.data!.monthlyBreakdown).toHaveLength(12);
  });

  it('computes annual totals correctly', async () => {
    await createTransaction({
      date: '2026-01-10',
      description: 'Salary Jan',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    await createTransaction({
      date: '2026-03-10',
      description: 'Salary Mar',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.error).toBeUndefined();
    expect(result.data!.totalIncome).toBe(10000000);
  });
});
