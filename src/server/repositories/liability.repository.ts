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
    async findAll(): Promise<Liability[]> {
      const db = await getDb();
      const result = await db.query<LiabilityRow>(
        'SELECT * FROM liabilities ORDER BY amount DESC'
      );
      return result.rows.map(rowToLiability);
    },

    async findById(id: string): Promise<Liability | undefined> {
      const db = await getDb();
      const result = await db.query<LiabilityRow>(
        'SELECT * FROM liabilities WHERE id = ?',
        [id]
      );
      return result.rows[0] ? rowToLiability(result.rows[0]) : undefined;
    },

    async create(data: { name: string; amount: number; category: string }): Promise<Liability> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        'INSERT INTO liabilities (id, name, amount, category) VALUES (?, ?, ?, ?)',
        [id, data.name, data.amount, data.category]
      );
      const result = await db.query<LiabilityRow>(
        'SELECT * FROM liabilities WHERE id = ?',
        [id]
      );
      return rowToLiability(result.rows[0]);
    },

    async update(
      id: string,
      data: Partial<{ name: string; amount: number; category: string }>
    ): Promise<Liability | undefined> {
      const db = await getDb();
      const existing = await db.query<LiabilityRow>(
        'SELECT * FROM liabilities WHERE id = ?',
        [id]
      );
      if (!existing.rows[0]) return undefined;
      const current = rowToLiability(existing.rows[0]);
      const updated = {
        name: data.name ?? current.name,
        amount: data.amount ?? current.amount,
        category: data.category ?? current.category,
      };
      await db.query(
        'UPDATE liabilities SET name = ?, amount = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [updated.name, updated.amount, updated.category, id]
      );
      return { ...current, ...updated };
    },

    async delete(id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM liabilities WHERE id = ?', [id]);
      return result.rowCount > 0;
    },
  };
}
