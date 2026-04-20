import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/dashboard/CategoryBreakdown.tsx'), 'utf-8');

describe('CategoryBreakdown — accessibility', () => {
  it('wraps chart with role="img"', () => {
    expect(src).toContain('role="img"');
  });

  it('has aria-label on chart wrapper', () => {
    expect(src).toContain('aria-label');
  });
});
