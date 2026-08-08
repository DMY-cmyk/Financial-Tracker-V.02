import type { MonthlyBudget } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface MBRow {
  id: string;
  category_id: string;
  month: number;
  year: number;
  budget_amount: number;
}

function rowToMonthlyBudget(row: MBRow): MonthlyBudget {
  return {
    id: row.id,
    categoryId: row.category_id,
    month: row.month,
    year: row.year,
    budgetAmount: Number(row.budget_amount),
  };
}

export function createMonthlyBudgetRepository() {
  return {
    async findByYear(userId: string, year: number): Promise<MonthlyBudget[]> {
      const db = await getDb();
      const result = await db.query<MBRow>(
        'SELECT * FROM monthly_budgets WHERE user_id = ? AND year = ? ORDER BY month, category_id',
        [userId, year]
      );
      return result.rows.map(rowToMonthlyBudget);
    },

    async upsert(userId: string, data: Omit<MonthlyBudget, 'id'>): Promise<MonthlyBudget> {
      const db = await getDb();
      const existing = await db.query<MBRow>(
        'SELECT * FROM monthly_budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?',
        [userId, data.categoryId, data.month, data.year]
      );
      if (existing.rows[0]) {
        await db.query(
          'UPDATE monthly_budgets SET budget_amount = ? WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?',
          [data.budgetAmount, userId, data.categoryId, data.month, data.year]
        );
        return rowToMonthlyBudget({ ...existing.rows[0], budget_amount: data.budgetAmount });
      }
      const id = nanoid();
      await db.query(
        'INSERT INTO monthly_budgets (id, user_id, category_id, month, year, budget_amount) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, data.categoryId, data.month, data.year, data.budgetAmount]
      );
      return { id, ...data };
    },

    async delete(
      userId: string,
      categoryId: string,
      month: number,
      year: number
    ): Promise<boolean> {
      const db = await getDb();
      const result = await db.query(
        'DELETE FROM monthly_budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?',
        [userId, categoryId, month, year]
      );
      return result.rowCount > 0;
    },
  };
}
