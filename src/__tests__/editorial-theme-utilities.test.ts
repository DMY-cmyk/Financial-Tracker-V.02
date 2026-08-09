import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve('src/app/globals.css'), 'utf-8');
const themeBlock = css.slice(css.lastIndexOf('@theme inline {', css.indexOf('--color-background')), css.indexOf(':root {'));

describe('@theme maps editorial palette to Tailwind utilities (E1)', () => {
  const mappings = [
    'paper', 'paper-2', 'ink', 'ink-2', 'ink-3', 'rule', 'rule-soft',
    'card-2', 'accent-2', 'pos', 'pos-soft', 'neg', 'neg-soft', 'warn', 'warn-soft',
  ];
  for (const token of mappings) {
    it(`maps --color-${token} -> var(--${token})`, () => {
      expect(themeBlock).toContain(`--color-${token}: var(--${token})`);
    });
  }
});

describe('legacy semantic tokens point at editorial palette (E1)', () => {
  it('success/warning follow --pos/--warn', () => {
    expect(css).toContain('--success: var(--pos)');
    expect(css).toContain('--warning: var(--warn)');
  });
  it('chart semantic tokens follow editorial palette', () => {
    expect(css).toContain('--chart-income: var(--pos)');
    expect(css).toContain('--chart-expense: var(--neg)');
    expect(css).toContain('--chart-primary: var(--accent)');
    expect(css).toContain('--chart-muted: var(--ink-3)');
    expect(css).toContain('--chart-grid: var(--rule-soft)');
    expect(css).toContain('--chart-color-1: var(--accent)');
  });
});
