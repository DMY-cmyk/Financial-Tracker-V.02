import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve, sep } from 'path';

// Route yang secara sah TIDAK per-user: autentikasi, health probe, cron sistem.
const WHITELIST_SEGMENTS = [`${sep}auth${sep}`, `${sep}cron${sep}`, `${sep}health${sep}`];

function collectRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectRouteFiles(full));
    } else if (entry === 'route.ts') {
      out.push(full);
    }
  }
  return out;
}

describe('every data API route resolves the current user', () => {
  const apiDir = resolve('src/app/api');
  const routes = collectRouteFiles(apiDir).filter(
    (f) => !WHITELIST_SEGMENTS.some((seg) => f.includes(seg))
  );

  it('found a plausible number of data routes', () => {
    expect(routes.length).toBeGreaterThan(20);
  });

  for (const file of routes) {
    it(`${file.split(`${sep}api${sep}`)[1]} calls requireUserId`, () => {
      const source = readFileSync(file, 'utf-8');
      expect(source).toMatch(/requireUserId\(\s*request\s*\)/);
    });
  }
});
