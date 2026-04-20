import { describe, it, expect } from 'vitest';
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
  dashboardSummaryQuerySchema,
  createCategorySchema,
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  updateSettingsSchema,
  createUploadSchema,
  createExportJobSchema,
  transactionSplitInputSchema,
  createTransactionWithSplitsSchema,
} from '@/lib/api/validation';

describe('createTransactionSchema', () => {
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
      date: '15-01-2026',
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
      categoryId: validInput.categoryId,
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
      year: 2026,
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
      year: 2026,
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

describe('listTransactionsQuerySchema — sortOrder', () => {
  it('accepts asc', () => {
    const r = listTransactionsQuerySchema.safeParse({ sortOrder: 'asc' });
    expect(r.success).toBe(true);
    expect(r.data?.sortOrder).toBe('asc');
  });

  it('accepts desc', () => {
    const r = listTransactionsQuerySchema.safeParse({ sortOrder: 'desc' });
    expect(r.success).toBe(true);
  });

  it('rejects invalid value', () => {
    const r = listTransactionsQuerySchema.safeParse({ sortOrder: 'random' });
    expect(r.success).toBe(false);
  });

  it('is optional — defaults to undefined when omitted', () => {
    const r = listTransactionsQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    expect(r.data?.sortOrder).toBeUndefined();
  });
});

describe('dashboardSummaryQuerySchema', () => {
  it('accepts valid month and year', () => {
    const result = dashboardSummaryQuerySchema.safeParse({
      month: 5,
      year: 2026,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing month', () => {
    const result = dashboardSummaryQuerySchema.safeParse({
      year: 2026,
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

describe('createCategorySchema', () => {
  it('accepts valid input', () => {
    const result = createCategorySchema.safeParse({
      name: 'Food',
      type: 'expense',
      color: '#F59E0B',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.icon).toBe('circle');
      expect(result.data.budget).toBe(0);
    }
  });

  it('rejects empty name', () => {
    expect(
      createCategorySchema.safeParse({ name: '', type: 'expense', color: '#000' }).success
    ).toBe(false);
  });

  it('rejects invalid type', () => {
    expect(
      createCategorySchema.safeParse({ name: 'X', type: 'transfer', color: '#000' }).success
    ).toBe(false);
  });
});

describe('createPaymentMethodSchema', () => {
  it('accepts valid input', () => {
    const result = createPaymentMethodSchema.safeParse({
      name: 'Bank BCA',
      type: 'bank',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.icon).toBe('initials');
  });

  it('rejects invalid type', () => {
    expect(createPaymentMethodSchema.safeParse({ name: 'X', type: 'crypto' }).success).toBe(false);
  });

  it('defaults beginningBalance to 0 when omitted', () => {
    const result = createPaymentMethodSchema.safeParse({ name: 'BCA', type: 'bank' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.beginningBalance).toBe(0);
  });

  it('accepts explicit beginningBalance', () => {
    const result = createPaymentMethodSchema.safeParse({
      name: 'BCA',
      type: 'bank',
      beginningBalance: 5000000,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.beginningBalance).toBe(5000000);
  });
});

describe('updatePaymentMethodSchema with beginningBalance', () => {
  it('accepts partial beginningBalance update', () => {
    const result = updatePaymentMethodSchema.safeParse({ beginningBalance: 1000 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.beginningBalance).toBe(1000);
  });

  it('accepts negative beginningBalance', () => {
    const result = updatePaymentMethodSchema.safeParse({ beginningBalance: -500000 });
    expect(result.success).toBe(true);
  });
});

describe('updateSettingsSchema', () => {
  it('accepts string record', () => {
    const result = updateSettingsSchema.safeParse({ theme: 'dark', locale: 'id' });
    expect(result.success).toBe(true);
  });

  it('rejects empty object', () => {
    expect(updateSettingsSchema.safeParse({}).success).toBe(false);
  });
});

describe('createUploadSchema', () => {
  it('accepts valid input', () => {
    const result = createUploadSchema.safeParse({ filename: 'receipt.jpg' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fileSize).toBe(0);
      expect(result.data.mimeType).toBe('');
    }
  });

  it('rejects empty filename', () => {
    expect(createUploadSchema.safeParse({ filename: '' }).success).toBe(false);
  });
});

describe('createExportJobSchema', () => {
  it('accepts valid input', () => {
    const result = createExportJobSchema.safeParse({ format: 'csv', scope: 'current' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid format', () => {
    expect(createExportJobSchema.safeParse({ format: 'docx', scope: 'current' }).success).toBe(
      false
    );
  });

  it('rejects invalid scope', () => {
    expect(createExportJobSchema.safeParse({ format: 'csv', scope: 'monthly' }).success).toBe(
      false
    );
  });
});

describe('listTransactionsQuerySchema — advanced filters', () => {
  it('accepts amountMin and amountMax when min <= max', () => {
    const result = listTransactionsQuerySchema.safeParse({
      amountMin: '100000',
      amountMax: '500000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountMin).toBe(100000);
      expect(result.data.amountMax).toBe(500000);
    }
  });

  it('rejects when amountMin > amountMax', () => {
    const result = listTransactionsQuerySchema.safeParse({
      amountMin: '600000',
      amountMax: '500000',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when only dateFrom is provided without dateTo', () => {
    const result = listTransactionsQuerySchema.safeParse({
      dateFrom: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('accepts dateFrom + dateTo together', () => {
    const result = listTransactionsQuerySchema.safeParse({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });
    expect(result.success).toBe(true);
  });

  it('accepts amountMin alone without amountMax', () => {
    const result = listTransactionsQuerySchema.safeParse({ amountMin: '100000' });
    expect(result.success).toBe(true);
  });

  it('accepts amountMax alone without amountMin', () => {
    const result = listTransactionsQuerySchema.safeParse({ amountMax: '500000' });
    expect(result.success).toBe(true);
  });

  it('rejects when only dateTo is provided without dateFrom', () => {
    const result = listTransactionsQuerySchema.safeParse({ dateTo: '2026-01-31' });
    expect(result.success).toBe(false);
  });

  it('rejects when dateFrom is after dateTo', () => {
    const result = listTransactionsQuerySchema.safeParse({
      dateFrom: '2026-03-01',
      dateTo: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });
});

describe('transactionSplitInputSchema', () => {
  it('accepts valid split line', () => {
    const result = transactionSplitInputSchema.safeParse({
      categoryId: 'cat-food',
      category: 'Food',
      amount: 200000,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null categoryId', () => {
    const result = transactionSplitInputSchema.safeParse({
      categoryId: null,
      category: 'Food',
      amount: 200000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty category string', () => {
    const result = transactionSplitInputSchema.safeParse({
      categoryId: null,
      category: '',
      amount: 200000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero amount', () => {
    const result = transactionSplitInputSchema.safeParse({
      categoryId: 'cat-food',
      category: 'Food',
      amount: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('createTransactionWithSplitsSchema', () => {
  const base = {
    date: '2026-01-15',
    description: 'Test',
    type: 'expense' as const,
    amount: 500000,
    paymentMethod: 'Cash',
  };

  it('accepts request with splits (no category required)', () => {
    const result = createTransactionWithSplitsSchema.safeParse({
      ...base,
      splits: [
        { categoryId: 'cat-food', category: 'Food', amount: 300000 },
        { categoryId: 'cat-home', category: 'Household', amount: 200000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('requires category when no splits', () => {
    const result = createTransactionWithSplitsSchema.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('category');
    }
  });

  it('rejects splits array with only one item', () => {
    const result = createTransactionWithSplitsSchema.safeParse({
      ...base,
      splits: [{ categoryId: 'cat-food', category: 'Food', amount: 500000 }],
    });
    expect(result.success).toBe(false);
  });
});
