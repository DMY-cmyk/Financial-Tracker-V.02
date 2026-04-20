import { describe, it, expect } from 'vitest';
import { t } from '@/lib/i18n';

describe('i18n keys — audit fixes', () => {
  it('lastMonth returns correct EN string', () => {
    expect(t('en', 'lastMonth')).toBe('Last Month');
  });

  it('lastMonth returns correct ID string', () => {
    expect(t('id', 'lastMonth')).toBe('Bulan Lalu');
  });

  it('thisMonth still returns correct EN string (regression)', () => {
    expect(t('en', 'thisMonth')).toBe('This Month');
  });
});
