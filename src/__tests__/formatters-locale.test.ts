import { describe, it, expect } from 'vitest';
import { formatCurrencyShort, formatDateShort } from '@/lib/formatters';
import { getMonthNames } from '@/lib/constants';

describe('formatCurrencyShort', () => {
  it('EN suffixes', () => {
    expect(formatCurrencyShort(12_500_000, 'en')).toBe('Rp 12.5M');
    expect(formatCurrencyShort(950_000, 'en')).toBe('Rp 950K');
    expect(formatCurrencyShort(2_000_000_000, 'en')).toBe('Rp 2.0B');
  });
  it('ID suffixes', () => {
    expect(formatCurrencyShort(12_500_000, 'id')).toBe('Rp 12,5jt');
    expect(formatCurrencyShort(950_000, 'id')).toBe('Rp 950rb');
    expect(formatCurrencyShort(2_000_000_000, 'id')).toBe('Rp 2,0M');
  });
  it('negative amounts are abbreviated too', () => {
    expect(formatCurrencyShort(-1_500_000, 'en')).toBe('-Rp 1.5M');
    expect(formatCurrencyShort(-1_500_000, 'id')).toBe('-Rp 1,5jt');
  });
  it('small values untouched', () => {
    expect(formatCurrencyShort(500, 'en')).toBe('Rp 500');
    expect(formatCurrencyShort(-500, 'id')).toBe('-Rp 500');
  });
});

describe('getMonthNames', () => {
  it('locale-aware', () => {
    expect(getMonthNames('en')[2]).toBe('March');
    expect(getMonthNames('id')[2]).toBe('Maret');
  });
});

describe('formatDateShort', () => {
  it('locale-aware short date', () => {
    // date-fns' id locale abbreviates August as "Agt", not "Agu".
    expect(formatDateShort('2026-08-09', 'en')).toBe('9 Aug');
    expect(formatDateShort('2026-08-09', 'id')).toBe('9 Agt');
  });
});
