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
  return {
    id: row.id,
    name: row.name,
    type: row.type as 'income' | 'expense',
    color: row.color,
    icon: row.icon,
    budget: Number(row.budget),
  };
}

export function createCategoryRepository() {
  return {
    async findAll(userId: string): Promise<Category[]> {
      const db = await getDb();
      const result = await db.query<CatRow>(
        'SELECT * FROM categories WHERE user_id = ? ORDER BY name',
        [userId]
      );
      return result.rows.map(rowToCategory);
    },

    async findById(userId: string, id: string): Promise<Category | undefined> {
      const db = await getDb();
      const result = await db.query<CatRow>(
        'SELECT * FROM categories WHERE user_id = ? AND id = ?',
        [userId, id]
      );
      return result.rows[0] ? rowToCategory(result.rows[0]) : undefined;
    },

    async findByName(userId: string, name: string): Promise<Category | undefined> {
      const db = await getDb();
      const result = await db.query<CatRow>(
        'SELECT * FROM categories WHERE user_id = ? AND name = ?',
        [userId, name]
      );
      return result.rows[0] ? rowToCategory(result.rows[0]) : undefined;
    },

    async findByType(userId: string, type: 'income' | 'expense'): Promise<Category[]> {
      const db = await getDb();
      const result = await db.query<CatRow>(
        'SELECT * FROM categories WHERE user_id = ? AND type = ? ORDER BY name',
        [userId, type]
      );
      return result.rows.map(rowToCategory);
    },

    async findWithEffectiveBudget(
      userId: string,
      type: 'income' | 'expense',
      month: number,
      year: number
    ): Promise<Category[]> {
      const db = await getDb();
      const result = await db.query<CatRow>(
        `SELECT c.id, c.name, c.type, c.color, c.icon,
           COALESCE(mb.budget_amount, c.budget) AS budget
         FROM categories c
         LEFT JOIN monthly_budgets mb
           ON mb.category_id = c.id AND mb.user_id = c.user_id AND mb.month = ? AND mb.year = ?
         WHERE c.user_id = ? AND c.type = ?
         ORDER BY c.name`,
        [month, year, userId, type]
      );
      return result.rows.map(rowToCategory);
    },

    async create(userId: string, data: Omit<Category, 'id'>): Promise<Category> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        'INSERT INTO categories (id, user_id, name, type, color, icon, budget) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, userId, data.name, data.type, data.color, data.icon, data.budget]
      );
      return { ...data, id };
    },

    async update(
      userId: string,
      id: string,
      data: Partial<Category>
    ): Promise<Category | undefined> {
      const db = await getDb();
      const existing = await db.query<CatRow>(
        'SELECT * FROM categories WHERE user_id = ? AND id = ?',
        [userId, id]
      );
      if (!existing.rows[0]) return undefined;
      const updated = { ...rowToCategory(existing.rows[0]), ...data };
      await db.query(
        'UPDATE categories SET name=?, type=?, color=?, icon=?, budget=? WHERE user_id=? AND id=?',
        [updated.name, updated.type, updated.color, updated.icon, updated.budget, userId, id]
      );
      return updated;
    },

    async delete(userId: string, id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM categories WHERE user_id = ? AND id = ?', [
        userId,
        id,
      ]);
      return result.rowCount > 0;
    },

    // Atomic delete: removes the category only if no transactions of the same
    // user still reference it. Closes the check-then-delete race in
    // deleteCategory().
    async deleteIfUnused(userId: string, id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query(
        `DELETE FROM categories
         WHERE user_id = ? AND id = ?
           AND NOT EXISTS (
             SELECT 1 FROM transactions
             WHERE transactions.user_id = ? AND transactions.category_id = ?
           )`,
        [userId, id, userId, id]
      );
      return result.rowCount > 0;
    },
  };
}
