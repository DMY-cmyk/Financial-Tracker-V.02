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

describe('globals.css — editorial utility classes', () => {
  it('defines .ft-display, .ft-display-up, .ft-mono, .ft-eyebrow', () => {
    expect(css).toContain('.ft-display ');
    expect(css).toContain('.ft-display-up ');
    expect(css).toContain('.ft-mono ');
    expect(css).toContain('.ft-eyebrow ');
  });

  it('defines .ft-rule and .ft-rule-soft hairlines', () => {
    expect(css).toContain('.ft-rule ');
    expect(css).toContain('.ft-rule-soft ');
  });

  it('defines .ft-live-dot with pulse animation', () => {
    expect(css).toContain('.ft-live-dot');
    expect(css).toMatch(/animation:\s*ftPulseSoft/);
  });
});

describe('globals.css — animations', () => {
  it('defines ftRise, ftFlow, ftPulseSoft, ftMarq, ftBarGrow, ftShimmerBg keyframes', () => {
    expect(css).toContain('@keyframes ftRise');
    expect(css).toContain('@keyframes ftFlow');
    expect(css).toContain('@keyframes ftPulseSoft');
    expect(css).toContain('@keyframes ftMarq');
    expect(css).toContain('@keyframes ftBarGrow');
    expect(css).toContain('@keyframes ftShimmerBg');
  });

  it('defines staggered .ft-rise-1..6 utilities', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(css).toContain(`.ft-rise-${n} `);
    }
  });

  it('honors prefers-reduced-motion', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});
