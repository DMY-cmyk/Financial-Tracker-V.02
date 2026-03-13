import type { Transaction } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface TxRow {
  id: string;
  date: string;
  description: string;
  category: string;
  type: string;
  amount: number;
  payment_method: string;
  notes: string;
}

function rowToTransaction(row: TxRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    category: row.category,
    type: row.type as 'income' | 'expense',
    amount: row.amount,
    paymentMethod: row.payment_method,
    notes: row.notes || '',
  };
}

export function createTransactionRepository() {
  return {
    async findAll(): Promise<Transaction[]> {
      const db = await getDb();
      const result = await db.query<TxRow>('SELECT * FROM transactions ORDER BY date DESC');
      return result.rows.map(rowToTransaction);
    },

    async findById(id: string): Promise<Transaction | undefined> {
      const db = await getDb();
      const result = await db.query<TxRow>('SELECT * FROM transactions WHERE id = ?', [id]);
      return result.rows[0] ? rowToTransaction(result.rows[0]) : undefined;
    },

    async findByMonth(month: number, year: number): Promise<Transaction[]> {
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      const db = await getDb();
      const result = await db.query<TxRow>(
        "SELECT * FROM transactions WHERE date LIKE ? || '%' ORDER BY date DESC",
        [prefix]
      );
      return result.rows.map(rowToTransaction);
    },

    async create(data: Omit<Transaction, 'id'>): Promise<Transaction> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        'INSERT INTO transactions (id, date, description, category, type, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, data.date, data.description, data.category, data.type, data.amount, data.paymentMethod, data.notes]
      );
      return { ...data, id };
    },

    async update(id: string, data: Partial<Transaction>): Promise<Transaction | undefined> {
      const db = await getDb();
      const existing = await db.query<TxRow>('SELECT * FROM transactions WHERE id = ?', [id]);
      if (!existing.rows[0]) return undefined;

      const updated = { ...rowToTransaction(existing.rows[0]), ...data };
      await db.query(
        'UPDATE transactions SET date=?, description=?, category=?, type=?, amount=?, payment_method=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [updated.date, updated.description, updated.category, updated.type, updated.amount, updated.paymentMethod, updated.notes, id]
      );
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM transactions WHERE id = ?', [id]);
      return result.rowCount > 0;
    },
  };
}
