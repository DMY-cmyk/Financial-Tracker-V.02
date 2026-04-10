import { describe, it, expect } from 'vitest';
import { computeInitials } from '@/lib/payment-method-icon-utils';

describe('computeInitials', () => {
  // Single words: take first 3 chars uppercase
  it('"BCA" → "BCA"', () => expect(computeInitials('BCA')).toBe('BCA'));
  it('"OVO" → "OVO"', () => expect(computeInitials('OVO')).toBe('OVO'));
  it('"DANA" → "DAN"', () => expect(computeInitials('DANA')).toBe('DAN'));
  it('"Mandiri" → "MAN"', () => expect(computeInitials('Mandiri')).toBe('MAN'));
  it('"Cash" → "CAS"', () => expect(computeInitials('Cash')).toBe('CAS'));
  it('"Tunai" → "TUN"', () => expect(computeInitials('Tunai')).toBe('TUN'));
  it('"SeaBank" → "SEA"', () => expect(computeInitials('SeaBank')).toBe('SEA'));
  it('"GoPay" → "GOP"', () => expect(computeInitials('GoPay')).toBe('GOP'));

  // Multi-word: first letter of each word, max 3, uppercase
  it('"CIMB Niaga" → "CN"', () => expect(computeInitials('CIMB Niaga')).toBe('CN'));
  it('"BCA Syariah" → "BS"', () => expect(computeInitials('BCA Syariah')).toBe('BS'));

  // Edge cases
  it('empty string → "?"', () => expect(computeInitials('')).toBe('?'));
  it('whitespace-only → "?"', () => expect(computeInitials('   ')).toBe('?'));
});
