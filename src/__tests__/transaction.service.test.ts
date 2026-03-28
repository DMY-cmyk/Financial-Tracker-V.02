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
    date: '2026-01-15',
    description: 'Monthly Salary',
    category: 'Salary',
    categoryId: 'cat-salary-001',
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
      date: '2026-01-15',
      description: 'Salary',
      category: 'Salary',
      categoryId: 'cat-salary',
      type: 'income',
      amount: 8500000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-20',
      description: 'Groceries',
      category: 'Food',
      categoryId: 'cat-food',
      type: 'expense',
      amount: 500000,
      paymentMethod: 'Cash',
      notes: '',
    });
    await createTransaction({
      date: '2026-02-10',
      description: 'Rent',
      category: 'Utilities',
      categoryId: 'cat-utilities',
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
    const result = await listTransactions({ month: 0, year: 2026 });
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
    const result = await listTransactions({ month: 0, year: 2026 });
    expect(result.data!.income).toBe(8500000);
    expect(result.data!.expense).toBe(500000);
  });

  it('returns sorted by date descending', async () => {
    const result = await listTransactions({ month: 0, year: 2026 });
    expect(result.data!.transactions[0].date).toBe('2026-01-20');
    expect(result.data!.transactions[1].date).toBe('2026-01-15');
  });
});

describe('updateTransaction', () => {
  it('updates an existing transaction', async () => {
    const created = await createTransaction({
      date: '2026-01-15',
      description: 'Original',
      category: 'Food',
      categoryId: 'cat-food',
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
      date: '2026-01-15',
      description: 'To Delete',
      category: 'Food',
      categoryId: 'cat-food',
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

describe('listTransactions — advanced filters', () => {
  beforeEach(async () => {
    await createTransaction({
      date: '2026-01-15',
      description: 'Groceries',
      category: 'Food',
      categoryId: 'cat-food',
      type: 'expense',
      amount: 150000,
      paymentMethod: 'Cash',
      notes: 'Weekly market run',
    });
    await createTransaction({
      date: '2026-01-20',
      description: 'Electricity Bill',
      category: 'Utilities',
      categoryId: 'cat-utilities',
      type: 'expense',
      amount: 500000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
    await createTransaction({
      date: '2026-02-05',
      description: 'Salary',
      category: 'Income',
      categoryId: 'cat-salary',
      type: 'income',
      amount: 8500000,
      paymentMethod: 'Bank BCA',
      notes: '',
    });
  });

  it('filters by amount range — returns only transactions within range', async () => {
    const result = await listTransactions({ amountMin: '100000', amountMax: '600000' });
    expect(result.error).toBeUndefined();
    expect(result.data!.transactions).toHaveLength(2);
    expect(
      result.data!.transactions.every((tx) => tx.amount >= 100000 && tx.amount <= 600000)
    ).toBe(true);
  });

  it('filters by multi-category — returns transactions for all selected categories', async () => {
    const result = await listTransactions({ categories: 'cat-food,cat-utilities' });
    expect(result.error).toBeUndefined();
    expect(result.data!.transactions).toHaveLength(2);
    const ids = result.data!.transactions.map((tx) => tx.categoryId);
    expect(ids).toContain('cat-food');
    expect(ids).toContain('cat-utilities');
  });

  it('filters by date range — overrides month/year when both provided', async () => {
    // month=1 (Feb, 0-indexed) + year=2026 would restrict to Feb transactions only,
    // but dateFrom+dateTo for Jan should override and return Jan transactions
    const result = await listTransactions({
      month: 1,
      year: 2026,
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });
    expect(result.error).toBeUndefined();
    expect(result.data!.transactions.every((tx) => tx.date.startsWith('2026-01'))).toBe(true);
    expect(result.data!.transactions).toHaveLength(2);
  });

  it('includeNotes=true — matches keyword in notes field', async () => {
    const result = await listTransactions({ search: 'market', includeNotes: 'true' });
    expect(result.error).toBeUndefined();
    expect(result.data!.transactions).toHaveLength(1);
    expect(result.data!.transactions[0].description).toBe('Groceries');
  });

  it('includeNotes not set — does NOT match keyword found only in notes', async () => {
    const result = await listTransactions({ search: 'market' });
    expect(result.error).toBeUndefined();
    expect(result.data!.transactions).toHaveLength(0);
  });
});

describe('listTransactions — sortOrder', () => {
  beforeEach(async () => {
    await createTransaction({
      date: '2026-01-10',
      description: 'Oldest',
      category: 'A',
      categoryId: 'c1',
      type: 'income',
      amount: 100000,
      paymentMethod: 'BCA',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-20',
      description: 'Middle',
      category: 'A',
      categoryId: 'c1',
      type: 'income',
      amount: 200000,
      paymentMethod: 'BCA',
      notes: '',
    });
    await createTransaction({
      date: '2026-01-30',
      description: 'Newest',
      category: 'A',
      categoryId: 'c1',
      type: 'income',
      amount: 300000,
      paymentMethod: 'BCA',
      notes: '',
    });
  });

  it('defaults to newest first (desc)', async () => {
    const r = await listTransactions({});
    expect(r.data!.transactions[0].description).toBe('Newest');
    expect(r.data!.transactions[2].description).toBe('Oldest');
  });

  it('sortOrder asc returns oldest first', async () => {
    const r = await listTransactions({ sortOrder: 'asc' });
    expect(r.data!.transactions[0].description).toBe('Oldest');
    expect(r.data!.transactions[2].description).toBe('Newest');
  });

  it('sortOrder desc explicitly returns newest first', async () => {
    const r = await listTransactions({ sortOrder: 'desc' });
    expect(r.data!.transactions[0].description).toBe('Newest');
  });
});
