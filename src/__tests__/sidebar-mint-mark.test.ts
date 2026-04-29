import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve('src/components/layout/Sidebar.tsx'), 'utf-8');
describe('Sidebar brand mark', () => {
  it('uses bg-brand-mint and text-brand-mint-foreground on the brand mark', () => {
    // The brand mark wrapper should be mint, not primary blue.
    expect(src).toMatch(/className=["'][^"']*bg-brand-mint[^"']*text-brand-mint-foreground[^"']*["']/);
  });
  it('does not paint the brand mark wrapper with bg-primary', () => {
    // Specifically the brand mark <div> wrapping the FT span — find the literal FT label
    // and walk back to the nearest className.
    const idx = src.indexOf('>FT<');
    expect(idx).toBeGreaterThan(-1);
    const before = src.slice(Math.max(0, idx - 400), idx);
    // The wrapper around the FT span should NOT include `bg-primary`
    // (and the span itself should NOT carry text-primary-foreground anymore).
    expect(before).not.toMatch(/bg-primary[^-]/);
  });
});
