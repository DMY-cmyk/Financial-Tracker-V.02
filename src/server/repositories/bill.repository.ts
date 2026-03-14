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
    amount: row.amount,
    dueDate: row.due_date,
    isPaid: Boolean(row.is_paid),
    isRecurring: Boolean(row.is_recurring),
    month: row.month,
    year: row.year,
  };
}

export function createBillRepository() {
  return {
    async findAll(): Promise<Bill[]> {
      const db = await getDb();
      const result = await db.query<BillRow>('SELECT * FROM bills ORDER BY due_date');
      return result.rows.map(rowToBill);
    },

    async findByMonth(month: number, year: number): Promise<Bill[]> {
      const db = await getDb();
      const result = await db.query<BillRow>(
        'SELECT * FROM bills WHERE month = ? AND year = ? ORDER BY due_date',
        [month, year]
      );
      return result.rows.map(rowToBill);
    },

    async findRecurringByMonth(month: number, year: number): Promise<Bill[]> {
      const db = await getDb();
      const result = await db.query<BillRow>(
        'SELECT * FROM bills WHERE month = ? AND year = ? AND is_recurring = 1 ORDER BY due_date',
        [month, year]
      );
      return result.rows.map(rowToBill);
    },

    async findById(id: string): Promise<Bill | undefined> {
      const db = await getDb();
      const result = await db.query<BillRow>('SELECT * FROM bills WHERE id = ?', [id]);
      return result.rows[0] ? rowToBill(result.rows[0]) : undefined;
    },

    async create(data: Omit<Bill, 'id'>): Promise<Bill> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        'INSERT INTO bills (id, name, amount, due_date, is_paid, is_recurring, month, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
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

    async update(id: string, data: Partial<Omit<Bill, 'id'>>): Promise<Bill | undefined> {
      const db = await getDb();
      const existing = await db.query<BillRow>('SELECT * FROM bills WHERE id = ?', [id]);
      if (!existing.rows[0]) return undefined;
      const current = rowToBill(existing.rows[0]);
      const updated: Bill = { ...current, ...data };
      await db.query(
        'UPDATE bills SET name=?, amount=?, due_date=?, is_paid=?, is_recurring=?, month=?, year=? WHERE id=?',
        [
          updated.name,
          updated.amount,
          updated.dueDate,
          updated.isPaid ? 1 : 0,
          updated.isRecurring ? 1 : 0,
          updated.month,
          updated.year,
          id,
        ]
      );
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM bills WHERE id = ?', [id]);
      return result.rowCount > 0;
    },
  };
}
