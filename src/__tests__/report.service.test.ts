import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { getMonthlyReportData, getAnnualReportData } from '@/server/services/report.service';
import { createTransaction } from '@/server/services/transaction.service';
import { createPaymentMethod } from '@/server/services/payment-method.service';

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

  it('includes incomeCategories and expenseCategories in monthly report', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await createTransaction({ date: '2026-03-05', description: 'Salary', category: 'Gaji',
      categoryId: 'c1', type: 'income', amount: 5000000, paymentMethod: 'BCA', notes: '' });
    await createTransaction({ date: '2026-03-10', description: 'Bonus', category: 'Bonus',
      categoryId: 'c2', type: 'income', amount: 1000000, paymentMethod: 'BCA', notes: '' });
    await createTransaction({ date: '2026-03-15', description: 'Food', category: 'Makanan',
      categoryId: 'c3', type: 'expense', amount: 500000, paymentMethod: 'BCA', notes: '' });

    const r = await getMonthlyReportData(2, 2026); // month=2 → March
    expect(r.error).toBeUndefined();
    expect(r.data!.incomeCategories).toContainEqual({ category: 'Gaji', total: 5000000 });
    expect(r.data!.incomeCategories).toContainEqual({ category: 'Bonus', total: 1000000 });
    expect(r.data!.expenseCategories).toContainEqual({ category: 'Makanan', total: 500000 });
    // sorted descending by total
    expect(r.data!.incomeCategories[0].total).toBeGreaterThanOrEqual(r.data!.incomeCategories[1]?.total ?? 0);
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

  it('transactionCount equals the number of transactions created for that year', async () => {
    await createTransaction({
      date: '2026-01-10',
      description: 'A',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 1000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    await createTransaction({
      date: '2026-02-10',
      description: 'B',
      category: 'Expense',
      categoryId: 'c2',
      type: 'expense',
      amount: 500000,
      paymentMethod: 'Bank',
      notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.data!.transactionCount).toBe(2);
  });

  it('transactionCount is 0 when no transactions exist for the year', async () => {
    const result = await getAnnualReportData(2026);
    expect(result.data!.transactionCount).toBe(0);
  });

  it('totalBalance equals totalIncome minus totalExpense', async () => {
    await createTransaction({
      date: '2026-01-10',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-20',
      description: 'Food',
      category: 'Food',
      categoryId: 'c2',
      type: 'expense',
      amount: 1000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.data!.totalBalance).toBe(4000000);
  });

  it('savingsRate is calculated as Math.round((totalBalance / totalIncome) * 100)', async () => {
    await createTransaction({
      date: '2026-01-10',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 10000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-20',
      description: 'Rent',
      category: 'Housing',
      categoryId: 'c2',
      type: 'expense',
      amount: 3000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    const result = await getAnnualReportData(2026);
    // totalBalance = 7M, totalIncome = 10M → savingsRate = 70
    expect(result.data!.savingsRate).toBe(70);
  });

  it('savingsRate is 0 when totalIncome is 0', async () => {
    const result = await getAnnualReportData(2026);
    expect(result.data!.savingsRate).toBe(0);
  });

  it('savingsRate is 0 when totalBalance is negative', async () => {
    await createTransaction({
      date: '2026-01-10',
      description: 'Expense',
      category: 'Food',
      categoryId: 'c2',
      type: 'expense',
      amount: 3000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.data!.savingsRate).toBe(0);
  });

  it('topExpenseCategories contains only expense transactions sorted by amount descending', async () => {
    await createTransaction({
      date: '2026-01-10',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-15',
      description: 'Rent',
      category: 'Housing',
      categoryId: 'c2',
      type: 'expense',
      amount: 2000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-20',
      description: 'Food',
      category: 'Food',
      categoryId: 'c3',
      type: 'expense',
      amount: 500000,
      paymentMethod: 'Bank',
      notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.data!.topExpenseCategories).toHaveLength(2);
    expect(result.data!.topExpenseCategories[0].category).toBe('Housing');
    expect(result.data!.topExpenseCategories[0].amount).toBe(2000000);
    expect(result.data!.topExpenseCategories[1].category).toBe('Food');
    // Income category must NOT appear
    expect(result.data!.topExpenseCategories.find((c) => c.category === 'Income')).toBeUndefined();
  });

  it('topExpenseCategories is empty when no expense transactions exist', async () => {
    await createTransaction({
      date: '2026-01-10',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.data!.topExpenseCategories).toEqual([]);
  });

  it('previousYear is null when no transactions exist for prior year', async () => {
    const result = await getAnnualReportData(2026);
    expect(result.data!.previousYear).toBeNull();
  });

  it('previousYear returns correct totals when prior year data exists', async () => {
    // 2025 transaction
    await createTransaction({
      date: '2025-06-15',
      description: 'Old Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 4000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    // 2026 transaction
    await createTransaction({
      date: '2026-01-10',
      description: 'New Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    const result = await getAnnualReportData(2026);
    expect(result.data!.previousYear).not.toBeNull();
    expect(result.data!.previousYear!.year).toBe(2025);
    expect(result.data!.previousYear!.totalIncome).toBe(4000000);
  });

  it('comparison is null when previousYear is null', async () => {
    const result = await getAnnualReportData(2026);
    expect(result.data!.comparison).toBeNull();
  });

  it('comparison.incomeChange is null when previous year income is 0', async () => {
    // 2025: only expense transactions (income = 0)
    await createTransaction({
      date: '2025-06-15',
      description: 'Old Expense',
      category: 'Housing',
      categoryId: 'c2',
      type: 'expense',
      amount: 1000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    // 2026: has income
    await createTransaction({
      date: '2026-01-10',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    const result = await getAnnualReportData(2026);
    // previousYear exists (2025 has a transaction), but prevTotalIncome = 0 → pctChange returns null
    expect(result.data!.comparison).not.toBeNull();
    expect(result.data!.comparison!.incomeChange).toBeNull();
  });

  it('monthlyBreakdown entries include monthKey in YYYY-MM format', async () => {
    const result = await getAnnualReportData(2026);
    expect(result.data!.monthlyBreakdown[0].monthKey).toBe('2026-01'); // January
    expect(result.data!.monthlyBreakdown[11].monthKey).toBe('2026-12'); // December
  });

  it('monthlyBreakdown balance equals net (income minus expense) for that month', async () => {
    await createTransaction({
      date: '2026-03-10',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank',
      notes: '',
    });
    await createTransaction({
      date: '2026-03-15',
      description: 'Rent',
      category: 'Housing',
      categoryId: 'c2',
      type: 'expense',
      amount: 1500000,
      paymentMethod: 'Bank',
      notes: '',
    });
    const result = await getAnnualReportData(2026);
    const march = result.data!.monthlyBreakdown[2]; // index 2 = March
    expect(march.net).toBe(3500000);
    expect(march.balance).toBe(march.net);
  });
});
