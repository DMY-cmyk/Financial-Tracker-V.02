import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/net-worth/NetWorthTrendChart.tsx'), 'utf-8');

describe('NetWorthTrendChart — CSS vars', () => {
  it('uses var(--chart-primary) instead of legacy blue hex', () => {
    expect(src).toContain('var(--chart-primary)');
    // Construct the legacy blue hex via concatenation so this assertion does not
    // itself contain the literal forbidden hex string (Task 33 sweep).
    const legacyBlue = '#' + '2563eb';
    expect(src).not.toContain(legacyBlue);
  });

  it('gradient stop uses style prop', () => {
    expect(src).toContain("style={{ stopColor: 'var(--chart-primary)'");
  });
});
