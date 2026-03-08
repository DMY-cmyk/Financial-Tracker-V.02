import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/sqlite';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { createTransaction } from '@/server/services/transaction.service';
import { getDashboardSummary } from '@/server/services/dashboard.service';

beforeEach(() => {
  resetDb();
  resetSeeded();
  markSeeded();
});

function seedJanuary() {
  createTransaction({
    date: '2025-01-05',
    description: 'Salary',
    category: 'Salary',
    type: 'income',
    amount: 8500000,
    paymentMethod: 'Bank BCA',
    notes: '',
  });
  createTransaction({
    date: '2025-01-10',
    description: 'Freelance Project',
    category: 'Freelance',
    type: 'income',
    amount: 2000000,
    paymentMethod: 'Bank BCA',
    notes: '',
  });
  createTransaction({
    date: '2025-01-12',
    description: 'Groceries',
    category: 'Food',
    type: 'expense',
    amount: 500000,
    paymentMethod: 'Cash',
    notes: '',
  });
  createTransaction({
    date: '2025-01-15',
    description: 'Electric Bill',
    category: 'Utilities',
    type: 'expense',
    amount: 800000,
    paymentMethod: 'Bank BCA',
    notes: '',
  });
  createTransaction({
    date: '2025-01-20',
    description: 'Movie Tickets',
    category: 'Entertainment',
    type: 'expense',
    amount: 200000,
    paymentMethod: 'GoPay',
    notes: '',
  });
}

describe('getDashboardSummary', () => {
  it('returns correct summary for a month', () => {
    seedJanuary();
    const result = getDashboardSummary({ month: 0, year: 2025 });

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();

    const data = result.data!;
    expect(data.income).toBe(10500000);
    expect(data.expense).toBe(1500000);
    expect(data.balance).toBe(9000000);
    expect(data.transactionCount).toBe(5);
    expect(data.savingsRate).toBe(86); // (10500000 - 1500000) / 10500000 * 100
  });

  it('returns category totals', () => {
    seedJanuary();
    const result = getDashboardSummary({ month: 0, year: 2025 });
    const data = result.data!;

    expect(data.categoryTotals['Food']).toBe(500000);
    expect(data.categoryTotals['Utilities']).toBe(800000);
    expect(data.categoryTotals['Entertainment']).toBe(200000);
  });

  it('returns payment method totals', () => {
    seedJanuary();
    const result = getDashboardSummary({ month: 0, year: 2025 });
    const data = result.data!;

    expect(data.paymentMethodTotals['Cash']).toBe(500000);
    expect(data.paymentMethodTotals['Bank BCA']).toBe(800000);
    expect(data.paymentMethodTotals['GoPay']).toBe(200000);
  });

  it('returns recent transactions (max 5, sorted by date desc)', () => {
    seedJanuary();
    const result = getDashboardSummary({ month: 0, year: 2025 });
    const data = result.data!;

    expect(data.recentTransactions.length).toBe(5);
    expect(data.recentTransactions[0].date).toBe('2025-01-20');
  });

  it('returns cash flow data with all days of month', () => {
    seedJanuary();
    const result = getDashboardSummary({ month: 0, year: 2025 });
    const data = result.data!;

    expect(data.cashFlow.length).toBe(31); // January has 31 days
    const day5 = data.cashFlow.find((d) => d.date === '5');
    expect(day5?.income).toBe(8500000);
  });

  it('returns zeros for empty month', () => {
    const result = getDashboardSummary({ month: 6, year: 2025 });
    const data = result.data!;

    expect(data.income).toBe(0);
    expect(data.expense).toBe(0);
    expect(data.balance).toBe(0);
    expect(data.savingsRate).toBe(0);
    expect(data.transactionCount).toBe(0);
  });

  it('returns error for invalid query', () => {
    const result = getDashboardSummary({});
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});
