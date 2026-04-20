import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Modal backdrop opacity', () => {
  it('sheet overlay uses bg-black/25', () => {
    const src = readFileSync(resolve('src/components/ui/sheet.tsx'), 'utf-8');
    expect(src).toContain('bg-black/25');
    expect(src).not.toContain('bg-black/10');
  });

  it('alert-dialog overlay uses bg-black/25', () => {
    const src = readFileSync(resolve('src/components/ui/alert-dialog.tsx'), 'utf-8');
    expect(src).toContain('bg-black/25');
    expect(src).not.toContain('bg-black/10');
  });
});
