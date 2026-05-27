import { describe, it, expect } from 'vitest';
import { csvCell } from '@/lib/export-utils';

describe('csvCell (CSV formula-injection safety)', () => {
  it('neutralizes leading formula triggers', () => {
    expect(csvCell('=1+1')).toBe('"\'=1+1"');
    expect(csvCell('+SUM(A1)')).toBe('"\'+SUM(A1)"');
    expect(csvCell('-2+3')).toBe('"\'-2+3"');
    expect(csvCell('@cmd')).toBe('"\'@cmd"');
  });

  it('escapes embedded double quotes', () => {
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""');
  });

  it('leaves ordinary text untouched (only wrapped)', () => {
    expect(csvCell('Groceries')).toBe('"Groceries"');
    expect(csvCell('Gaji bulan ini')).toBe('"Gaji bulan ini"');
  });

  it('does not treat a non-leading symbol as a formula', () => {
    expect(csvCell('Rp 1=2')).toBe('"Rp 1=2"');
  });
});
