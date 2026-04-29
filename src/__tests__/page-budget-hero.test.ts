import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/budget/page.tsx'), 'utf-8');

describe('Budget page hero mount', () => {
  it('imports HeroHeader', () => {
    expect(src).toMatch(/from\s+['"]@\/components\/layout\/HeroHeader['"]/);
  });
  it('renders <HeroHeader title=', () => {
    expect(src).toMatch(/<HeroHeader[^>]*title=/);
  });
});
