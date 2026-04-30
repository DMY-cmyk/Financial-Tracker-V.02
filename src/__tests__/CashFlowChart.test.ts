import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/dashboard/CashFlowChart.tsx'), 'utf-8');

describe('CashFlowChart — CSS vars and accessibility', () => {
  it('uses var(--chart-income) instead of hardcoded #059669', () => {
    expect(src).toContain('var(--chart-income)');
    expect(src).not.toContain('#059669');
  });

  it('uses var(--chart-expense) instead of hardcoded #DC2626', () => {
    expect(src).toContain('var(--chart-expense)');
    expect(src).not.toContain('#DC2626');
  });

  it('includes a Legend component', () => {
    expect(src).toContain('<Legend');
  });

  it('wraps ResponsiveContainer with role="img"', () => {
    expect(src).toContain('role="img"');
  });

  it('tooltip uses itemStyle with monospace font', () => {
    expect(src).toContain('itemStyle');
    expect(src).toContain('var(--font-mono)');
  });
});
