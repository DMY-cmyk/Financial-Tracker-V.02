import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { TICKER_ROWS, HERO_STATS } from '@/components/login/hero-data';

const src = readFileSync(resolve('src/components/login/MarketTicker.tsx'), 'utf-8');

describe('MarketTicker', () => {
  it('renders a marquee using ftMarq animation', () => {
    expect(src).toContain('ftMarq');
  });

  it('triplicates rows for seamless loop', () => {
    expect(src).toMatch(/\.\.\.\s*rows[\s,]+\.\.\.\s*rows[\s,]+\.\.\.\s*rows/);
  });
});

describe('hero-data', () => {
  it('exposes 6 ticker rows', () => {
    expect(TICKER_ROWS).toHaveLength(6);
    expect(TICKER_ROWS[0]).toHaveProperty('symbol');
  });

  it('exposes hero stats with target numbers', () => {
    expect(HERO_STATS.netWorth).toBeGreaterThan(0);
    expect(HERO_STATS.thisMonth).toBeGreaterThan(0);
    expect(HERO_STATS.categories).toBeGreaterThan(0);
  });
});
