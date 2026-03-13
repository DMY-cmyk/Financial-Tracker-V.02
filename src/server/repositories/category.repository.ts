import type { Category } from '@/lib/types';
import { getDb } from '@/server/db/client';
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
    async findAll(): Promise<Category[]> {
      const db = await getDb();
      const result = await db.query<CatRow>('SELECT * FROM categories ORDER BY name');
      return result.rows.map(rowToCategory);
    },

    async findById(id: string): Promise<Category | undefined> {
      const db = await getDb();
      const result = await db.query<CatRow>('SELECT * FROM categories WHERE id = ?', [id]);
      return result.rows[0] ? rowToCategory(result.rows[0]) : undefined;
    },

    async findByType(type: 'income' | 'expense'): Promise<Category[]> {
      const db = await getDb();
      const result = await db.query<CatRow>('SELECT * FROM categories WHERE type = ? ORDER BY name', [type]);
      return result.rows.map(rowToCategory);
    },

    async create(data: Omit<Category, 'id'>): Promise<Category> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        'INSERT INTO categories (id, name, type, color, icon, budget) VALUES (?, ?, ?, ?, ?, ?)',
        [id, data.name, data.type, data.color, data.icon, data.budget]
      );
      return { ...data, id };
    },

    async update(id: string, data: Partial<Category>): Promise<Category | undefined> {
      const db = await getDb();
      const existing = await db.query<CatRow>('SELECT * FROM categories WHERE id = ?', [id]);
      if (!existing.rows[0]) return undefined;
      const updated = { ...rowToCategory(existing.rows[0]), ...data };
      await db.query(
        'UPDATE categories SET name=?, type=?, color=?, icon=?, budget=? WHERE id=?',
        [updated.name, updated.type, updated.color, updated.icon, updated.budget, id]
      );
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM categories WHERE id = ?', [id]);
      return result.rowCount > 0;
    },
  };
}
