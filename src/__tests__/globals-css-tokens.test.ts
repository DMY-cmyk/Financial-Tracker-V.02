import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve('src/app/globals.css'), 'utf-8');

describe('globals.css — editorial tokens', () => {
  it('defines paper / ink / rule tokens in :root', () => {
    expect(css).toContain('--paper: #ffffff');
    expect(css).toContain('--ink: #0a0a0a');
    expect(css).toContain('--rule-soft: #e6e6e3');
  });

  it('defines accent #ff5b1f for light theme', () => {
    expect(css).toMatch(/--accent:\s*#ff5b1f/);
  });

  it('defines midnight palette in .dark', () => {
    expect(css).toContain('--paper: #14110d');
    expect(css).toContain('--ink: #f6f1e8');
    expect(css).toMatch(/--accent:\s*#d3b266/);
  });

  it('maps tokens through @theme inline', () => {
    expect(css).toContain('--color-background: var(--paper)');
    expect(css).toContain('--color-foreground: var(--ink)');
    expect(css).toContain('--color-border: var(--rule-soft)');
  });
});
