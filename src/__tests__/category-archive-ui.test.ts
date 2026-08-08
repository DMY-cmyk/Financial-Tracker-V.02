import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { t } from '@/lib/i18n';

const read = (p: string) => readFileSync(resolve(p), 'utf-8');

describe('category archiving UI wiring', () => {
  it('TransactionForm hides archived categories from the picker', () => {
    expect(read('src/features/transactions/TransactionForm.tsx')).toMatch(
      /categories\.filter\(\(c\) => !c\.archived\)/
    );
  });

  it('RecurringTransactionForm hides archived categories from the picker', () => {
    expect(read('src/features/transactions/RecurringTransactionForm.tsx')).toMatch(
      /categories\.filter\(\(c\) => !c\.archived\)/
    );
  });

  it('settings/categories page exposes the archive toggle', () => {
    const src = read('src/app/settings/categories/page.tsx');
    expect(src).toContain('handleToggleArchive');
    expect(src).toContain('ArchiveRestore');
  });

  it('archive strings exist in both locales', () => {
    for (const key of ['archive', 'unarchive', 'categoryArchived', 'categoryUnarchived'] as const) {
      expect(t('en', key), `EN ${key}`).toBeTruthy();
      expect(t('id', key), `ID ${key}`).toBeTruthy();
      expect(t('en', key)).not.toBe(t('id', key));
    }
  });
});
