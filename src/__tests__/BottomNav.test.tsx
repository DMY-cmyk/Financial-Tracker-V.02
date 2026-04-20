// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { BottomNav } from '@/components/layout/BottomNav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

const src = readFileSync(resolve('src/components/layout/BottomNav.tsx'), 'utf-8');

afterEach(() => cleanup());

describe('BottomNav More drawer grouping', () => {
  it('uses i18n keys for section headers (not hardcoded strings)', () => {
    expect(src).toContain('groupFinance');
    expect(src).toContain('groupTools');
    expect(src).toContain('groupSettings');
  });

  it('renders BottomNav without crashing', () => {
    render(<BottomNav />);
    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
