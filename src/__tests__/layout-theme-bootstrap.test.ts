import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('src/app/layout.tsx'), 'utf-8');

describe('layout — first-paint theme bootstrap', () => {
  it('contains an inline <script> reading localStorage theme', () => {
    expect(src).toMatch(/dangerouslySetInnerHTML/);
    expect(src).toContain('localStorage');
    expect(src).toMatch(/classList\.add\(['"]dark['"]\)/);
  });
});
