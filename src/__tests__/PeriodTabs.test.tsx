// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { PeriodTabs } from '@/components/shared/PeriodTabs';

afterEach(() => cleanup());

describe('PeriodTabs', () => {
  it('renders 3 tabs for variant="three"', () => {
    render(<PeriodTabs variant="three" value="daily" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Daily' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Weekly' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Monthly' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Yearly' })).toBeNull();
  });

  it('renders 4 tabs for variant="four"', () => {
    render(<PeriodTabs variant="four" value="daily" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Yearly' })).toBeTruthy();
  });

  it('marks the active value with aria-selected and bg-brand-mint', () => {
    render(<PeriodTabs variant="three" value="weekly" onChange={() => {}} />);
    const weekly = screen.getByRole('tab', { name: 'Weekly' });
    expect(weekly.getAttribute('aria-selected')).toBe('true');
    expect(weekly.className).toContain('bg-brand-mint');
  });

  it('calls onChange when a different tab is clicked', () => {
    const onChange = vi.fn();
    render(<PeriodTabs variant="four" value="daily" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Yearly' }));
    expect(onChange).toHaveBeenCalledWith('yearly');
  });
});
