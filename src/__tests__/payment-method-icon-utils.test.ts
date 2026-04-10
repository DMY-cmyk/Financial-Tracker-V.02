import { describe, it, expect } from 'vitest';
import {
  computeInitials,
  suggestIconFromName,
  normalizeIconValue,
} from '@/lib/payment-method-icon-utils';

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
  it('"Bank BRI Syariah" → "BBS"', () => expect(computeInitials('Bank BRI Syariah')).toBe('BBS'));
  it('"Bank Rakyat Indonesia Baru" → "BRI"', () =>
    expect(computeInitials('Bank Rakyat Indonesia Baru')).toBe('BRI'));

  // Edge cases
  it('empty string → "?"', () => expect(computeInitials('')).toBe('?'));
  it('whitespace-only → "?"', () => expect(computeInitials('   ')).toBe('?'));
});

describe('suggestIconFromName', () => {
  it('"BCA Saving" → lucide:landmark', () =>
    expect(suggestIconFromName('BCA Saving')).toBe('lucide:landmark'));
  it('"GoPay Saldo" → lucide:smartphone', () =>
    expect(suggestIconFromName('GoPay Saldo')).toBe('lucide:smartphone'));
  it('"Uang Tunai" → lucide:banknote', () =>
    expect(suggestIconFromName('Uang Tunai')).toBe('lucide:banknote'));
  it('"BCA Credit Card" → lucide:credit-card (highest priority)', () =>
    expect(suggestIconFromName('BCA Credit Card')).toBe('lucide:credit-card'));
  it('"Investasi" → initials (no match)', () =>
    expect(suggestIconFromName('Investasi')).toBe('initials'));
  it('"gopay" → lucide:smartphone (case-insensitive)', () =>
    expect(suggestIconFromName('gopay')).toBe('lucide:smartphone'));
});

describe('normalizeIconValue', () => {
  it("bare 'wallet' → 'lucide:wallet' (legacy row normalization)", () =>
    expect(normalizeIconValue('wallet')).toBe('lucide:wallet'));
  it("'lucide:landmark' → 'lucide:landmark' (already prefixed, unchanged)", () =>
    expect(normalizeIconValue('lucide:landmark')).toBe('lucide:landmark'));
  it("null → 'initials'", () => expect(normalizeIconValue(null)).toBe('initials'));
  it("'' → 'initials'", () => expect(normalizeIconValue('')).toBe('initials'));
  it("'initials' → 'initials' (unchanged)", () =>
    expect(normalizeIconValue('initials')).toBe('initials'));
});
