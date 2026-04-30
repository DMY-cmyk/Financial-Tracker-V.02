import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/login/page.tsx'), 'utf-8');

describe('/login page composition', () => {
  it('imports EditorialHero and LoginForm', () => {
    expect(src).toContain('EditorialHero');
    expect(src).toContain('LoginForm');
  });

  it('uses 2-column grid on lg+ viewports', () => {
    expect(src).toMatch(/grid-cols-1\s+lg:grid-cols-2/);
  });

  it('removes blue/emerald gradient background', () => {
    expect(src).not.toContain('from-blue-50');
    expect(src).not.toContain('via-white to-emerald-50');
  });

  it('detects ?reason=expired and forwards sessionExpired', () => {
    expect(src).toContain("'expired'");
    expect(src).toContain('sessionExpired');
  });
});
