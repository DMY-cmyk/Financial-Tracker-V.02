import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/page.tsx'), 'utf-8');

describe('Home mobile composition', () => {
  it('uses md:hidden / hidden md:block branching', () => {
    expect(src).toContain('md:hidden');
    expect(src).toMatch(/hidden\s+md:block/);
  });
  it('mounts SavingsRingCard, TransactionRowMobile in mobile branch', () => {
    expect(src).toContain('SavingsRingCard');
    expect(src).toContain('TransactionRowMobile');
  });
  it('passes greeting/subgreeting to HeroHeader', () => {
    expect(src).toMatch(/<HeroHeader[^>]*greeting=/);
    expect(src).toMatch(/<HeroHeader[^>]*subgreeting=/);
  });
});
