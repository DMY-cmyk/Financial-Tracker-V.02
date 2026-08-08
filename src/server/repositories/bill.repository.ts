import type { Bill } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface BillRow {
  id: string;
  name: string;
  amount: number;
  due_date: number;
  is_paid: number;
  is_recurring: number;
  month: number;
  year: number;
}

function rowToBill(row: BillRow): Bill {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    dueDate: row.due_date,
    isPaid: Boolean(row.is_paid),
    isRecurring: Boolean(row.is_recurring),
    month: row.month,
    year: row.year,
  };
}

export function createBillRepository() {
  return {
    async findAll(userId: string): Promise<Bill[]> {
      const db = await getDb();
      const result = await db.query<BillRow>(
        'SELECT * FROM bills WHERE user_id = ? ORDER BY due_date',
        [userId]
      );
      return result.rows.map(rowToBill);
    },

    async findByMonth(userId: string, month: number, year: number): Promise<Bill[]> {
      const db = await getDb();
      const result = await db.query<BillRow>(
        'SELECT * FROM bills WHERE user_id = ? AND month = ? AND year = ? ORDER BY due_date',
        [userId, month, year]
      );
      return result.rows.map(rowToBill);
    },

    async findRecurringByMonth(userId: string, month: number, year: number): Promise<Bill[]> {
      const db = await getDb();
      const result = await db.query<BillRow>(
        'SELECT * FROM bills WHERE user_id = ? AND month = ? AND year = ? AND is_recurring = 1 ORDER BY due_date',
        [userId, month, year]
      );
      return result.rows.map(rowToBill);
    },

    async findById(userId: string, id: string): Promise<Bill | undefined> {
      const db = await getDb();
      const result = await db.query<BillRow>('SELECT * FROM bills WHERE user_id = ? AND id = ?', [
        userId,
        id,
      ]);
      return result.rows[0] ? rowToBill(result.rows[0]) : undefined;
    },

    async create(userId: string, data: Omit<Bill, 'id'>): Promise<Bill> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        'INSERT INTO bills (id, user_id, name, amount, due_date, is_paid, is_recurring, month, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          userId,
          data.name,
          data.amount,
          data.dueDate,
          data.isPaid ? 1 : 0,
          data.isRecurring ? 1 : 0,
          data.month,
          data.year,
        ]
      );
      return { ...data, id };
    },

    async update(
      userId: string,
      id: string,
      data: Partial<Omit<Bill, 'id'>>
    ): Promise<Bill | undefined> {
      const db = await getDb();
      const existing = await db.query<BillRow>('SELECT * FROM bills WHERE user_id = ? AND id = ?', [
        userId,
        id,
      ]);
      if (!existing.rows[0]) return undefined;
      const current = rowToBill(existing.rows[0]);
      const updated: Bill = { ...current, ...data };
      await db.query(
        'UPDATE bills SET name=?, amount=?, due_date=?, is_paid=?, is_recurring=?, month=?, year=? WHERE user_id=? AND id=?',
        [
          updated.name,
          updated.amount,
          updated.dueDate,
          updated.isPaid ? 1 : 0,
          updated.isRecurring ? 1 : 0,
          updated.month,
          updated.year,
          userId,
          id,
        ]
      );
      return updated;
    },

    async delete(userId: string, id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM bills WHERE user_id = ? AND id = ?', [userId, id]);
      return result.rowCount > 0;
    },
  };
}
