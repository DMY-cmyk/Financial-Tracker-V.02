import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Soft sweep — assert that key amount/date/numeral-rendering files reference
 * the mono font token via either Tailwind's `font-mono`, the CSS
 * `var(--font-mono)` token, or the editorial `ft-mono` utility.
 *
 * This guards against accidental removal of the mono numeral upgrade.
 */
const TARGETS = [
  'src/features/dashboard/CashFlowChart.tsx',
  'src/features/balances/BalanceCard.tsx',
  'src/components/shared/SummaryCard.tsx',
  'src/components/transactions/TransactionRowMobile.tsx',
  'src/features/dashboard/MonthSelector.tsx',
];

describe('amount/date/numeral displays use the mono font token', () => {
  for (const path of TARGETS) {
    const exists = existsSync(resolve(path));
    if (!exists) {
      it.skip(`${path} (not present in repo)`, () => {});
      continue;
    }
    it(`${path} references font-mono / var(--font-mono) / ft-mono`, () => {
      const src = readFileSync(resolve(path), 'utf-8');
      const usesMono =
        src.includes('font-mono') ||
        src.includes('var(--font-mono)') ||
        src.includes('ft-mono');
      expect(usesMono).toBe(true);
    });
  }
});
