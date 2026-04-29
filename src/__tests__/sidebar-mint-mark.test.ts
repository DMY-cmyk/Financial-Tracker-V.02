import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve('src/components/layout/Sidebar.tsx'), 'utf-8');
describe('Sidebar brand mark', () => {
  it('uses text-brand-mint on the brand mark', () => {
    expect(src).toContain('text-brand-mint');
  });
});
