import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve('src/components/layout/MobileNav.tsx'), 'utf-8');
describe('MobileNav drawer accent', () => {
  it('contains a thin mint accent strip', () => {
    expect(src).toMatch(/h-1[^"]*bg-brand-mint|bg-brand-mint[^"]*h-1/);
  });
});
