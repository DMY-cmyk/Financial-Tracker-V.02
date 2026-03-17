import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  listRecurringTransactions,
  getRecurringTransaction,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  generateRecurringTransactions,
} from '@/server/services/recurring-transaction.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

const validRecurring = {
  description: 'Monthly Salary',
  category: 'Income',
  categoryId: 'cat-1',
  type: 'income' as const,
  amount: 5000000,
  paymentMethod: 'Bank Transfer',
  notes: 'Regular salary',
  frequency: 'monthly' as const,
  startDate: '2026-01-01',
  endDate: null,
  nextDueDate: '2026-03-01',
  isActive: true,
};

describe('createRecurringTransaction', () => {
  it('creates a recurring transaction with valid input', async () => {
    const result = await createRecurringTransaction(validRecurring);
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBeDefined();
    expect(result.data!.description).toBe('Monthly Salary');
    expect(result.data!.isActive).toBe(true);
  });

  it('defaults notes to empty string when not provided', async () => {
    const result = await createRecurringTransaction({
      description: validRecurring.description,
      category: validRecurring.category,
      categoryId: validRecurring.categoryId,
      type: validRecurring.type,
      amount: validRecurring.amount,
      paymentMethod: validRecurring.paymentMethod,
      frequency: validRecurring.frequency,
      startDate: validRecurring.startDate,
      endDate: validRecurring.endDate,
      nextDueDate: validRecurring.nextDueDate,
    });
    expect(result.data!.notes).toBe('');
  });

  it('returns VALIDATION_ERROR for empty description', async () => {
    const result = await createRecurringTransaction({ ...validRecurring, description: '' });
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for invalid frequency', async () => {
    const result = await createRecurringTransaction({ ...validRecurring, frequency: 'quarterly' });
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for invalid date format', async () => {
    const result = await createRecurringTransaction({
      ...validRecurring,
      startDate: '01-01-2026',
    });
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for negative amount', async () => {
    const result = await createRecurringTransaction({ ...validRecurring, amount: -100 });
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('listRecurringTransactions', () => {
  it('returns empty array when none exist', async () => {
    const result = await listRecurringTransactions();
    expect(result.data).toEqual([]);
  });

  it('returns all recurring transactions', async () => {
    await createRecurringTransaction(validRecurring);
    await createRecurringTransaction({ ...validRecurring, description: 'Rent' });
    const result = await listRecurringTransactions();
    expect(result.data!.length).toBe(2);
  });
});

describe('getRecurringTransaction', () => {
  it('returns the transaction by id', async () => {
    const { data: created } = await createRecurringTransaction(validRecurring);
    const result = await getRecurringTransaction(created!.id);
    expect(result.error).toBeUndefined();
    expect(result.data!.description).toBe('Monthly Salary');
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await getRecurringTransaction('nonexistent');
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});

describe('updateRecurringTransaction', () => {
  it('updates only the provided fields', async () => {
    const { data: created } = await createRecurringTransaction(validRecurring);
    const result = await updateRecurringTransaction(created!.id, { amount: 6000000 });
    expect(result.error).toBeUndefined();
    expect(result.data!.amount).toBe(6000000);
  });

  it('preserves isActive=false when updating amount', async () => {
    const { data: created } = await createRecurringTransaction({
      ...validRecurring,
      isActive: false,
    });
    // BUG: updateRecurringTransactionSchema inherits default(true) for isActive
    // so patching just the amount resets isActive to true
    const result = await updateRecurringTransaction(created!.id, { amount: 6000000 });
    expect(result.data!.isActive).toBe(false);
  });

  it('preserves notes when updating amount', async () => {
    const { data: created } = await createRecurringTransaction({
      ...validRecurring,
      notes: 'Important note',
    });
    // BUG: updateRecurringTransactionSchema inherits default('') for notes
    const result = await updateRecurringTransaction(created!.id, { amount: 6000000 });
    expect(result.data!.notes).toBe('Important note');
  });

  it('preserves endDate when updating amount', async () => {
    const { data: created } = await createRecurringTransaction({
      ...validRecurring,
      endDate: '2026-12-31',
    });
    // BUG: updateRecurringTransactionSchema inherits default(null) for endDate
    const result = await updateRecurringTransaction(created!.id, { amount: 6000000 });
    expect(result.data!.endDate).toBe('2026-12-31');
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await updateRecurringTransaction('nonexistent', { amount: 100 });
    expect(result.error!.code).toBe('NOT_FOUND');
  });

  it('returns VALIDATION_ERROR for invalid amount', async () => {
    const { data: created } = await createRecurringTransaction(validRecurring);
    const result = await updateRecurringTransaction(created!.id, { amount: -1 });
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('deleteRecurringTransaction', () => {
  it('deletes an existing recurring transaction', async () => {
    const { data: created } = await createRecurringTransaction(validRecurring);
    const result = await deleteRecurringTransaction(created!.id);
    expect(result.error).toBeUndefined();
    expect(result.data!.success).toBe(true);

    const fetched = await getRecurringTransaction(created!.id);
    expect(fetched.error!.code).toBe('NOT_FOUND');
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await deleteRecurringTransaction('nonexistent');
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});

describe('generateRecurringTransactions', () => {
  it('returns 0 generated when no due transactions exist', async () => {
    // Create a recurring transaction with future nextDueDate
    await createRecurringTransaction({
      ...validRecurring,
      nextDueDate: '2099-01-01',
    });
    const result = await generateRecurringTransactions();
    expect(result.data!.generated).toBe(0);
  });

  it('generates transactions for due recurring rules', async () => {
    // Create a recurring transaction due in the past
    await createRecurringTransaction({
      ...validRecurring,
      nextDueDate: '2026-01-01',
      frequency: 'monthly',
    });

    const result = await generateRecurringTransactions();
    // Should generate transactions from 2026-01-01 up to today (2026-03-17)
    // Jan, Feb, Mar = 3 transactions (or 2 depending on exact cutoff)
    expect(result.data!.generated).toBeGreaterThan(0);
  });

  it('does not generate past endDate', async () => {
    // Recurring transaction that ended before today
    await createRecurringTransaction({
      ...validRecurring,
      nextDueDate: '2026-01-01',
      endDate: '2026-01-31',
      frequency: 'monthly',
    });

    const result = await generateRecurringTransactions();
    expect(result.data!.generated).toBe(1); // only January
  });
});
