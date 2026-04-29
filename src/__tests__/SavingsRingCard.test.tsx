// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

vi.mock('@/features/savings/useSavingsGoals', () => ({
  useSavingsGoals: () => ({ goals: [] }),
}));
vi.mock('@/features/transactions/useTransactions', () => ({
  useTransactions: () => ({ transactions: [] }),
}));
// Stub recharts so the test environment doesn't need real layout/SVG sizing
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => null,
}));

import { SavingsRingCard } from '@/components/dashboard/SavingsRingCard';

afterEach(() => cleanup());

describe('SavingsRingCard', () => {
  it('renders the savings title', () => {
    render(<SavingsRingCard />);
    expect(screen.getByText('Savings on Goals')).toBeTruthy();
  });

  it('renders empty stats copy when there is no data', () => {
    render(<SavingsRingCard />);
    expect(screen.getAllByText('Not enough data yet.').length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty savings copy when no goals exist', () => {
    render(<SavingsRingCard />);
    expect(screen.getByText('No goals yet. Add one to start tracking.')).toBeTruthy();
  });
});
