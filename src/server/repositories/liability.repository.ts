import type { Liability } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface LiabilityRow {
  id: string;
  name: string;
  amount: number;
  category: string;
  created_at: string;
  updated_at: string;
}

function rowToLiability(row: LiabilityRow): Liability {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    category: row.category as 'loan' | 'credit_card' | 'other',
    createdAt: row.created_at,
  };
}

export function createLiabilityRepository() {
  return {
    async findAll(userId: string): Promise<Liability[]> {
      const db = await getDb();
      const result = await db.query<LiabilityRow>(
        'SELECT * FROM liabilities WHERE user_id = ? ORDER BY amount DESC',
        [userId]
      );
      return result.rows.map(rowToLiability);
    },

    async findById(userId: string, id: string): Promise<Liability | undefined> {
      const db = await getDb();
      const result = await db.query<LiabilityRow>(
        'SELECT * FROM liabilities WHERE user_id = ? AND id = ?',
        [userId, id]
      );
      return result.rows[0] ? rowToLiability(result.rows[0]) : undefined;
    },

    async create(
      userId: string,
      data: { name: string; amount: number; category: string }
    ): Promise<Liability> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        'INSERT INTO liabilities (id, user_id, name, amount, category) VALUES (?, ?, ?, ?, ?)',
        [id, userId, data.name, data.amount, data.category]
      );
      const result = await db.query<LiabilityRow>(
        'SELECT * FROM liabilities WHERE user_id = ? AND id = ?',
        [userId, id]
      );
      return rowToLiability(result.rows[0]);
    },

    async update(
      userId: string,
      id: string,
      data: Partial<{ name: string; amount: number; category: string }>
    ): Promise<Liability | undefined> {
      const db = await getDb();
      const existing = await db.query<LiabilityRow>(
        'SELECT * FROM liabilities WHERE user_id = ? AND id = ?',
        [userId, id]
      );
      if (!existing.rows[0]) return undefined;
      const current = rowToLiability(existing.rows[0]);
      const updated = {
        name: data.name ?? current.name,
        amount: data.amount ?? current.amount,
        category: data.category ?? current.category,
      };
      await db.query(
        'UPDATE liabilities SET name = ?, amount = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id = ?',
        [updated.name, updated.amount, updated.category, userId, id]
      );
      return { ...current, ...updated } as Liability;
    },

    async delete(userId: string, id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM liabilities WHERE user_id = ? AND id = ?', [
        userId,
        id,
      ]);
      return result.rowCount > 0;
    },
  };
}
