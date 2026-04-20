// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { HealthScoreCard } from '@/features/insights/HealthScoreCard';
import type { HealthScore } from '@/lib/api/contracts';

afterEach(() => cleanup());

const mockHealthScore: HealthScore = {
  income: 5000000,
  expense: 3000000,
  savingsRate: 40,
  lastMonthRate: 35,
  rateChange: 5,
};

describe('HealthScoreCard accessibility', () => {
  it('SVG ring has role="img"', () => {
    const { container } = render(<HealthScoreCard healthScore={mockHealthScore} locale="en" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
  });

  it('SVG ring has aria-label containing the savings rate', () => {
    const { container } = render(<HealthScoreCard healthScore={mockHealthScore} locale="en" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toContain('40');
  });

  it('foreground ring circle uses duration-500 (not duration-700)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve('src/features/insights/HealthScoreCard.tsx'),
      'utf-8'
    );
    expect(src).toContain('duration-500');
    expect(src).not.toContain('duration-700');
  });
});
