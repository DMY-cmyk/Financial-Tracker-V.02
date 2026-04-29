// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { BottomNavFab } from '@/components/layout/BottomNavFab';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

afterEach(() => cleanup());

describe('BottomNavFab', () => {
  it('renders 4 nav links + 1 FAB button (5 slots)', () => {
    const { container } = render(<BottomNavFab />);
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(4); // Home, Tx, Budget, Settings
  });

  it('FAB button uses bg-brand-mint', () => {
    const { container } = render(<BottomNavFab />);
    const fab = container.querySelector('button[data-slot="fab"]')!;
    expect(fab).toBeTruthy();
    expect(fab.className).toContain('bg-brand-mint');
  });

  it('opens the Add sheet with three router links when FAB is tapped', () => {
    render(<BottomNavFab />);
    fireEvent.click(screen.getByLabelText('Add'));
    expect(screen.getByText('Add Income')).toBeTruthy();
    expect(screen.getByText('Add Expense')).toBeTruthy();
    expect(screen.getByText('Scan Receipt')).toBeTruthy();
  });
});
