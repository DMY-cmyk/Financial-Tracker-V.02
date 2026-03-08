import type { Transaction } from '@/lib/types';
import { getDb } from '@/server/db/sqlite';
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
    findAll(): Transaction[] {
      const rows = getDb().prepare('SELECT * FROM transactions ORDER BY date DESC').all() as TxRow[];
      return rows.map(rowToTransaction);
    },

    findById(id: string): Transaction | undefined {
      const row = getDb().prepare('SELECT * FROM transactions WHERE id = ?').get(id) as TxRow | undefined;
      return row ? rowToTransaction(row) : undefined;
    },

    findByMonth(month: number, year: number): Transaction[] {
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      const rows = getDb()
        .prepare("SELECT * FROM transactions WHERE date LIKE ? || '%' ORDER BY date DESC")
        .all(prefix) as TxRow[];
      return rows.map(rowToTransaction);
    },

    create(data: Omit<Transaction, 'id'>): Transaction {
      const id = nanoid();
      getDb()
        .prepare(
          'INSERT INTO transactions (id, date, description, category, type, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(id, data.date, data.description, data.category, data.type, data.amount, data.paymentMethod, data.notes);
      return { ...data, id };
    },

    update(id: string, data: Partial<Transaction>): Transaction | undefined {
      const existing = getDb().prepare('SELECT * FROM transactions WHERE id = ?').get(id) as TxRow | undefined;
      if (!existing) return undefined;

      const updated = { ...rowToTransaction(existing), ...data };
      getDb()
        .prepare(
          `UPDATE transactions SET date=?, description=?, category=?, type=?, amount=?, payment_method=?, notes=?, updated_at=datetime('now') WHERE id=?`
        )
        .run(updated.date, updated.description, updated.category, updated.type, updated.amount, updated.paymentMethod, updated.notes, id);
      return updated;
    },

    delete(id: string): boolean {
      const result = getDb().prepare('DELETE FROM transactions WHERE id = ?').run(id);
      return result.changes > 0;
    },
  };
}
