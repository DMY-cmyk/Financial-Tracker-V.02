import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getDb, resetDb } from '@/server/db/client';
import { resetSeeded, ensureSeeded } from '@/server/db/seed';

const seedSource = readFileSync(resolve('src/server/db/seed.ts'), 'utf-8');

describe('seed.ts contains no destructive global migrations', () => {
  it('the one-shot 2025 cleanup is gone', () => {
    expect(seedSource).not.toContain('cleanup2025');
    expect(seedSource).not.toMatch(/DELETE FROM transactions/i);
    expect(seedSource).not.toMatch(/DELETE FROM bills/i);
  });

  it('category backfill correlates on user_id', () => {
    expect(seedSource).toMatch(
      /categories\.name = transactions\.category\s+AND categories\.user_id = transactions\.user_id/
    );
  });
});

describe('migrateCategoryIds behavior', () => {
  beforeEach(async () => {
    await resetDb();
    resetSeeded();
  });

  it("backfills category_id from the SAME user's category, never another user's", async () => {
    const db = await getDb();
    await db.query(`INSERT INTO users (id, email, name) VALUES ('user-a', 'a@x.co', 'A')`);
    await db.query(`INSERT INTO users (id, email, name) VALUES ('user-b', 'b@x.co', 'B')`);
    // Kategori milik B bernama sama, sengaja dibuat lebih dulu agar LIMIT 1
    // tanpa korelasi akan memilihnya.
    await db.query(
      `INSERT INTO categories (id, user_id, name, type, color, icon, budget)
       VALUES ('cat-b-food', 'user-b', 'Food', 'expense', '#111111', 'utensils', 0)`
    );
    await db.query(
      `INSERT INTO categories (id, user_id, name, type, color, icon, budget)
       VALUES ('cat-a-food', 'user-a', 'Food', 'expense', '#222222', 'utensils', 0)`
    );
    // Transaksi user A dengan category_id kosong → kandidat backfill.
    await db.query(
      `INSERT INTO transactions (id, user_id, date, description, category, category_id, type, amount, payment_method, notes)
       VALUES ('tx-a', 'user-a', '2026-07-01', 'lunch', 'Food', '', 'expense', 50000, 'Cash', '')`
    );

    await ensureSeeded(); // menjalankan migrateCategoryIds karena ada transaksi

    const row = await db.query<{ category_id: string }>(
      `SELECT category_id FROM transactions WHERE id = 'tx-a'`
    );
    expect(row.rows[0].category_id).toBe('cat-a-food'); // BUKAN cat-b-food
  });
});
