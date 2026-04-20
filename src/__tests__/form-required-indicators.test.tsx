// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { RecurringTransactionForm } from '@/features/transactions/RecurringTransactionForm';
import { TransactionForm } from '@/features/transactions/TransactionForm';

vi.mock('@/lib/api/client', () => ({
  api: {
    categories: { list: vi.fn().mockResolvedValue({ data: { categories: [] } }) },
    paymentMethods: { list: vi.fn().mockResolvedValue({ data: { paymentMethods: [] } }) },
    transactions: { list: vi.fn().mockResolvedValue({ data: { transactions: [] } }) },
  },
}));

vi.mock('@/store', () => ({
  useStore: vi.fn(
    (selector: (s: { ui: { selectedMonth: number; selectedYear: number } }) => unknown) =>
      selector({ ui: { selectedMonth: 0, selectedYear: 2024 } })
  ),
}));

afterEach(() => cleanup());

describe('Required field indicators', () => {
  it('RecurringTransactionForm shows asterisk on description label', () => {
    const { container } = render(<RecurringTransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Description')
    );
    expect(label?.querySelector('.text-red-500')).not.toBeNull();
  });

  it('RecurringTransactionForm shows asterisk on amount label', () => {
    const { container } = render(<RecurringTransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Amount')
    );
    expect(label?.querySelector('.text-red-500')).not.toBeNull();
  });

  it('RecurringTransactionForm shows asterisk on category label', () => {
    const { container } = render(<RecurringTransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Category')
    );
    expect(label?.querySelector('.text-red-500')).not.toBeNull();
  });

  it('RecurringTransactionForm shows asterisk on paymentMethod label', () => {
    const { container } = render(<RecurringTransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Payment Method')
    );
    expect(label?.querySelector('.text-red-500')).not.toBeNull();
  });

  it('RecurringTransactionForm shows asterisk on frequency label', () => {
    const { container } = render(<RecurringTransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Frequency')
    );
    expect(label?.querySelector('.text-red-500')).not.toBeNull();
  });

  it('RecurringTransactionForm shows asterisk on startDate label', () => {
    const { container } = render(<RecurringTransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Start Date')
    );
    expect(label?.querySelector('.text-red-500')).not.toBeNull();
  });

  it('RecurringTransactionForm does NOT show asterisk on endDate label', () => {
    const { container } = render(<RecurringTransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('End Date')
    );
    expect(label?.querySelector('.text-red-500')).toBeNull();
  });

  it('RecurringTransactionForm does NOT show asterisk on notes label', () => {
    const { container } = render(<RecurringTransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Notes')
    );
    expect(label?.querySelector('.text-red-500')).toBeNull();
  });

  it('TransactionForm shows asterisk on amount label', () => {
    const { container } = render(<TransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Amount')
    );
    expect(label?.querySelector('.text-red-500')).not.toBeNull();
  });

  it('TransactionForm shows asterisk on date label', () => {
    const { container } = render(<TransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Date')
    );
    expect(label?.querySelector('.text-red-500')).not.toBeNull();
  });

  it('TransactionForm shows asterisk on category label', () => {
    const { container } = render(<TransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Category')
    );
    expect(label?.querySelector('.text-red-500')).not.toBeNull();
  });

  it('TransactionForm shows asterisk on description label', () => {
    const { container } = render(<TransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Description')
    );
    expect(label?.querySelector('.text-red-500')).not.toBeNull();
  });

  it('TransactionForm shows asterisk on paymentMethod label', () => {
    const { container } = render(<TransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Payment Method')
    );
    expect(label?.querySelector('.text-red-500')).not.toBeNull();
  });

  it('TransactionForm does NOT show asterisk on notes label', () => {
    const { container } = render(<TransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Notes')
    );
    expect(label?.querySelector('.text-red-500')).toBeNull();
  });
});
