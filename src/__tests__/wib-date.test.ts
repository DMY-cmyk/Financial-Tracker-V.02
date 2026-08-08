import { describe, expect, it } from 'vitest';
import { todayInWIB } from '@/lib/wib-date';

describe('todayInWIB', () => {
  it('returns the WIB calendar date even when UTC is the previous day', () => {
    // 2026-05-28 18:00 UTC = 2026-05-29 01:00 WIB → must report May 29, not May 28
    const nearMidnightWIB = new Date('2026-05-28T18:00:00Z');
    expect(todayInWIB(nearMidnightWIB)).toBe('2026-05-29');
  });

  it('returns the same date as UTC when offset does not cross a day boundary', () => {
    // 2026-05-28 10:00 UTC = 2026-05-28 17:00 WIB → still May 28
    const midDayUTC = new Date('2026-05-28T10:00:00Z');
    expect(todayInWIB(midDayUTC)).toBe('2026-05-28');
  });

  it('zero-pads single-digit months and days', () => {
    const earlyJan = new Date('2026-01-01T00:00:00Z'); // 07:00 WIB
    expect(todayInWIB(earlyJan)).toBe('2026-01-01');
  });
});
