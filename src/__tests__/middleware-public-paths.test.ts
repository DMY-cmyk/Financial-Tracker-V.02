import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('middleware.ts'), 'utf-8');

describe('middleware PUBLIC_PATHS', () => {
  for (const p of [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/api/auth',
    '/api/health',
    '/api/cron',
  ]) {
    it(`includes ${p} as a public path`, () => {
      expect(src).toContain(`'${p}'`);
    });
  }
});
