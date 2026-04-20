import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/net-worth/NetWorthTrendChart.tsx'), 'utf-8');

describe('NetWorthTrendChart — CSS vars', () => {
  it('uses var(--chart-primary) instead of #2563eb', () => {
    expect(src).toContain('var(--chart-primary)');
    expect(src).not.toContain('#2563eb');
  });

  it('gradient stop uses style prop', () => {
    expect(src).toContain("style={{ stopColor: 'var(--chart-primary)'");
  });
});
