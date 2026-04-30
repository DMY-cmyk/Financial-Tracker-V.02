import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/register/page.tsx'), 'utf-8');

describe('/register page composition', () => {
  it('imports EditorialHero and EditorialField', () => {
    expect(src).toContain('EditorialHero');
    expect(src).toContain('EditorialField');
  });

  it('uses 2-column grid on lg+ viewports', () => {
    expect(src).toContain('grid-cols-1');
    expect(src).toContain('lg:grid-cols-2');
  });

  it('removes blue/emerald gradient background', () => {
    expect(src).not.toContain('from-blue-50');
    expect(src).not.toContain('via-white to-emerald-50');
  });
});
