import type { SavingsGoal } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface SavingsGoalRow {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  color: string;
}

function rowToSavingsGoal(row: SavingsGoalRow): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    savedAmount: row.saved_amount,
    color: row.color,
  };
}

export function createSavingsGoalRepository() {
  return {
    async findAll(): Promise<SavingsGoal[]> {
      const db = await getDb();
      const result = await db.query<SavingsGoalRow>('SELECT * FROM savings_goals ORDER BY name');
      return result.rows.map(rowToSavingsGoal);
    },

    async findById(id: string): Promise<SavingsGoal | undefined> {
      const db = await getDb();
      const result = await db.query<SavingsGoalRow>('SELECT * FROM savings_goals WHERE id = ?', [id]);
      return result.rows[0] ? rowToSavingsGoal(result.rows[0]) : undefined;
    },

    async create(data: Omit<SavingsGoal, 'id'>): Promise<SavingsGoal> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        'INSERT INTO savings_goals (id, name, target_amount, saved_amount, color) VALUES (?, ?, ?, ?, ?)',
        [id, data.name, data.targetAmount, data.savedAmount, data.color]
      );
      return { ...data, id };
    },

    async update(id: string, data: Partial<Omit<SavingsGoal, 'id'>>): Promise<SavingsGoal | undefined> {
      const db = await getDb();
      const existing = await db.query<SavingsGoalRow>('SELECT * FROM savings_goals WHERE id = ?', [id]);
      if (!existing.rows[0]) return undefined;
      const current = rowToSavingsGoal(existing.rows[0]);
      const updated: SavingsGoal = { ...current, ...data };
      await db.query(
        'UPDATE savings_goals SET name=?, target_amount=?, saved_amount=?, color=? WHERE id=?',
        [updated.name, updated.targetAmount, updated.savedAmount, updated.color, id]
      );
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM savings_goals WHERE id = ?', [id]);
      return result.rowCount > 0;
    },
  };
}
