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

const mkTx = (date: string, type: 'income' | 'expense', amount: number, pm = 'BCA') =>
  createTransaction({
    date,
    description: 'd',
    category: 'c',
    categoryId: 'c1',
    type,
    amount,
    paymentMethod: pm,
    notes: '',
  });

describe('listPaymentMethodBalances (monthly chain)', () => {
  it('returns empty array when no payment methods exist', async () => {
    const r = await listPaymentMethodBalances(2, 2026);
    expect(r.error).toBeUndefined();
    expect(r.data).toEqual([]);
  });

  it('beginningBalance is 0 when no prior transactions exist', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    const r = await listPaymentMethodBalances(2, 2026); // March 2026
    expect(r.data![0].beginningBalance).toBe(0);
  });

  it('beginningBalance = sum of transactions before the month', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await mkTx('2026-01-10', 'income', 5000000); // January — before March
    await mkTx('2026-02-15', 'expense', 1000000); // February — before March
    const r = await listPaymentMethodBalances(2, 2026); // month=2 → March
    // beginningBalance = 5,000,000 - 1,000,000 = 4,000,000
    expect(r.data![0].beginningBalance).toBe(4000000);
  });

  it('income = only income in the queried month', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await mkTx('2026-01-10', 'income', 5000000); // prior month
    await mkTx('2026-03-05', 'income', 3000000); // this month
    const r = await listPaymentMethodBalances(2, 2026); // March
    expect(r.data![0].income).toBe(3000000);
  });

  it('expense = only expense in the queried month', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await mkTx('2026-01-10', 'expense', 200000); // prior
    await mkTx('2026-03-20', 'expense', 500000); // this month
    const r = await listPaymentMethodBalances(2, 2026);
    expect(r.data![0].expense).toBe(500000);
  });

  it('balance (closing) = beginningBalance + income − expense', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await mkTx('2026-01-10', 'income', 6000000); // prior — beginningBalance
    await mkTx('2026-03-05', 'income', 3000000); // income this month
    await mkTx('2026-03-20', 'expense', 2000000); // expense this month
    const r = await listPaymentMethodBalances(2, 2026);
    const b = r.data![0];
    expect(b.beginningBalance).toBe(6000000);
    expect(b.income).toBe(3000000);
    expect(b.expense).toBe(2000000);
    expect(b.balance).toBe(7000000); // 6M + 3M - 2M
  });

  it('without params (all-time path): beginningBalance=0, income/expense all-time', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await mkTx('2026-01-10', 'income', 5000000);
    await mkTx('2026-03-20', 'expense', 1000000);
    const r = await listPaymentMethodBalances(); // no params
    const b = r.data![0];
    expect(b.beginningBalance).toBe(0);
    expect(b.income).toBe(5000000);
    expect(b.expense).toBe(1000000);
    expect(b.balance).toBe(4000000);
  });

  it('orders results by balance descending', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await createPaymentMethod({ name: 'GoPay', icon: 'smartphone', type: 'ewallet' });
    await mkTx('2026-03-05', 'income', 1000000, 'BCA');
    await mkTx('2026-03-05', 'income', 5000000, 'GoPay');
    const r = await listPaymentMethodBalances(2, 2026);
    expect(r.data![0].name).toBe('GoPay');
    expect(r.data![1].name).toBe('BCA');
  });

  it('multiple payment methods computed independently', async () => {
    await createPaymentMethod({ name: 'BCA', icon: 'building', type: 'bank' });
    await createPaymentMethod({ name: 'GoPay', icon: 'smartphone', type: 'ewallet' });
    await mkTx('2026-01-10', 'income', 4000000, 'BCA');
    await mkTx('2026-01-15', 'income', 1000000, 'GoPay');
    await mkTx('2026-03-05', 'expense', 500000, 'BCA');
    const r = await listPaymentMethodBalances(2, 2026);
    const bca = r.data!.find((b) => b.name === 'BCA')!;
    const gopay = r.data!.find((b) => b.name === 'GoPay')!;
    expect(bca.beginningBalance).toBe(4000000);
    expect(bca.expense).toBe(500000);
    expect(bca.balance).toBe(3500000);
    expect(gopay.beginningBalance).toBe(1000000);
    expect(gopay.income).toBe(0);
    expect(gopay.balance).toBe(1000000);
  });
});

describe('listPaymentMethodBalances (all-time path)', () => {
  it('balance includes beginning_balance when no transactions exist', async () => {
    await createPaymentMethod({ name: 'BCA', type: 'bank', beginningBalance: 500000 });
    const r = await listPaymentMethodBalances();
    expect(r.data).toHaveLength(1);
    expect(r.data![0].balance).toBe(500000);
    expect(r.data![0].beginningBalance).toBe(500000);
  });

  it('balance = beginning_balance + income − expense', async () => {
    await createPaymentMethod({ name: 'BCA', type: 'bank', beginningBalance: 1000000 });
    await createTransaction({
      description: 'Salary',
      amount: 3000000,
      type: 'income',
      date: '2026-01-15',
      category: 'Gaji',
      categoryId: 'gaji1',
      paymentMethod: 'BCA',
    });
    await createTransaction({
      description: 'Food',
      amount: 500000,
      type: 'expense',
      date: '2026-01-20',
      category: 'Makanan',
      categoryId: 'makanan1',
      paymentMethod: 'BCA',
    });
    const r = await listPaymentMethodBalances();
    const row = r.data![0];
    expect(row.income).toBe(3000000);
    expect(row.expense).toBe(500000);
    expect(row.balance).toBe(3500000); // 1000000 + 3000000 - 500000
  });

  it('negative beginning_balance reduces balance', async () => {
    await createPaymentMethod({ name: 'CC', type: 'ewallet', beginningBalance: -200000 });
    const r = await listPaymentMethodBalances();
    expect(r.data![0].balance).toBe(-200000);
  });

  it('zero beginning_balance preserves income−expense behavior (regression)', async () => {
    await createPaymentMethod({ name: 'BCA', type: 'bank', beginningBalance: 0 });
    await createTransaction({
      description: 'Income',
      amount: 2000000,
      type: 'income',
      date: '2026-01-10',
      category: 'Gaji',
      categoryId: 'gaji1',
      paymentMethod: 'BCA',
    });
    await createTransaction({
      description: 'Expense',
      amount: 500000,
      type: 'expense',
      date: '2026-01-11',
      category: 'Makanan',
      categoryId: 'makanan1',
      paymentMethod: 'BCA',
    });
    const r = await listPaymentMethodBalances();
    expect(r.data![0].beginningBalance).toBe(0);
    expect(r.data![0].balance).toBe(1500000);
  });
});
