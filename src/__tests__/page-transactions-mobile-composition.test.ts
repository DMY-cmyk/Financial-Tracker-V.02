import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/transactions/page.tsx'), 'utf-8');
const view = readFileSync(resolve('src/features/transactions/AllTransactionsView.tsx'), 'utf-8');

describe('/transactions mobile composition', () => {
  it('mounts PeriodTabs in mobile branch', () => {
    expect(src).toContain('PeriodTabs');
  });
  it('AllTransactionsView mounts TransactionRowMobile under md:hidden', () => {
    expect(view).toContain('TransactionRowMobile');
    expect(view).toMatch(/md:hidden/);
  });
  it('AllTransactionsView accepts a categories prop', () => {
    expect(view).toMatch(/categories\??:/);
  });
});
