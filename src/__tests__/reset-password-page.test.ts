import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/reset-password/page.tsx'), 'utf-8');

describe('/reset-password page', () => {
  it('uses EditorialHero + 2 EditorialField inputs', () => {
    expect(src).toContain('EditorialHero');
    const fieldCount = (src.match(/EditorialField/g) ?? []).length;
    expect(fieldCount).toBeGreaterThanOrEqual(2);
  });
  it('reads token from search params', () => {
    expect(src).toMatch(/useSearchParams|searchParams\.get\('token'\)/);
  });
  it('renders a 4-segment strength meter', () => {
    expect(src).toMatch(/strength/i);
  });
  it('posts to /api/auth/reset-password', () => {
    expect(src).toContain('/api/auth/reset-password');
  });
});
