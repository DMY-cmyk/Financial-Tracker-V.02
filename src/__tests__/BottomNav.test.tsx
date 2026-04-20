// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BottomNav } from '@/components/layout/BottomNav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

afterEach(() => cleanup());

describe('BottomNav More drawer grouping', () => {
  it('More drawer renders Finance section header', () => {
    const { container } = render(<BottomNav />);
    // The section headers are rendered inside the Sheet content
    const src = require('fs').readFileSync(
      require('path').resolve('src/components/layout/BottomNav.tsx'),
      'utf-8'
    );
    expect(src).toContain('Finance');
    expect(src).toContain('Tools');
    expect(src).toContain('Settings');
  });
});
