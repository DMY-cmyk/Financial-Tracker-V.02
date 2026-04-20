import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { createTransaction } from '@/server/services/transaction.service';
import { getDashboardSummary } from '@/server/services/dashboard.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

async function seedJanuary() {
  await createTransaction({
    date: '2026-01-05',
    description: 'Salary',
    category: 'Salary',
    categoryId: 'cat-salary',
    type: 'income',
    amount: 8500000,
    paymentMethod: 'Bank BCA',
    notes: '',
  });
  await createTransaction({
    date: '2026-01-10',
    description: 'Freelance Project',
    category: 'Freelance',
    categoryId: 'cat-freelance',
    type: 'income',
    amount: 2000000,
    paymentMethod: 'Bank BCA',
    notes: '',
  });
  await createTransaction({
    date: '2026-01-12',
    description: 'Groceries',
    category: 'Food',
    categoryId: 'cat-food',
    type: 'expense',
    amount: 500000,
    paymentMethod: 'Cash',
    notes: '',
  });
  await createTransaction({
    date: '2026-01-15',
    description: 'Electric Bill',
    category: 'Utilities',
    categoryId: 'cat-utilities',
    type: 'expense',
    amount: 800000,
    paymentMethod: 'Bank BCA',
    notes: '',
  });
  await createTransaction({
    date: '2026-01-20',
    description: 'Movie Tickets',
    category: 'Entertainment',
    categoryId: 'cat-entertainment',
    type: 'expense',
    amount: 200000,
    paymentMethod: 'GoPay',
    notes: '',
  });
}

describe('getDashboardSummary', () => {
  it('returns correct summary for a month', async () => {
    await seedJanuary();
    const result = await getDashboardSummary({ month: 0, year: 2026 });

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();

    const data = result.data!;
    expect(data.income).toBe(10500000);
    expect(data.expense).toBe(1500000);
    expect(data.balance).toBe(9000000);
    expect(data.transactionCount).toBe(5);
    expect(data.savingsRate).toBe(86); // (10500000 - 1500000) / 10500000 * 100
  });

  it('returns category totals', async () => {
    await seedJanuary();
    const result = await getDashboardSummary({ month: 0, year: 2026 });
    const data = result.data!;

    expect(data.categoryTotals['cat-food']).toBe(500000);
    expect(data.categoryTotals['cat-utilities']).toBe(800000);
    expect(data.categoryTotals['cat-entertainment']).toBe(200000);
  });

  it('returns payment method totals', async () => {
    await seedJanuary();
    const result = await getDashboardSummary({ month: 0, year: 2026 });
    const data = result.data!;

    expect(data.paymentMethodTotals['Cash']).toBe(500000);
    expect(data.paymentMethodTotals['Bank BCA']).toBe(800000);
    expect(data.paymentMethodTotals['GoPay']).toBe(200000);
  });

  it('returns recent transactions (max 5, sorted by date desc)', async () => {
    await seedJanuary();
    const result = await getDashboardSummary({ month: 0, year: 2026 });
    const data = result.data!;

    expect(data.recentTransactions.length).toBe(5);
    expect(data.recentTransactions[0].date).toBe('2026-01-20');
  });

  it('returns cash flow data with all days of month', async () => {
    await seedJanuary();
    const result = await getDashboardSummary({ month: 0, year: 2026 });
    const data = result.data!;

    expect(data.cashFlow.length).toBe(31); // January has 31 days
    const day5 = data.cashFlow.find((d) => d.date === '5');
    expect(day5?.income).toBe(8500000);
  });

  it('returns zeros for empty month', async () => {
    const result = await getDashboardSummary({ month: 6, year: 2026 });
    const data = result.data!;

    expect(data.income).toBe(0);
    expect(data.expense).toBe(0);
    expect(data.balance).toBe(0);
    expect(data.savingsRate).toBe(0);
    expect(data.transactionCount).toBe(0);
  });

  it('returns error for invalid query', async () => {
    const result = await getDashboardSummary({});
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('getDashboardSummary with split transactions', () => {
  it('includes split line amounts in category totals, not parent total', async () => {
    const db = await (await import('@/server/db/client')).getDb();
    const { createTransactionSplitRepository } =
      await import('@/server/repositories/transaction-split.repository');
    const splitRepo = createTransactionSplitRepository();

    const txId = 'tx-dash-split';
    await db.query(
      'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, is_split) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [txId, '2026-01-20', 'Supermarket', '', '', 'expense', 500000, 'Cash', '', 1]
    );
    await splitRepo.createSplits(txId, [
      { categoryId: 'cat-food', category: 'Food', amount: 200000 },
      { categoryId: 'cat-home', category: 'Household', amount: 150000 },
      { categoryId: 'cat-personal', category: 'Personal Care', amount: 150000 },
    ]);

    const result = await getDashboardSummary({ month: 0, year: 2026 });
    const data = result.data!;

    // Total expense still uses parent amount (correct)
    expect(data.expense).toBe(500000);

    // Category totals use split line amounts, not parent
    expect(data.categoryTotals['cat-food']).toBe(200000);
    expect(data.categoryTotals['cat-home']).toBe(150000);
    expect(data.categoryTotals['cat-personal']).toBe(150000);

    // Empty-string parent category must NOT appear
    expect(data.categoryTotals['']).toBeUndefined();
  });
});
