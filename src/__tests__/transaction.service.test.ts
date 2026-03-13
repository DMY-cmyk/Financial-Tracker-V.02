import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/server/services/transaction.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('createTransaction', () => {
  const validInput = {
    date: '2025-01-15',
    description: 'Monthly Salary',
    category: 'Salary',
    type: 'income' as const,
    amount: 8500000,
    paymentMethod: 'Bank BCA',
    notes: '',
  };

  it('creates a transaction with valid input', async () => {
    const result = await createTransaction(validInput);
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBeDefined();
    expect(result.data!.amount).toBe(8500000);
    expect(result.data!.description).toBe('Monthly Salary');
  });

  it('returns validation error for invalid input', async () => {
    const result = await createTransaction({
      ...validInput,
      amount: -100,
    });
    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for missing fields', async () => {
    const result = await createTransaction({});
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('listTransactions', () => {
  beforeEach(async () => {
    await createTransaction({
      date: '2025-01-15',
      description: 'Salary',
      category: 'Salary',
      type: 'income',
      amount: 8500000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    await createTransaction({
      date: '2025-01-20',
      description: 'Groceries',
      category: 'Food',
      type: 'expense',
      amount: 500000,
      paymentMethod: 'Cash',
      notes: '',
    });
    await createTransaction({
      date: '2025-02-10',
      description: 'Rent',
      category: 'Utilities',
      type: 'expense',
      amount: 3000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
  });

  it('returns all transactions without filters', async () => {
    const result = await listTransactions({});
    expect(result.data).toBeDefined();
    expect(result.data!.total).toBe(3);
  });

  it('filters by month and year', async () => {
    const result = await listTransactions({ month: 0, year: 2025 });
    expect(result.data!.total).toBe(2);
  });

  it('filters by type', async () => {
    const result = await listTransactions({ type: 'expense' });
    expect(result.data!.total).toBe(2);
    expect(result.data!.expense).toBe(3500000);
  });

  it('filters by search term', async () => {
    const result = await listTransactions({ search: 'Groceries' });
    expect(result.data!.total).toBe(1);
    expect(result.data!.transactions[0].description).toBe('Groceries');
  });

  it('calculates income and expense totals', async () => {
    const result = await listTransactions({ month: 0, year: 2025 });
    expect(result.data!.income).toBe(8500000);
    expect(result.data!.expense).toBe(500000);
  });

  it('returns sorted by date descending', async () => {
    const result = await listTransactions({ month: 0, year: 2025 });
    expect(result.data!.transactions[0].date).toBe('2025-01-20');
    expect(result.data!.transactions[1].date).toBe('2025-01-15');
  });
});

describe('updateTransaction', () => {
  it('updates an existing transaction', async () => {
    const created = await createTransaction({
      date: '2025-01-15',
      description: 'Original',
      category: 'Food',
      type: 'expense',
      amount: 100000,
      paymentMethod: 'Cash',
      notes: '',
    });

    const result = await updateTransaction(created.data!.id, {
      description: 'Updated',
      amount: 200000,
    });

    expect(result.error).toBeUndefined();
    expect(result.data!.description).toBe('Updated');
    expect(result.data!.amount).toBe(200000);
  });

  it('returns NOT_FOUND for nonexistent ID', async () => {
    const result = await updateTransaction('nonexistent', {
      description: 'Test',
    });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});

describe('deleteTransaction', () => {
  it('deletes an existing transaction', async () => {
    const created = await createTransaction({
      date: '2025-01-15',
      description: 'To Delete',
      category: 'Food',
      type: 'expense',
      amount: 100000,
      paymentMethod: 'Cash',
      notes: '',
    });

    const result = await deleteTransaction(created.data!.id);
    expect(result.data).toEqual({ success: true });

    // Verify it's actually gone
    const list = await listTransactions({});
    expect(list.data!.total).toBe(0);
  });

  it('returns NOT_FOUND for nonexistent ID', async () => {
    const result = await deleteTransaction('nonexistent');
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});
