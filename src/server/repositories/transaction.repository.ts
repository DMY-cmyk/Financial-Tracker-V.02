import type { Transaction } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface TxRow {
  id: string;
  date: string;
  description: string;
  category: string;
  category_id: string;
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
    categoryId: row.category_id || '',
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
        'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          data.date,
          data.description,
          data.category,
          data.categoryId,
          data.type,
          data.amount,
          data.paymentMethod,
          data.notes,
        ]
      );
      return { ...data, id };
    },

    async update(id: string, data: Partial<Transaction>): Promise<Transaction | undefined> {
      const db = await getDb();
      const existing = await db.query<TxRow>('SELECT * FROM transactions WHERE id = ?', [id]);
      if (!existing.rows[0]) return undefined;

      const updated = { ...rowToTransaction(existing.rows[0]), ...data };
      await db.query(
        'UPDATE transactions SET date=?, description=?, category=?, category_id=?, type=?, amount=?, payment_method=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [
          updated.date,
          updated.description,
          updated.category,
          updated.categoryId,
          updated.type,
          updated.amount,
          updated.paymentMethod,
          updated.notes,
          id,
        ]
      );
      return updated;
    },

    async createMany(
      data: Omit<Transaction, 'id'>[]
    ): Promise<{ created: Transaction[]; duplicates: number; errors: { index: number; message: string }[] }> {
      const db = await getDb();
      const created: Transaction[] = [];
      const errors: { index: number; message: string }[] = [];
      let duplicates = 0;

      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];
          // Check for existing transaction with same date, description, amount, and type
          const existing = await db.query(
            'SELECT id FROM transactions WHERE date = ? AND description = ? AND amount = ? AND type = ? LIMIT 1',
            [row.date, row.description, row.amount, row.type]
          );
          if (existing.rows.length > 0) {
            duplicates++;
            continue;
          }

          const id = nanoid();
          await db.query(
            'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              id,
              row.date,
              row.description,
              row.category,
              row.categoryId,
              row.type,
              row.amount,
              row.paymentMethod,
              row.notes,
            ]
          );
          created.push({ ...row, id });
        } catch (err) {
          errors.push({
            index: i,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      return { created, duplicates, errors };
    },

    async delete(id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM transactions WHERE id = ?', [id]);
      return result.rowCount > 0;
    },

    async countByCategory(categoryId: string): Promise<number> {
      const db = await getDb();
      const result = await db.query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM transactions WHERE category_id = ?',
        [categoryId]
      );
      return result.rows[0]?.cnt ?? 0;
    },

    async countByPaymentMethod(paymentMethodName: string): Promise<number> {
      const db = await getDb();
      const result = await db.query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM transactions WHERE payment_method = ?',
        [paymentMethodName]
      );
      return result.rows[0]?.cnt ?? 0;
    },

    async updateCategoryName(categoryId: string, newName: string): Promise<void> {
      const db = await getDb();
      await db.query('UPDATE transactions SET category = ? WHERE category_id = ?', [
        newName,
        categoryId,
      ]);
    },

    async findFiltered(filters: {
      month?: number;
      year?: number;
      type?: string;
      categoryId?: string;
      paymentMethod?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }): Promise<{ rows: Transaction[]; total: number; income: number; expense: number }> {
      const db = await getDb();
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (filters.month !== undefined && filters.year !== undefined) {
        const prefix = `${filters.year}-${String(filters.month + 1).padStart(2, '0')}`;
        conditions.push("date LIKE ? || '%'");
        params.push(prefix);
      }
      if (filters.type) {
        conditions.push('type = ?');
        params.push(filters.type);
      }
      if (filters.categoryId) {
        conditions.push('category_id = ?');
        params.push(filters.categoryId);
      }
      if (filters.paymentMethod) {
        conditions.push('payment_method = ?');
        params.push(filters.paymentMethod);
      }
      if (filters.search) {
        conditions.push("(LOWER(description) LIKE ? OR LOWER(category) LIKE ? OR LOWER(notes) LIKE ?)");
        const q = `%${filters.search.toLowerCase()}%`;
        params.push(q, q, q);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count + aggregates in one query
      const countResult = await db.query<{ cnt: number; total_income: number; total_expense: number }>(
        `SELECT COUNT(*) as cnt,
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
         FROM transactions ${where}`,
        params
      );

      const total = countResult.rows[0]?.cnt ?? 0;
      const income = countResult.rows[0]?.total_income ?? 0;
      const expense = countResult.rows[0]?.total_expense ?? 0;

      // Get paginated rows
      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 25;
      const offset = (page - 1) * pageSize;

      const dataResult = await db.query<TxRow>(
        `SELECT * FROM transactions ${where} ORDER BY date DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      return {
        rows: dataResult.rows.map(rowToTransaction),
        total,
        income,
        expense,
      };
    },
  };
}
