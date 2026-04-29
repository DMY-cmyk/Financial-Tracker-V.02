// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { TransactionRowMobile } from '@/components/transactions/TransactionRowMobile';
import type { Transaction, Category } from '@/lib/types';

afterEach(() => cleanup());

const baseTx: Transaction = {
  id: 't1',
  date: '2026-04-15T08:00:00.000Z',
  description: 'Lunch at canteen',
  category: 'Food',
  categoryId: 'c1',
  type: 'expense',
  amount: 25000,
  paymentMethod: 'cash',
  notes: '',
};
const baseCat: Category = {
  id: 'c1',
  name: 'Food',
  type: 'expense',
  color: '#f00',
  icon: 'tag',
  budget: 0,
};

describe('TransactionRowMobile', () => {
  it('renders description and category', () => {
    render(<TransactionRowMobile transaction={baseTx} category={baseCat} />);
    expect(screen.getByText('Lunch at canteen')).toBeTruthy();
    expect(screen.getByText('Food')).toBeTruthy();
  });

  it('uses text-destructive for expense', () => {
    const { container } = render(
      <TransactionRowMobile transaction={baseTx} category={baseCat} />,
    );
    expect(container.querySelector('[data-amount]')!.className).toContain('text-destructive');
  });

  it('uses text-foreground for income', () => {
    const income: Transaction = { ...baseTx, type: 'income' };
    const incomeCat: Category = { ...baseCat, type: 'income' };
    const { container } = render(
      <TransactionRowMobile transaction={income} category={incomeCat} />,
    );
    expect(container.querySelector('[data-amount]')!.className).toContain('text-foreground');
  });

  it('invokes onTap when clicked', () => {
    const onTap = vi.fn();
    const { container } = render(
      <TransactionRowMobile transaction={baseTx} category={baseCat} onTap={onTap} />,
    );
    fireEvent.click(container.firstElementChild as Element);
    expect(onTap).toHaveBeenCalledOnce();
  });
});
