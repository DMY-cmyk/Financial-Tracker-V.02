import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve('src/app/globals.css'), 'utf-8');
const root = css.slice(css.indexOf(':root {'), css.indexOf('.dark {'));
const dark = css.slice(css.indexOf('.dark {'));

describe('Phase 1a — mobile-kit tokens', () => {
  it('defines brand-mint family in :root (light)', () => {
    expect(root).toContain('--brand-mint: #22c97e');
    expect(root).toContain('--brand-mint-foreground: #0f172a');
    expect(root).toContain('--brand-mint-soft: #98e8b8');
    expect(root).toContain('--brand-mint-strong: #16a368');
  });

  it('defines hero + tile tokens in :root', () => {
    expect(root).toContain('--hero-bg: var(--brand-mint)');
    expect(root).toContain('--hero-foreground: var(--brand-mint-foreground)');
    expect(root).toContain('--tile-bg: #c9defe');
    expect(root).toContain('--tile-foreground: #1f4fff');
    expect(root).toContain('--tile-bg-active: #1f4fff');
    expect(root).toContain('--tile-foreground-active: #ffffff');
  });

  it('bumps --radius to 1rem', () => {
    expect(root).toMatch(/--radius:\s*1rem/);
    expect(root).not.toMatch(/--radius:\s*0\.75rem/);
  });

  it('overrides brand-mint + tile in .dark', () => {
    expect(dark).toContain('--brand-mint: #34d399');
    expect(dark).toContain('--brand-mint-foreground: #062b18');
    expect(dark).toContain('--brand-mint-soft: #1f6447');
    expect(dark).toContain('--brand-mint-strong: #0f9b6c');
    expect(dark).toContain('--tile-bg: #1e3a5f');
    expect(dark).toContain('--tile-foreground: #93c5fd');
    expect(dark).toContain('--tile-bg-active: #3b82f6');
  });

  it('exposes tokens in @theme inline (Tailwind utilities)', () => {
    expect(css).toContain('--color-brand-mint: var(--brand-mint)');
    expect(css).toContain('--color-brand-mint-foreground: var(--brand-mint-foreground)');
    expect(css).toContain('--color-brand-mint-soft: var(--brand-mint-soft)');
    expect(css).toContain('--color-brand-mint-strong: var(--brand-mint-strong)');
    expect(css).toContain('--color-hero: var(--hero-bg)');
    expect(css).toContain('--color-hero-foreground: var(--hero-foreground)');
    expect(css).toContain('--color-tile: var(--tile-bg)');
    expect(css).toContain('--color-tile-foreground: var(--tile-foreground)');
    expect(css).toContain('--color-tile-active: var(--tile-bg-active)');
    expect(css).toContain('--color-tile-active-foreground: var(--tile-foreground-active)');
  });
});
