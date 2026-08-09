import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { listCategories, reorderCategories } from '@/server/services/category.service';

async function insertCat(id: string, userId: string, name: string) {
  const db = await getDb();
  await db.query(
    `INSERT INTO categories (id, user_id, name, type, color, icon, budget)
     VALUES (?, ?, ?, 'expense', '#123456', 'tag', 0)`,
    [id, userId, name]
  );
}

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
  const db = await getDb();
  await db.query(`INSERT INTO users (id, email, name) VALUES ('u1', 'u1@x.co', 'U1')`);
  await db.query(`INSERT INTO users (id, email, name) VALUES ('u2', 'u2@x.co', 'U2')`);
  await insertCat('c-a', 'u1', 'Alpha');
  await insertCat('c-b', 'u1', 'Beta');
  await insertCat('c-c', 'u1', 'Gamma');
  await insertCat('c-x', 'u2', 'Alpha');
});

describe('reorderCategories', () => {
  it('persists the given order and list respects it', async () => {
    const r = await reorderCategories('u1', ['c-c', 'c-a', 'c-b']);
    expect(r.error).toBeUndefined();
    const list = await listCategories('u1', {});
    expect(list.data!.map((c) => c.id)).toEqual(['c-c', 'c-a', 'c-b']);
  });

  it('default order (all sort_order 0) falls back to name', async () => {
    const list = await listCategories('u1', {});
    expect(list.data!.map((c) => c.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('cannot move another user’s category', async () => {
    await reorderCategories('u1', ['c-x', 'c-a', 'c-b', 'c-c']);
    const other = await listCategories('u2', {});
    expect(other.data!.map((c) => c.id)).toEqual(['c-x']); // tak tersentuh
  });
});
