// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AnnualBudgetGrid } from '@/components/budget/AnnualBudgetGrid';
import type { AnnualBudgetRow } from '@/hooks/useAnnualBudget';

afterEach(() => {
  cleanup();
});

const mockRow: AnnualBudgetRow = {
  category: {
    id: 'cat-1',
    name: 'Food',
    type: 'expense',
    color: '#D97706',
    icon: 'utensils',
    budget: 1800000,
  },
  cells: Array.from({ length: 12 }, (_, m) => ({
    month: m,
    effectiveBudget: 1800000,
    hasOverride: false,
    spent: 0,
    percentage: 0,
  })),
  annualTotal: 21600000,
  annualSpent: 0,
};

const defaultProps = {
  rows: [mockRow],
  monthlyTotals: Array(12).fill(1800000),
  currentMonth: 3,
  currentYear: 2026,
  locale: 'en' as const,
  onSave: vi.fn().mockResolvedValue(true),
  onClear: vi.fn().mockResolvedValue(true),
  isLoading: false,
};

describe('AnnualBudgetGrid', () => {
  it('renders category name in the grid', () => {
    render(<AnnualBudgetGrid {...defaultProps} />);
    expect(screen.getByText('Food')).toBeDefined();
  });

  it('renders Jan and Dec month abbreviations in the header', () => {
    render(<AnnualBudgetGrid {...defaultProps} />);
    expect(screen.getByText('Jan')).toBeDefined();
    expect(screen.getByText('Dec')).toBeDefined();
  });

  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(<AnnualBudgetGrid {...defaultProps} isLoading={true} />);
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });
});
