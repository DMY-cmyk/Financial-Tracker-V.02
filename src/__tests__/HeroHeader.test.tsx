// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { HeroHeader } from '@/components/layout/HeroHeader';

afterEach(() => cleanup());

describe('HeroHeader', () => {
  it('renders the title', () => {
    render(<HeroHeader title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('wraps content in a lg:hidden container', () => {
    const { container } = render(<HeroHeader title="x" />);
    expect(container.querySelector('.lg\\:hidden')).toBeTruthy();
  });

  it('renders greeting + subgreeting when provided', () => {
    render(<HeroHeader title="x" greeting="Hi" subgreeting="Good Morning" />);
    expect(screen.getByText('Hi')).toBeTruthy();
    expect(screen.getByText('Good Morning')).toBeTruthy();
  });

  it('renders a decorative bell with aria-label by default', () => {
    render(<HeroHeader title="x" />);
    expect(screen.getByLabelText('Notifications')).toBeTruthy();
  });

  it('renders back button only when showBack is true', () => {
    const { rerender } = render(<HeroHeader title="x" />);
    expect(screen.queryByLabelText('Go back')).toBeNull();
    rerender(<HeroHeader title="x" showBack />);
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('renders children below the title row', () => {
    render(
      <HeroHeader title="x">
        <div data-testid="chips">chips</div>
      </HeroHeader>,
    );
    expect(screen.getByTestId('chips')).toBeTruthy();
  });
});
