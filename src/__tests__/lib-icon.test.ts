import { describe, it, expect } from 'vitest';
import { lucideProps } from '@/lib/icon';

describe('lucideProps', () => {
  it('exports the kit-recommended stroke defaults', () => {
    expect(lucideProps).toEqual({
      strokeWidth: 2.25,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    });
  });
});
