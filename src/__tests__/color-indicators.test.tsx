// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BiggestTransactionsCard } from '@/features/insights/BiggestTransactionsCard';
import { OutlierAlerts } from '@/features/insights/OutlierAlerts';
import type { BiggestTransaction, SpendingOutlier } from '@/lib/api/contracts';

afterEach(() => cleanup());

const mockTransactions: BiggestTransaction[] = [
  {
    id: '1',
    description: 'Grocery shopping',
    category: 'Food',
    date: '2026-04-10',
    amount: 350000,
    color: '#F59E0B',
    paymentMethod: 'Cash',
  },
];

describe('BiggestTransactionsCard — color indicator accessibility', () => {
  it('category color dot has aria-hidden="true"', () => {
    const { container } = render(
      <BiggestTransactionsCard transactions={mockTransactions} locale="en" />
    );
    const dot = container.querySelector('[style*="background"]');
    expect(dot?.getAttribute('aria-hidden')).toBe('true');
  });

  it('amount has minus prefix for expense', () => {
    const { container } = render(
      <BiggestTransactionsCard transactions={mockTransactions} locale="en" />
    );
    const amountEl = container.querySelector('.font-mono');
    expect(amountEl?.textContent).toMatch(/^-/);
  });
});

describe('OutlierAlerts — amount formatting', () => {
  it('OutlierAlerts amount has minus prefix', () => {
    const mockOutlier: SpendingOutlier[] = [
      {
        id: '1',
        description: 'Expensive dinner',
        amount: 750000,
        date: '2026-04-15',
        category: 'Food',
        color: '#F59E0B',
        categoryAvg: 200000,
        delta: 550000,
        multiplier: 3.75,
      },
    ];
    const { container } = render(<OutlierAlerts outliers={mockOutlier} locale="en" />);
    const amountEl = container.querySelector('.font-mono');
    expect(amountEl?.textContent).toMatch(/^-/);
  });
});
