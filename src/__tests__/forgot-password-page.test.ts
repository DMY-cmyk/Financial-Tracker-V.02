import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/forgot-password/page.tsx'), 'utf-8');

describe('/forgot-password page', () => {
  it('uses EditorialHero + EditorialField', () => {
    expect(src).toContain('EditorialHero');
    expect(src).toContain('EditorialField');
  });
  it('posts to /api/auth/forgot-password', () => {
    expect(src).toContain('/api/auth/forgot-password');
  });
  it('shows confirmation panel after submit', () => {
    expect(src).toMatch(/forgotSent|CHECK YOUR EMAIL/);
  });
});
