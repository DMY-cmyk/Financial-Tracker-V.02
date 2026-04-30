import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

const FORBIDDEN_HEX = [
  '#2563EB',
  '#2563eb',
  '#10b981',
  '#10B981',
  '#ef4444',
  '#EF4444',
  '#f59e0b',
  '#F59E0B',
];

describe('no hardcoded design-token hex values in src/', () => {
  for (const hex of FORBIDDEN_HEX) {
    it(`does not appear in src/ (use tokens instead): ${hex}`, () => {
      let out = '';
      try {
        out = execSync(
          `git grep -n -F -e "${hex}" -- "src" ":(exclude)src/__tests__/no-hardcoded-design-hex.test.ts"`,
          { encoding: 'utf-8' }
        );
      } catch (e) {
        // git grep exits 1 when no matches — that's a pass
        const err = e as { status?: number };
        if (err.status === 1) return;
        throw e;
      }
      expect(out).toBe('');
    });
  }
});
