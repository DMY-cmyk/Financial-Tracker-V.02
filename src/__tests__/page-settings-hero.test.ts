import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/settings/page.tsx'), 'utf-8');

describe('Settings page hero mount', () => {
  it('imports HeroHeader', () => {
    expect(src).toMatch(/from\s+['"]@\/components\/layout\/HeroHeader['"]/);
  });
  it('renders <HeroHeader title=', () => {
    expect(src).toMatch(/<HeroHeader[^>]*title=/);
  });
});
