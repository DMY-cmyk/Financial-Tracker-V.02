// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Tag } from 'lucide-react';
import { CategoryTile } from '@/components/shared/CategoryTile';

afterEach(() => cleanup());

describe('CategoryTile', () => {
  it('renders label + icon', () => {
    render(<CategoryTile label="Food" icon={Tag} />);
    expect(screen.getByText('Food')).toBeTruthy();
  });

  it('renders a button when no href is provided', () => {
    const { container } = render(<CategoryTile label="x" icon={Tag} />);
    expect(container.querySelector('button')).toBeTruthy();
    expect(container.querySelector('a')).toBeNull();
  });

  it('renders an anchor when href is provided', () => {
    const { container } = render(<CategoryTile label="x" icon={Tag} href="/c/food" />);
    expect(container.querySelector('a')).toBeTruthy();
  });

  it('applies active classes when active', () => {
    const { container } = render(<CategoryTile label="x" icon={Tag} active />);
    expect(container.firstElementChild?.className).toContain('bg-tile-active');
  });

  it('sets aria-current="page" on the Link branch when active', () => {
    const { container } = render(<CategoryTile label="x" icon={Tag} active href="/c/x" />);
    expect(container.querySelector('a')?.getAttribute('aria-current')).toBe('page');
  });
});
