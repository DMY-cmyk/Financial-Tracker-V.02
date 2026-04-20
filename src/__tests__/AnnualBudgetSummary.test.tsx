// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnnualBudgetSummary } from '@/components/budget/AnnualBudgetSummary';
import type { AnnualBudgetSummaryData } from '@/hooks/useAnnualBudget';

const mockSummary: AnnualBudgetSummaryData = {
  totalAnnualBudget: 24000000,
  totalAnnualSpent: 12000000,
  remainingBudget: 12000000,
  categoriesOnTrack: 3,
  categoriesAtRisk: 1,
  categoriesOver: 0,
};

describe('AnnualBudgetSummary', () => {
  it('renders Annual Summary heading', () => {
    render(<AnnualBudgetSummary summary={mockSummary} locale="en" isLoading={false} />);
    expect(screen.getByText('Annual Summary')).toBeDefined();
  });

  it('renders on-track count', () => {
    render(<AnnualBudgetSummary summary={mockSummary} locale="en" isLoading={false} />);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('renders at-risk count', () => {
    render(<AnnualBudgetSummary summary={mockSummary} locale="en" isLoading={false} />);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('renders loading skeleton when isLoading', () => {
    const { container } = render(
      <AnnualBudgetSummary summary={mockSummary} locale="en" isLoading={true} />
    );
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });
});
