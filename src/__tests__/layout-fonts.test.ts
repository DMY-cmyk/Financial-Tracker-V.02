import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/layout.tsx'), 'utf-8');

describe('layout.tsx — editorial fonts', () => {
  it('imports Geist, Geist_Mono, and Fraunces from next/font/google', () => {
    expect(src).toMatch(/Geist[^a-zA-Z]/);
    expect(src).toContain('Geist_Mono');
    expect(src).toContain('Fraunces');
  });

  it('exposes --font-sans, --font-mono, --font-display CSS variables', () => {
    expect(src).toContain("variable: '--font-sans'");
    expect(src).toContain("variable: '--font-mono'");
    expect(src).toContain("variable: '--font-display'");
  });

  it('does not load Plus_Jakarta_Sans or JetBrains_Mono', () => {
    expect(src).not.toContain('Plus_Jakarta_Sans');
    expect(src).not.toContain('JetBrains_Mono');
  });
});
