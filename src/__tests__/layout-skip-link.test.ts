import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/layout.tsx'), 'utf-8');

describe('Skip link classes', () => {
  it('uses focus:absolute (not focus:fixed)', () => {
    expect(src).toContain('focus:absolute');
    expect(src).not.toContain('focus:fixed');
  });

  it('uses focus:z-50 (not focus:z-[100])', () => {
    expect(src).toContain('focus:z-50');
    expect(src).not.toContain('focus:z-[100]');
  });

  it('uses focus:rounded-md (not focus:rounded-lg)', () => {
    expect(src).toContain('focus:rounded-md');
  });
});
