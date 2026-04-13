import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  createRecurringTransaction,
  getDueItems,
} from '@/server/services/recurring-transaction.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

const baseRule = {
  description: 'Test Rule',
  category: 'Salary',
  categoryId: 'cat-1',
  type: 'income' as const,
  amount: 1000000,
  paymentMethod: 'BCA',
  notes: '',
  frequency: 'monthly' as const,
  startDate: '2026-01-01',
  endDate: null,
  isActive: true,
};

describe('getDueItems', () => {
  it('returns empty array when no rules are due', async () => {
    await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2099-12-01',
    });
    const result = await getDueItems();
    expect(result.error).toBeUndefined();
    expect(result.data!.dueItems).toHaveLength(0);
    expect(result.data!.totalTransactions).toBe(0);
  });

  it('computes correct overdueCount for a monthly rule', async () => {
    await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-01-01',
      frequency: 'monthly',
    });
    const result = await getDueItems();
    expect(result.error).toBeUndefined();
    expect(result.data!.dueItems).toHaveLength(1);
    const item = result.data!.dueItems[0];
    expect(item.overdueCount).toBeGreaterThanOrEqual(1);
    expect(item.totalAmount).toBe(item.amount * item.overdueCount);
    expect(item.description).toBe('Test Rule');
    expect(item.type).toBe('income');
    expect(item.frequency).toBe('monthly');
  });

  it('computes totalAmount as amount * overdueCount', async () => {
    await createRecurringTransaction({
      ...baseRule,
      amount: 500000,
      nextDueDate: '2026-01-01',
      frequency: 'monthly',
    });
    const result = await getDueItems();
    const item = result.data!.dueItems[0];
    expect(item.totalAmount).toBe(500000 * item.overdueCount);
  });

  it('aggregates totalTransactions, totalIncome, totalExpense', async () => {
    await createRecurringTransaction({
      ...baseRule,
      type: 'income',
      amount: 1000000,
      nextDueDate: '2026-03-01',
      frequency: 'monthly',
    });
    await createRecurringTransaction({
      ...baseRule,
      description: 'Expense Rule',
      type: 'expense',
      amount: 200000,
      nextDueDate: '2026-03-01',
      frequency: 'monthly',
    });
    const result = await getDueItems();
    expect(result.data!.dueItems).toHaveLength(2);
    expect(result.data!.totalTransactions).toBe(
      result.data!.dueItems.reduce((sum, i) => sum + i.overdueCount, 0)
    );
    expect(result.data!.totalIncome).toBeGreaterThan(0);
    expect(result.data!.totalExpense).toBeGreaterThan(0);
  });

  it('excludes inactive rules', async () => {
    const created = await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-01-01',
      isActive: true,
    });
    const { updateRecurringTransaction } =
      await import('@/server/services/recurring-transaction.service');
    await updateRecurringTransaction(created.data!.id, { isActive: false });
    const result = await getDueItems();
    expect(result.data!.dueItems).toHaveLength(0);
  });

  it('stops counting at endDate', async () => {
    await createRecurringTransaction({
      ...baseRule,
      nextDueDate: '2026-01-01',
      endDate: '2026-02-15',
      frequency: 'monthly',
    });
    const result = await getDueItems();
    if (result.data!.dueItems.length > 0) {
      expect(result.data!.dueItems[0].overdueCount).toBeLessThanOrEqual(2);
    }
  });
});
