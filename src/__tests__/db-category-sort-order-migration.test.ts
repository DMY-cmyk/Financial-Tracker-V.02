import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const clientSource = readFileSync(resolve('src/server/db/client.ts'), 'utf-8');

describe('categories.sort_order exists in BOTH schema places (playbook rule)', () => {
  it('CREATE TABLE definition', () => {
    expect(clientSource).toMatch(
      /CREATE TABLE IF NOT EXISTS categories[\s\S]*?sort_order INTEGER NOT NULL DEFAULT 0/
    );
  });
  it('legacy ALTER migration', () => {
    expect(clientSource).toMatch(
      /ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0/
    );
  });
});
