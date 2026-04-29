import { describe, it, expect } from 'vitest';
import { t } from '@/lib/i18n';

describe('Phase 1b i18n keys', () => {
  const keys = [
    'navAdd',
    'fabAddIncome',
    'fabAddExpense',
    'fabScanReceipt',
    'heroBellAria',
    'heroBackAria',
  ] as const;

  it.each(keys)('returns non-empty EN value for %s', (k) => {
    const v = t('en', k);
    expect(v).toBeTruthy();
    expect(v).not.toBe(k);
  });

  it.each(keys)('returns non-empty ID value for %s', (k) => {
    const v = t('id', k);
    expect(v).toBeTruthy();
    expect(v).not.toBe(k);
  });
});
