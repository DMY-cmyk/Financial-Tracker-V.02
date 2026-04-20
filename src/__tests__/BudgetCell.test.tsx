// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BudgetCell } from '@/components/budget/BudgetCell';

afterEach(() => {
  cleanup();
});

const defaultProps = {
  month: 3,
  effectiveBudget: 1800000,
  hasOverride: false,
  spent: 900000,
  percentage: 50,
  isPast: false,
  isCurrent: false,
  locale: 'en' as const,
  onSave: vi.fn().mockResolvedValue(true),
  onClear: vi.fn().mockResolvedValue(true),
};

describe('BudgetCell', () => {
  it('renders budget amount in compact format', () => {
    render(<BudgetCell {...defaultProps} />);
    expect(screen.getByText('1.8M')).toBeDefined();
  });

  it('shows inherited label when hasOverride=false and effectiveBudget > 0', () => {
    render(<BudgetCell {...defaultProps} hasOverride={false} />);
    expect(screen.getByText('inherited')).toBeDefined();
  });

  it('does not show inherited label when hasOverride=true', () => {
    render(<BudgetCell {...defaultProps} hasOverride={true} />);
    expect(screen.queryByText('inherited')).toBeNull();
  });

  it('clicking the cell enters edit mode showing a number input', () => {
    const { container } = render(<BudgetCell {...defaultProps} />);
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    fireEvent.click(button!);
    expect(screen.getByRole('spinbutton')).toBeDefined();
  });

  it('edit mode shows Save and Clear buttons', () => {
    const { container } = render(<BudgetCell {...defaultProps} />);
    const button = container.querySelector('button');
    fireEvent.click(button!);
    expect(screen.getByText('Save')).toBeDefined();
    expect(screen.getByText('Clear')).toBeDefined();
  });

  it('applies opacity-70 class when isPast=true', () => {
    const { container } = render(<BudgetCell {...defaultProps} isPast={true} />);
    const root = container.firstChild as HTMLElement;
    expect(root.classList.contains('opacity-70')).toBe(true);
  });
});
