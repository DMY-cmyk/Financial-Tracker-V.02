import { describe, expect, it } from 'vitest';
import {
  createTransactionSchema,
  createBillSchema,
  createSavingsGoalSchema,
  createCategorySchema,
  upsertMonthlyBudgetSchema,
} from '@/lib/api/validation';

describe('IDR money fields must be whole rupiah', () => {
  const base = {
    date: '2026-05-28',
    description: 'x',
    category: 'c',
    categoryId: 'c1',
    type: 'expense' as const,
    paymentMethod: 'BCA',
  };

  it('rejects fractional transaction amounts', () => {
    const result = createTransactionSchema.safeParse({ ...base, amount: 100.5 });
    expect(result.success).toBe(false);
  });

  it('accepts whole-rupiah transaction amounts', () => {
    const result = createTransactionSchema.safeParse({ ...base, amount: 100000 });
    expect(result.success).toBe(true);
  });

  it('rejects fractional bill amounts', () => {
    const result = createBillSchema.safeParse({
      name: 'Internet',
      amount: 350000.01,
      dueDate: 15,
      month: 5,
      year: 2026,
    });
    expect(result.success).toBe(false);
  });

  it('rejects fractional savings target/saved amounts', () => {
    const result = createSavingsGoalSchema.safeParse({
      name: 'Trip',
      targetAmount: 5000000.5,
      color: '#10B981',
    });
    expect(result.success).toBe(false);
  });

  it('rejects fractional category budgets', () => {
    const result = createCategorySchema.safeParse({
      name: 'Food',
      type: 'expense',
      color: '#10B981',
      budget: 1500000.25,
    });
    expect(result.success).toBe(false);
  });

  it('rejects fractional monthly budget amounts', () => {
    const result = upsertMonthlyBudgetSchema.safeParse({
      categoryId: 'c1',
      month: 5,
      year: 2026,
      budgetAmount: 1500000.5,
    });
    expect(result.success).toBe(false);
  });
});
