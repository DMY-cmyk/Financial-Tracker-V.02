import type { Category } from '@/lib/types';
import { getDb } from '@/server/db/sqlite';
import { nanoid } from 'nanoid';

interface CatRow {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  budget: number;
}

function rowToCategory(row: CatRow): Category {
  return { id: row.id, name: row.name, type: row.type as 'income' | 'expense', color: row.color, icon: row.icon, budget: row.budget };
}

export function createCategoryRepository() {
  return {
    findAll(): Category[] {
      return (getDb().prepare('SELECT * FROM categories ORDER BY name').all() as CatRow[]).map(rowToCategory);
    },

    findById(id: string): Category | undefined {
      const row = getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id) as CatRow | undefined;
      return row ? rowToCategory(row) : undefined;
    },

    findByType(type: 'income' | 'expense'): Category[] {
      return (getDb().prepare('SELECT * FROM categories WHERE type = ? ORDER BY name').all(type) as CatRow[]).map(rowToCategory);
    },

    create(data: Omit<Category, 'id'>): Category {
      const id = nanoid();
      getDb()
        .prepare('INSERT INTO categories (id, name, type, color, icon, budget) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, data.name, data.type, data.color, data.icon, data.budget);
      return { ...data, id };
    },

    update(id: string, data: Partial<Category>): Category | undefined {
      const existing = getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id) as CatRow | undefined;
      if (!existing) return undefined;
      const updated = { ...rowToCategory(existing), ...data };
      getDb()
        .prepare('UPDATE categories SET name=?, type=?, color=?, icon=?, budget=? WHERE id=?')
        .run(updated.name, updated.type, updated.color, updated.icon, updated.budget, id);
      return updated;
    },

    delete(id: string): boolean {
      return getDb().prepare('DELETE FROM categories WHERE id = ?').run(id).changes > 0;
    },
  };
}
