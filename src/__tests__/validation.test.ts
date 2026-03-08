import { describe, it, expect } from 'vitest';
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
  dashboardSummaryQuerySchema,
} from '@/lib/api/validation';

describe('createTransactionSchema', () => {
  const validInput = {
    date: '2025-01-15',
    description: 'Monthly Salary',
    category: 'Salary',
    type: 'income' as const,
    amount: 8500000,
    paymentMethod: 'Bank BCA',
    notes: '',
  };

  it('accepts valid input', () => {
    const result = createTransactionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(8500000);
      expect(result.data.type).toBe('income');
    }
  });

  it('rejects missing description', () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      description: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      date: '15-01-2025',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero amount', () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid type', () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      type: 'transfer',
    });
    expect(result.success).toBe(false);
  });

  it('defaults notes to empty string when omitted', () => {
    const withoutNotes = {
      date: validInput.date,
      description: validInput.description,
      category: validInput.category,
      type: validInput.type,
      amount: validInput.amount,
      paymentMethod: validInput.paymentMethod,
    };
    const result = createTransactionSchema.safeParse(withoutNotes);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe('');
    }
  });
});

describe('updateTransactionSchema', () => {
  it('accepts partial update', () => {
    const result = updateTransactionSchema.safeParse({
      amount: 5000000,
      description: 'Updated description',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updateTransactionSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('listTransactionsQuerySchema', () => {
  it('accepts valid month and year', () => {
    const result = listTransactionsQuerySchema.safeParse({
      month: 0,
      year: 2025,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty query (all transactions)', () => {
    const result = listTransactionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects month out of range', () => {
    const result = listTransactionsQuerySchema.safeParse({
      month: 12,
      year: 2025,
    });
    expect(result.success).toBe(false);
  });

  it('accepts type filter', () => {
    const result = listTransactionsQuerySchema.safeParse({
      type: 'expense',
    });
    expect(result.success).toBe(true);
  });
});

describe('dashboardSummaryQuerySchema', () => {
  it('accepts valid month and year', () => {
    const result = dashboardSummaryQuerySchema.safeParse({
      month: 5,
      year: 2025,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing month', () => {
    const result = dashboardSummaryQuerySchema.safeParse({
      year: 2025,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing year', () => {
    const result = dashboardSummaryQuerySchema.safeParse({
      month: 5,
    });
    expect(result.success).toBe(false);
  });
});
