import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve('src/app/globals.css'), 'utf-8');

describe('CSS color tokens', () => {
  it('defines semantic chart vars in :root', () => {
    expect(css).toContain('--chart-income:');
    expect(css).toContain('--chart-expense:');
    expect(css).toContain('--chart-primary:');
    expect(css).toContain('--chart-muted:');
    expect(css).toContain('--chart-grid:');
  });

  it('defines palette vars in :root', () => {
    expect(css).toContain('--chart-color-1:');
    expect(css).toContain('--chart-color-6:');
  });

  it('overrides semantic vars in .dark', () => {
    const darkSection = css.slice(css.indexOf('.dark {'));
    expect(darkSection).toContain('--chart-income:');
    expect(darkSection).toContain('--chart-expense:');
  });

  it('overrides palette vars in .dark', () => {
    const darkSection = css.slice(css.indexOf('.dark {'));
    expect(darkSection).toContain('--chart-color-1:');
  });
});
