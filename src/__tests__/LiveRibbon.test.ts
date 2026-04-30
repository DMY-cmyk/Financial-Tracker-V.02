import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/components/login/LiveRibbon.tsx'), 'utf-8');

describe('LiveRibbon', () => {
  it('renders an SVG with a path', () => {
    expect(src).toContain('<svg');
    expect(src).toContain('<path');
  });

  it('uses var(--accent-2) for stroke and gradient', () => {
    expect(src).toContain('var(--accent-2)');
  });

  it('applies the ftFlow animation to the dashed stroke', () => {
    expect(src).toContain('ftFlow');
  });
});
