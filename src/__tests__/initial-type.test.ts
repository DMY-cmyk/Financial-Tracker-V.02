import { describe, it, expect } from 'vitest';
import { resolveInitialType } from '@/features/transactions/initial-type';

describe('resolveInitialType', () => {
  it('accepts income', () => expect(resolveInitialType('income')).toBe('income'));
  it('accepts expense', () => expect(resolveInitialType('expense')).toBe('expense'));
  it('falls back to expense for null/garbage', () => {
    expect(resolveInitialType(null)).toBe('expense');
    expect(resolveInitialType('INCOME')).toBe('expense');
    expect(resolveInitialType('x')).toBe('expense');
  });
});
