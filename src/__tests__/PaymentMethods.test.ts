import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/features/dashboard/PaymentMethods.tsx'), 'utf-8');

describe('PaymentMethods — CSS palette', () => {
  it('does not contain METHOD_COLORS hardcoded object', () => {
    expect(src).not.toContain('METHOD_COLORS');
  });

  it('uses var(--chart-color-1) from the palette', () => {
    expect(src).toContain('var(--chart-color-1)');
  });

  it('assigns color by index with modulo', () => {
    expect(src).toContain('% PALETTE.length');
  });
});
