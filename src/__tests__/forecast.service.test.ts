import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { computeOccurrences, getForecast } from '@/server/services/forecast.service';
import { createRecurringTransaction } from '@/server/services/recurring-transaction.service';
import type { RecurringTransaction } from '@/lib/types';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

function makeTx(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  return {
    id: 'test-id',
    description: 'Test',
    category: 'Test',
    categoryId: 'cat-1',
    type: 'expense',
    amount: 100000,
    paymentMethod: 'Cash',
    notes: '',
    frequency: 'monthly',
    startDate: '2025-01-01',
    endDate: null,
    nextDueDate: '2026-01-01',
    isActive: true,
    ...overrides,
  };
}

describe('computeOccurrences – monthly', () => {
  it('returns 1 for any month within active range', () => {
    const tx = makeTx({ frequency: 'monthly' });
    expect(computeOccurrences(tx, 0, 2026)).toBe(1);
    expect(computeOccurrences(tx, 5, 2026)).toBe(1);
  });

  it('returns 0 if startDate is after last day of forecast month', () => {
    const tx = makeTx({ frequency: 'monthly', startDate: '2026-06-01' });
    expect(computeOccurrences(tx, 4, 2026)).toBe(0); // May 2026
  });

  it('returns 0 if endDate is before first day of forecast month', () => {
    const tx = makeTx({ frequency: 'monthly', endDate: '2026-02-28' });
    expect(computeOccurrences(tx, 2, 2026)).toBe(0); // March 2026
  });

  it('returns 1 when startDate is the last day of the forecast month', () => {
    const tx = makeTx({ frequency: 'monthly', startDate: '2026-01-31' });
    expect(computeOccurrences(tx, 0, 2026)).toBe(1); // January 2026
  });
});

describe('computeOccurrences – weekly', () => {
  it('returns 5 for Mondays in March 2026 (5 Mondays: 2,9,16,23,30)', () => {
    // nextDueDate is a Monday: 2026-03-02
    const tx = makeTx({ frequency: 'weekly', nextDueDate: '2026-03-02' });
    expect(computeOccurrences(tx, 2, 2026)).toBe(5); // month=2 is March (0-based)
  });

  it('returns 4 for Fridays in March 2026 (4 Fridays: 6,13,20,27)', () => {
    // nextDueDate is a Friday: 2026-03-06
    const tx = makeTx({ frequency: 'weekly', nextDueDate: '2026-03-06' });
    expect(computeOccurrences(tx, 2, 2026)).toBe(4);
  });

  it('excludes occurrences past endDate', () => {
    // 5 Mondays in March 2026 but endDate is 2026-03-23 (cuts off March 30)
    const tx = makeTx({
      frequency: 'weekly',
      nextDueDate: '2026-03-02',
      endDate: '2026-03-23',
    });
    expect(computeOccurrences(tx, 2, 2026)).toBe(4);
  });
});

describe('computeOccurrences – daily', () => {
  it('returns 28 for February 2026 (non-leap year)', () => {
    const tx = makeTx({ frequency: 'daily' });
    expect(computeOccurrences(tx, 1, 2026)).toBe(28);
  });

  it('returns 31 for January 2026', () => {
    const tx = makeTx({ frequency: 'daily' });
    expect(computeOccurrences(tx, 0, 2026)).toBe(31);
  });

  it('returns days up to endDate when endDate is within the month', () => {
    const tx = makeTx({ frequency: 'daily', endDate: '2026-01-15' });
    expect(computeOccurrences(tx, 0, 2026)).toBe(15);
  });
});

describe('computeOccurrences – yearly', () => {
  it('returns 1 when startDate month matches forecast month', () => {
    // startDate in March (month index 2); forecast March 2027
    const tx = makeTx({ frequency: 'yearly', startDate: '2026-03-15' });
    expect(computeOccurrences(tx, 2, 2027)).toBe(1);
  });

  it('returns 0 when startDate month does not match forecast month', () => {
    const tx = makeTx({ frequency: 'yearly', startDate: '2026-03-15' });
    expect(computeOccurrences(tx, 4, 2027)).toBe(0); // May 2027 ≠ March
  });

  it('returns 0 when endDate is before the forecast year', () => {
    const tx = makeTx({ frequency: 'yearly', startDate: '2025-03-01', endDate: '2025-12-31' });
    expect(computeOccurrences(tx, 2, 2027)).toBe(0);
  });
});

describe('getForecast', () => {
  it('returns forecast array with the requested number of months', async () => {
    const result = await getForecast(6);
    expect(result.error).toBeUndefined();
    expect(result.data!.forecast).toHaveLength(6);
  });

  it('respects custom months count', async () => {
    const result = await getForecast(3);
    expect(result.data!.forecast).toHaveLength(3);
  });

  it('returns zeros when no recurring transactions exist', async () => {
    const result = await getForecast(1);
    expect(result.data!.forecast[0].projectedIncome).toBe(0);
    expect(result.data!.forecast[0].projectedExpense).toBe(0);
    expect(result.data!.forecast[0].recurringItems).toHaveLength(0);
  });

  it('includes active monthly recurring income in forecast', async () => {
    await createRecurringTransaction({
      description: 'Monthly Salary',
      category: 'Income',
      categoryId: 'cat-1',
      type: 'income',
      amount: 5000000,
      paymentMethod: 'Bank',
      notes: '',
      frequency: 'monthly',
      startDate: '2025-01-01',
      endDate: null,
      nextDueDate: '2026-01-01',
      isActive: true,
    });
    const result = await getForecast(1);
    expect(result.data!.forecast[0].projectedIncome).toBe(5000000);
    expect(result.data!.forecast[0].recurringItems).toHaveLength(1);
    expect(result.data!.forecast[0].recurringItems[0].description).toBe('Monthly Salary');
  });

  it('excludes inactive recurring transactions', async () => {
    await createRecurringTransaction({
      description: 'Inactive',
      category: 'Expense',
      categoryId: 'cat-2',
      type: 'expense',
      amount: 1000000,
      paymentMethod: 'Cash',
      notes: '',
      frequency: 'monthly',
      startDate: '2025-01-01',
      endDate: null,
      nextDueDate: '2026-01-01',
      isActive: false,
    });
    const result = await getForecast(1);
    expect(result.data!.forecast[0].projectedExpense).toBe(0);
  });

  it('includes currentMonth with actual income and expense fields', async () => {
    const result = await getForecast(1);
    expect(result.data!.currentMonth).toBeDefined();
    expect(typeof result.data!.currentMonth.actualIncome).toBe('number');
    expect(typeof result.data!.currentMonth.actualExpense).toBe('number');
    expect(typeof result.data!.currentMonth.projectedIncome).toBe('number');
    expect(typeof result.data!.currentMonth.projectedExpense).toBe('number');
    expect(typeof result.data!.currentMonth.projectedNet).toBe('number');
  });

  it('sets projectedNet to 0 when no transactions and no recurring exist', async () => {
    const result = await getForecast(1);
    expect(result.data!.currentMonth.projectedNet).toBe(0);
  });
});
