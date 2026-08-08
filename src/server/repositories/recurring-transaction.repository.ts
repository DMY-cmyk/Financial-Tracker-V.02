import type { RecurringTransaction } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface RecurringTxRow {
  id: string;
  description: string;
  category: string;
  category_id: string;
  type: string;
  amount: number;
  payment_method: string;
  notes: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  is_active: number;
}

function rowToRecurringTransaction(row: RecurringTxRow): RecurringTransaction {
  return {
    id: row.id,
    description: row.description,
    category: row.category,
    categoryId: row.category_id || '',
    type: row.type as 'income' | 'expense',
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    notes: row.notes || '',
    frequency: row.frequency as RecurringTransaction['frequency'],
    startDate: row.start_date,
    endDate: row.end_date,
    nextDueDate: row.next_due_date,
    isActive: row.is_active === 1,
  };
}

export function createRecurringTransactionRepository() {
  return {
    async findAll(userId: string): Promise<RecurringTransaction[]> {
      const db = await getDb();
      const result = await db.query<RecurringTxRow>(
        'SELECT * FROM recurring_transactions WHERE user_id = ? ORDER BY next_due_date ASC',
        [userId]
      );
      return result.rows.map(rowToRecurringTransaction);
    },

    async findById(userId: string, id: string): Promise<RecurringTransaction | undefined> {
      const db = await getDb();
      const result = await db.query<RecurringTxRow>(
        'SELECT * FROM recurring_transactions WHERE user_id = ? AND id = ?',
        [userId, id]
      );
      return result.rows[0] ? rowToRecurringTransaction(result.rows[0]) : undefined;
    },

    async findActive(userId: string): Promise<RecurringTransaction[]> {
      const db = await getDb();
      const result = await db.query<RecurringTxRow>(
        'SELECT * FROM recurring_transactions WHERE user_id = ? AND is_active = 1 ORDER BY next_due_date ASC',
        [userId]
      );
      return result.rows.map(rowToRecurringTransaction);
    },

    async findDue(userId: string, beforeDate: string): Promise<RecurringTransaction[]> {
      const db = await getDb();
      const result = await db.query<RecurringTxRow>(
        'SELECT * FROM recurring_transactions WHERE user_id = ? AND is_active = 1 AND next_due_date <= ? ORDER BY next_due_date ASC',
        [userId, beforeDate]
      );
      return result.rows.map(rowToRecurringTransaction);
    },

    async create(
      userId: string,
      data: Omit<RecurringTransaction, 'id'>
    ): Promise<RecurringTransaction> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        `INSERT INTO recurring_transactions
         (id, user_id, description, category, category_id, type, amount, payment_method, notes, frequency, start_date, end_date, next_due_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          data.description,
          data.category,
          data.categoryId,
          data.type,
          data.amount,
          data.paymentMethod,
          data.notes,
          data.frequency,
          data.startDate,
          data.endDate,
          data.nextDueDate,
          data.isActive ? 1 : 0,
        ]
      );
      return { ...data, id };
    },

    async update(
      userId: string,
      id: string,
      data: Partial<Omit<RecurringTransaction, 'id'>>
    ): Promise<RecurringTransaction | undefined> {
      const db = await getDb();
      const existing = await db.query<RecurringTxRow>(
        'SELECT * FROM recurring_transactions WHERE user_id = ? AND id = ?',
        [userId, id]
      );
      if (!existing.rows[0]) return undefined;
      const current = rowToRecurringTransaction(existing.rows[0]);
      const updated: RecurringTransaction = { ...current, ...data };
      await db.query(
        `UPDATE recurring_transactions SET
         description=?, category=?, category_id=?, type=?, amount=?, payment_method=?,
         notes=?, frequency=?, start_date=?, end_date=?, next_due_date=?, is_active=?,
         updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND id=?`,
        [
          updated.description,
          updated.category,
          updated.categoryId,
          updated.type,
          updated.amount,
          updated.paymentMethod,
          updated.notes,
          updated.frequency,
          updated.startDate,
          updated.endDate,
          updated.nextDueDate,
          updated.isActive ? 1 : 0,
          userId,
          id,
        ]
      );
      return updated;
    },

    async delete(userId: string, id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query(
        'DELETE FROM recurring_transactions WHERE user_id = ? AND id = ?',
        [userId, id]
      );
      return result.rowCount > 0;
    },
  };
}
