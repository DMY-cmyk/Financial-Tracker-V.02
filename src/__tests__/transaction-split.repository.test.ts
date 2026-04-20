import { describe, it, expect } from 'vitest';
import type { TransactionSplit, TransactionSplitInput } from '@/lib/types';

describe('TransactionSplit types', () => {
  it('TransactionSplitInput can be constructed', () => {
    const input: TransactionSplitInput = {
      categoryId: 'cat-food',
      category: 'Food',
      amount: 200000,
    };
    expect(input.amount).toBe(200000);
    expect(input.description).toBeUndefined();
  });

  it('TransactionSplit has all required fields', () => {
    const split: TransactionSplit = {
      id: 'split-1',
      transactionId: 'tx-1',
      categoryId: 'cat-food',
      category: 'Food',
      amount: 200000,
      description: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(split.id).toBe('split-1');
  });
});
