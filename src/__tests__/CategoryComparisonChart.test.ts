import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/insights/CategoryComparisonChart.tsx'), 'utf-8');

describe('CategoryComparisonChart — CSS vars, i18n, aria', () => {
  it('uses var(--chart-primary) instead of #3B82F6', () => {
    expect(src).toContain('var(--chart-primary)');
    expect(src).not.toContain('#3B82F6');
  });

  it('uses var(--chart-muted) instead of #475569', () => {
    expect(src).toContain('var(--chart-muted)');
    expect(src).not.toContain('#475569');
  });

  it('uses t(locale) for thisMonth/lastMonth (no hardcoded strings)', () => {
    expect(src).not.toContain("'This Month'");
    expect(src).not.toContain("'Last Month'");
    expect(src).toContain("'thisMonth'");
    expect(src).toContain("'lastMonth'");
  });

  it('chart has role="img" wrapper', () => {
    expect(src).toContain('role="img"');
  });
});
