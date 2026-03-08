import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, initializeStore } from '@/server/db/store';
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/server/services/transaction.service';

beforeEach(() => {
  resetStore();
  // Mark as initialized with empty data so ensureSeeded() won't load sample data
  initializeStore({
    transactions: [],
    categories: [],
    paymentMethods: [],
    bills: [],
    savingsGoals: [],
  });
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

  it('creates a transaction with valid input', () => {
    const result = createTransaction(validInput);
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBeDefined();
    expect(result.data!.amount).toBe(8500000);
    expect(result.data!.description).toBe('Monthly Salary');
  });

  it('returns validation error for invalid input', () => {
    const result = createTransaction({
      ...validInput,
      amount: -100,
    });
    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for missing fields', () => {
    const result = createTransaction({});
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('listTransactions', () => {
  beforeEach(() => {
    // Create some test transactions
    createTransaction({
      date: '2025-01-15',
      description: 'Salary',
      category: 'Salary',
      type: 'income',
      amount: 8500000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    createTransaction({
      date: '2025-01-20',
      description: 'Groceries',
      category: 'Food',
      type: 'expense',
      amount: 500000,
      paymentMethod: 'Cash',
      notes: '',
    });
    createTransaction({
      date: '2025-02-10',
      description: 'Rent',
      category: 'Utilities',
      type: 'expense',
      amount: 3000000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
  });

  it('returns all transactions without filters', () => {
    const result = listTransactions({});
    expect(result.data).toBeDefined();
    expect(result.data!.total).toBe(3);
  });

  it('filters by month and year', () => {
    const result = listTransactions({ month: 0, year: 2025 });
    expect(result.data!.total).toBe(2);
  });

  it('filters by type', () => {
    const result = listTransactions({ type: 'expense' });
    expect(result.data!.total).toBe(2);
    expect(result.data!.expense).toBe(3500000);
  });

  it('filters by search term', () => {
    const result = listTransactions({ search: 'Groceries' });
    expect(result.data!.total).toBe(1);
    expect(result.data!.transactions[0].description).toBe('Groceries');
  });

  it('calculates income and expense totals', () => {
    const result = listTransactions({ month: 0, year: 2025 });
    expect(result.data!.income).toBe(8500000);
    expect(result.data!.expense).toBe(500000);
  });

  it('returns sorted by date descending', () => {
    const result = listTransactions({ month: 0, year: 2025 });
    expect(result.data!.transactions[0].date).toBe('2025-01-20');
    expect(result.data!.transactions[1].date).toBe('2025-01-15');
  });
});

describe('updateTransaction', () => {
  it('updates an existing transaction', () => {
    const created = createTransaction({
      date: '2025-01-15',
      description: 'Original',
      category: 'Food',
      type: 'expense',
      amount: 100000,
      paymentMethod: 'Cash',
      notes: '',
    });

    const result = updateTransaction(created.data!.id, {
      description: 'Updated',
      amount: 200000,
    });

    expect(result.error).toBeUndefined();
    expect(result.data!.description).toBe('Updated');
    expect(result.data!.amount).toBe(200000);
  });

  it('returns NOT_FOUND for nonexistent ID', () => {
    const result = updateTransaction('nonexistent', {
      description: 'Test',
    });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});

describe('deleteTransaction', () => {
  it('deletes an existing transaction', () => {
    const created = createTransaction({
      date: '2025-01-15',
      description: 'To Delete',
      category: 'Food',
      type: 'expense',
      amount: 100000,
      paymentMethod: 'Cash',
      notes: '',
    });

    const result = deleteTransaction(created.data!.id);
    expect(result.data).toEqual({ success: true });

    // Verify it's actually gone
    const list = listTransactions({});
    expect(list.data!.total).toBe(0);
  });

  it('returns NOT_FOUND for nonexistent ID', () => {
    const result = deleteTransaction('nonexistent');
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});
