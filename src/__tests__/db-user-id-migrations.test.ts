import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { USER_DATA_TABLES } from '@/server/services/data.service';

const clientSource = readFileSync(resolve('src/server/db/client.ts'), 'utf-8');

describe('legacy-Postgres user_id migrations cover every user-data table', () => {
  // Production Neon databases predate per-user scoping. Every user-scoped
  // table needs an ADD COLUMN IF NOT EXISTS user_id migration — the seed
  // backfill UPDATEs each of these tables, so one missing migration 500s
  // every ensureSeeded() call (this happened with `settings` in production).
  for (const table of USER_DATA_TABLES) {
    it(`migrates ${table}.user_id`, () => {
      expect(clientSource).toMatch(
        new RegExp(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id`)
      );
    });
  }

  it('migrates the settings primary key to (key, user_id)', () => {
    // The settings repository upserts with ON CONFLICT (key, user_id) —
    // legacy databases with PRIMARY KEY (key) reject that conflict target.
    expect(clientSource).toMatch(/ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey/);
    expect(clientSource).toMatch(
      /ALTER TABLE settings ADD CONSTRAINT settings_pkey PRIMARY KEY \(key, user_id\)/
    );
  });
});
