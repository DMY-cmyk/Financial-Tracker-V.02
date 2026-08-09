import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';

// strftime() hanya ada di SQLite. CI berjalan di SQLite sehingga SQL seperti
// ini lolos tes tapi 500 di Neon Postgres (insiden /insights 2026-08).
// File koneksi SQLite sendiri dikecualikan.
const EXCLUDED_FILES = ['sqlite-client.ts'];

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.endsWith('.ts') && !EXCLUDED_FILES.includes(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('server SQL stays Postgres-compatible', () => {
  for (const file of collectTsFiles(resolve('src/server'))) {
    it(`${file} contains no strftime(`, () => {
      expect(readFileSync(file, 'utf-8')).not.toContain('strftime(');
    });
  }
});
