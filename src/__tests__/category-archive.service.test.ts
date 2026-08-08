import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { createCategory, updateCategory, listCategories } from '@/server/services/category.service';
import { DEMO_USER_ID } from '@/server/auth/current-user';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

async function makeCategory(name = 'Groceries') {
  const result = await createCategory(DEMO_USER_ID, {
    name,
    type: 'expense',
    color: '#123456',
    icon: 'utensils',
    budget: 0,
  });
  expect(result.error).toBeUndefined();
  return result.data!;
}

describe('category archiving', () => {
  it('new categories start unarchived', async () => {
    await makeCategory();
    const list = await listCategories(DEMO_USER_ID, {});
    expect(list.data![0].archived).toBe(false);
  });

  it('PATCH { archived: true } archives a category', async () => {
    const cat = await makeCategory();
    const result = await updateCategory(DEMO_USER_ID, cat.id, { archived: true });
    expect(result.error).toBeUndefined();
    expect(result.data!.archived).toBe(true);
  });

  it('archived categories remain in the list (history stays intact)', async () => {
    const cat = await makeCategory();
    await updateCategory(DEMO_USER_ID, cat.id, { archived: true });
    const list = await listCategories(DEMO_USER_ID, {});
    expect(list.data!.some((c) => c.id === cat.id && c.archived === true)).toBe(true);
  });

  it('unarchiving restores the category', async () => {
    const cat = await makeCategory();
    await updateCategory(DEMO_USER_ID, cat.id, { archived: true });
    const result = await updateCategory(DEMO_USER_ID, cat.id, { archived: false });
    expect(result.data!.archived).toBe(false);
  });

  it('rejects a non-boolean archived value', async () => {
    const cat = await makeCategory();
    const result = await updateCategory(DEMO_USER_ID, cat.id, {
      archived: 'yes' as unknown as boolean,
    });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('archiving does not affect other fields', async () => {
    const cat = await makeCategory('Transport');
    await updateCategory(DEMO_USER_ID, cat.id, { archived: true });
    const list = await listCategories(DEMO_USER_ID, {});
    const found = list.data!.find((c) => c.id === cat.id)!;
    expect(found.name).toBe('Transport');
    expect(found.color).toBe('#123456');
  });
});
