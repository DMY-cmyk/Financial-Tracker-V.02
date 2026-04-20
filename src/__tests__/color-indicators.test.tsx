// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BiggestTransactionsCard } from '@/features/insights/BiggestTransactionsCard';
import type { BiggestTransaction } from '@/lib/api/contracts';

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
