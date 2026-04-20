import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/reports/ForecastChart.tsx'), 'utf-8');

describe('ForecastChart — CSS vars', () => {
  it('uses var(--chart-income) instead of #059669', () => {
    expect(src).toContain('var(--chart-income)');
    expect(src).not.toContain('#059669');
  });

  it('uses var(--chart-expense) instead of #DC2626', () => {
    expect(src).toContain('var(--chart-expense)');
    expect(src).not.toContain('#DC2626');
  });

  it('gradient stops use style prop (not stopColor attribute)', () => {
    expect(src).toContain("style={{ stopColor: 'var(--chart-income)'");
    expect(src).toContain("style={{ stopColor: 'var(--chart-expense)'");
  });
});
