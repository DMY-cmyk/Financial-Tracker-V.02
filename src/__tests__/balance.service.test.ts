import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { listPaymentMethodBalances } from '@/server/services/balance.service';
import { createPaymentMethod } from '@/server/services/payment-method.service';
import { createTransaction } from '@/server/services/transaction.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('listPaymentMethodBalances', () => {
  it('returns empty array when no payment methods exist', async () => {
    const result = await listPaymentMethodBalances();
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([]);
  });

  it('returns zero balance for payment method with no transactions', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    const result = await listPaymentMethodBalances();
    expect(result.data).toHaveLength(1);
    expect(result.data![0].balance).toBe(0);
    expect(result.data![0].income).toBe(0);
    expect(result.data![0].expense).toBe(0);
  });

  it('computes balance as income minus expense', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createTransaction({
      date: '2026-01-15',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-20',
      description: 'Food',
      category: 'Expense',
      categoryId: 'c2',
      type: 'expense',
      amount: 200000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    const result = await listPaymentMethodBalances();
    expect(result.data![0].income).toBe(5000000);
    expect(result.data![0].expense).toBe(200000);
    expect(result.data![0].balance).toBe(4800000);
  });

  it('handles multiple payment methods independently', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createPaymentMethod({ name: 'GoPay', icon: 'smartphone', type: 'ewallet' });
    await createTransaction({
      date: '2026-01-15',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 3000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-15',
      description: 'Top Up',
      category: 'Transfer',
      categoryId: 'c2',
      type: 'income',
      amount: 500000,
      paymentMethod: 'GoPay',
      notes: '',
    });
    const result = await listPaymentMethodBalances();
    expect(result.data).toHaveLength(2);
    const bca = result.data!.find((b) => b.name === 'Bank BCA');
    const gopay = result.data!.find((b) => b.name === 'GoPay');
    expect(bca!.balance).toBe(3000000);
    expect(gopay!.balance).toBe(500000);
  });

  it('orders results by balance descending', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createPaymentMethod({ name: 'GoPay', icon: 'smartphone', type: 'ewallet' });
    await createTransaction({
      date: '2026-01-15',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 1000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-15',
      description: 'Top Up',
      category: 'Transfer',
      categoryId: 'c2',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'GoPay',
      notes: '',
    });
    const result = await listPaymentMethodBalances();
    expect(result.data![0].name).toBe('GoPay');
    expect(result.data![1].name).toBe('Bank BCA');
  });

  it('returns monthlyFlow of 0 for all accounts when no month/year params given', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createTransaction({
      date: '2026-01-15',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    const result = await listPaymentMethodBalances();
    expect(result.data![0].monthlyFlow).toBe(0);
  });

  it('returns monthlyFlow of 0 when account has no transactions in the queried month', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createTransaction({
      date: '2026-01-15',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    // Query February — no transactions in Feb
    const result = await listPaymentMethodBalances(1, 2026);
    expect(result.data![0].monthlyFlow).toBe(0);
    // All-time balance is unchanged
    expect(result.data![0].balance).toBe(5000000);
  });

  it('returns positive monthlyFlow for an income-only month', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createTransaction({
      date: '2026-03-10',
      description: 'Salary',
      category: 'Income',
      categoryId: 'c1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    const result = await listPaymentMethodBalances(2, 2026); // month=2 = March
    expect(result.data![0].monthlyFlow).toBe(5000000);
  });

  it('returns negative monthlyFlow for an expense-only month', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createTransaction({
      date: '2026-03-15',
      description: 'Rent',
      category: 'Housing',
      categoryId: 'c2',
      type: 'expense',
      amount: 2000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    const result = await listPaymentMethodBalances(2, 2026);
    expect(result.data![0].monthlyFlow).toBe(-2000000);
  });

  it('monthlyFlow is independent of all-time balance', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    // January: income 5M
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
    // March: expense 200K
    await createTransaction({
      date: '2026-03-15',
      description: 'Food',
      category: 'Food',
      categoryId: 'c2',
      type: 'expense',
      amount: 200000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    const result = await listPaymentMethodBalances(2, 2026); // query March only
    expect(result.data![0].balance).toBe(4800000); // all-time: 5M - 200K
    expect(result.data![0].monthlyFlow).toBe(-200000); // March only: -200K
  });

  it('all-time income/expense/balance are identical regardless of month/year params', async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
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
      date: '2026-01-20',
      description: 'Rent',
      category: 'Housing',
      categoryId: 'c2',
      type: 'expense',
      amount: 1000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    const withParams = await listPaymentMethodBalances(1, 2026); // Feb — no transactions
    const withoutParams = await listPaymentMethodBalances();
    expect(withParams.data![0].balance).toBe(withoutParams.data![0].balance);
    expect(withParams.data![0].income).toBe(withoutParams.data![0].income);
    expect(withParams.data![0].expense).toBe(withoutParams.data![0].expense);
  });
});
