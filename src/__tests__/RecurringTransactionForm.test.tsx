// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { RecurringTransactionForm } from '@/features/transactions/RecurringTransactionForm';

vi.mock('@/lib/api/client', () => ({
  api: {
    categories: { list: vi.fn().mockResolvedValue({ data: { categories: [] } }) },
    paymentMethods: { list: vi.fn().mockResolvedValue({ data: { paymentMethods: [] } }) },
  },
}));

afterEach(() => cleanup());

describe('RecurringTransactionForm — htmlFor accessibility', () => {
  it('description label links to its input via htmlFor', () => {
    const { container } = render(<RecurringTransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Description')
    );
    expect(label?.getAttribute('for')).toBe('rtf-description');
    expect(container.querySelector('#rtf-description')).not.toBeNull();
  });

  it('amount label links to its input via htmlFor', () => {
    const { container } = render(<RecurringTransactionForm onClose={() => {}} />);
    const label = Array.from(container.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Amount')
    );
    expect(label?.getAttribute('for')).toBe('rtf-amount');
    expect(container.querySelector('#rtf-amount')).not.toBeNull();
  });
});
