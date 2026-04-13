import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  createRecurringTransaction,
  generateRecurringTransactions,
} from '@/server/services/recurring-transaction.service';
import { listTransactions } from '@/server/services/transaction.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

const baseRule = {
  description: 'Monthly Salary',
  category: 'Salary',
  categoryId: 'cat-1',
  type: 'income' as const,
  amount: 5000000,
  paymentMethod: 'BCA',
  notes: '',
  frequency: 'monthly' as const,
  startDate: '2026-01-01',
  endDate: null,
  isActive: true,
};

describe('generateRecurringTransactions with idempotency', () => {
  it('sets source_recurring_id and source_due_date on generated transactions', async () => {
    const rule = await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-03-01',
    });
    const result = await generateRecurringTransactions();
    expect(result.data!.generated).toBeGreaterThan(0);
    const txResult = await listTransactions({});
    const generated = txResult.data!.transactions.filter(
      (tx) => tx.sourceRecurringId === rule.data!.id
    );
    expect(generated.length).toBeGreaterThan(0);
    // Transactions are returned in date DESC order; find the one for the earliest due date
    const earliest = generated.find((tx) => tx.sourceDueDate === '2026-03-01');
    expect(earliest).toBeDefined();
    expect(earliest!.sourceDueDate).toBe('2026-03-01');
  });

  it('skips when transaction already exists for same rule + due date', async () => {
    await createRecurringTransaction({ ...baseRule, nextDueDate: '2026-03-01' });
    const first = await generateRecurringTransactions();
    expect(first.data!.generated).toBeGreaterThan(0);
    const second = await generateRecurringTransactions();
    expect(second.data!.generated).toBe(0);
  });

  it('returns skipped count when duplicates exist', async () => {
    const rule = await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-03-01',
    });
    await generateRecurringTransactions();
    const { updateRecurringTransaction } =
      await import('@/server/services/recurring-transaction.service');
    await updateRecurringTransaction(rule.data!.id, { nextDueDate: '2026-03-01' });
    const result = await generateRecurringTransactions();
    expect(result.data!.skipped).toBeGreaterThan(0);
    expect(result.data!.generated).toBe(0);
  });

  it('advances next_due_date even when transaction is skipped', async () => {
    const rule = await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-03-01',
    });
    await generateRecurringTransactions();
    const { updateRecurringTransaction, getRecurringTransaction } =
      await import('@/server/services/recurring-transaction.service');
    await updateRecurringTransaction(rule.data!.id, { nextDueDate: '2026-03-01' });
    await generateRecurringTransactions();
    const updated = await getRecurringTransaction(rule.data!.id);
    const today = new Date().toISOString().slice(0, 10);
    expect(updated.data!.nextDueDate > today).toBe(true);
  });

  it('returns correct totalIncome and totalExpense', async () => {
    await createRecurringTransaction({
      ...baseRule,
      type: 'income',
      amount: 1000000,
      nextDueDate: '2026-03-01',
    });
    await createRecurringTransaction({
      ...baseRule,
      description: 'Netflix',
      type: 'expense',
      amount: 186000,
      nextDueDate: '2026-03-01',
    });
    const result = await generateRecurringTransactions();
    expect(result.data!.totalIncome).toBeGreaterThan(0);
    expect(result.data!.totalExpense).toBeGreaterThan(0);
  });

  it('returns zeros when no rules are due', async () => {
    await createRecurringTransaction({ ...baseRule, nextDueDate: '2099-12-01' });
    const result = await generateRecurringTransactions();
    expect(result.data!.generated).toBe(0);
    expect(result.data!.skipped).toBe(0);
    expect(result.data!.totalIncome).toBe(0);
    expect(result.data!.totalExpense).toBe(0);
  });

  it('respects endDate and deactivates expired rules', async () => {
    const rule = await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-01-01',
      endDate: '2026-02-15',
    });
    await generateRecurringTransactions();
    const { getRecurringTransaction } =
      await import('@/server/services/recurring-transaction.service');
    const updated = await getRecurringTransaction(rule.data!.id);
    expect(updated.data!.isActive).toBe(false);
  });

  it('catches up multiple missed periods in one call', async () => {
    await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-01-01',
      frequency: 'monthly',
    });
    const result = await generateRecurringTransactions();
    expect(result.data!.generated).toBeGreaterThanOrEqual(3);
  });
});
