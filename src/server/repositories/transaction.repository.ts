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
  source_recurring_id: string | null;
  source_due_date: string | null;
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
    sourceRecurringId: row.source_recurring_id ?? undefined,
    sourceDueDate: row.source_due_date ?? undefined,
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

    async findBySource(
      sourceRecurringId: string,
      sourceDueDate: string
    ): Promise<Transaction | null> {
      const db = await getDb();
      const result = await db.query<TxRow>(
        'SELECT * FROM transactions WHERE source_recurring_id = ? AND source_due_date = ? LIMIT 1',
        [sourceRecurringId, sourceDueDate]
      );
      return result.rows.length > 0 ? rowToTransaction(result.rows[0]) : null;
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
        'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, source_recurring_id, source_due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
          data.sourceRecurringId ?? null,
          data.sourceDueDate ?? null,
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

    async createMany(data: Omit<Transaction, 'id'>[]): Promise<{
      created: Transaction[];
      duplicates: number;
      errors: { index: number; message: string }[];
    }> {
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

    async deleteMany(ids: string[]): Promise<number> {
      const db = await getDb();
      let deleted = 0;
      for (const id of ids) {
        const result = await db.query('DELETE FROM transactions WHERE id = ?', [id]);
        deleted += result.rowCount;
      }
      return deleted;
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

    async getYearSummaries(): Promise<
      { year: number; count: number; income: number; expense: number }[]
    > {
      const db = await getDb();
      const result = await db.query<{
        year: string;
        count: number;
        income: number;
        expense: number;
      }>(
        `SELECT SUBSTR(date, 1, 4) as year,
                COUNT(*) as count,
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
         FROM transactions
         GROUP BY SUBSTR(date, 1, 4)
         ORDER BY year DESC`
      );
      return result.rows.map((r) => ({
        year: parseInt(r.year, 10),
        count: Number(r.count),
        income: Number(r.income),
        expense: Number(r.expense),
      }));
    },

    async getMonthSummaries(
      year: number
    ): Promise<{ month: number; count: number; income: number; expense: number }[]> {
      const db = await getDb();
      const prefix = `${year}`;
      const result = await db.query<{
        month: number;
        count: number;
        income: number;
        expense: number;
      }>(
        `SELECT CAST(SUBSTR(date, 6, 2) AS INTEGER) - 1 as month,
                COUNT(*) as count,
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
         FROM transactions
         WHERE date LIKE ? || '%'
         GROUP BY SUBSTR(date, 6, 2)
         ORDER BY month`,
        [prefix]
      );
      return result.rows.map((r) => ({
        month: Number(r.month),
        count: Number(r.count),
        income: Number(r.income),
        expense: Number(r.expense),
      }));
    },

    async findFiltered(filters: {
      month?: number;
      year?: number;
      yearOnly?: boolean;
      type?: string;
      categoryId?: string;
      paymentMethod?: string;
      search?: string;
      page?: number;
      pageSize?: number;
      sortOrder?: 'asc' | 'desc';
      // Advanced filters
      amountMin?: number;
      amountMax?: number;
      categories?: string; // comma-separated category IDs
      dateFrom?: string; // YYYY-MM-DD
      dateTo?: string; // YYYY-MM-DD
      includeNotes?: boolean;
    }): Promise<{ rows: Transaction[]; total: number; income: number; expense: number }> {
      const db = await getDb();
      const conditions: string[] = [];
      const params: unknown[] = [];

      // --- Date scope (dateFrom+dateTo takes priority over month/year) ---
      if (filters.dateFrom && filters.dateTo) {
        conditions.push('date >= ? AND date <= ?');
        params.push(filters.dateFrom, filters.dateTo);
      } else if (filters.yearOnly && filters.year !== undefined) {
        conditions.push("date LIKE ? || '%'");
        params.push(`${filters.year}`);
      } else if (filters.month !== undefined && filters.year !== undefined) {
        const prefix = `${filters.year}-${String(filters.month + 1).padStart(2, '0')}`;
        conditions.push("date LIKE ? || '%'");
        params.push(prefix);
      }

      if (filters.type) {
        conditions.push('type = ?');
        params.push(filters.type);
      }

      // Multi-category takes priority over single categoryId
      if (filters.categories && filters.categories.trim().length > 0) {
        const ids = filters.categories
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          conditions.push(`category_id IN (${placeholders})`);
          params.push(...ids);
        }
      } else if (filters.categoryId) {
        conditions.push('category_id = ?');
        params.push(filters.categoryId);
      }

      if (filters.paymentMethod) {
        conditions.push('payment_method = ?');
        params.push(filters.paymentMethod);
      }

      if (filters.search) {
        if (filters.includeNotes) {
          conditions.push(
            '(LOWER(description) LIKE ? OR LOWER(category) LIKE ? OR LOWER(notes) LIKE ?)'
          );
          const q = `%${filters.search.toLowerCase()}%`;
          params.push(q, q, q);
        } else {
          conditions.push('(LOWER(description) LIKE ? OR LOWER(category) LIKE ?)');
          const q = `%${filters.search.toLowerCase()}%`;
          params.push(q, q);
        }
      }

      // Amount range: 0 is treated as "no bound" (omit clause) per spec
      if (filters.amountMin !== undefined && filters.amountMin > 0) {
        conditions.push('amount >= ?');
        params.push(filters.amountMin);
      }
      if (filters.amountMax !== undefined && filters.amountMax > 0) {
        conditions.push('amount <= ?');
        params.push(filters.amountMax);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const dir = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

      const countResult = await db.query<{
        cnt: number;
        total_income: number;
        total_expense: number;
      }>(
        `SELECT COUNT(*) as cnt,
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
         FROM transactions ${where}`,
        params
      );

      const total = countResult.rows[0]?.cnt ?? 0;
      const income = countResult.rows[0]?.total_income ?? 0;
      const expense = countResult.rows[0]?.total_expense ?? 0;

      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 25;
      const offset = (page - 1) * pageSize;

      const dataResult = await db.query<TxRow>(
        `SELECT * FROM transactions ${where} ORDER BY date ${dir} LIMIT ? OFFSET ?`,
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
