import type { TransactionSplit, TransactionSplitInput } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface SplitRow {
  id: string;
  transaction_id: string;
  category_id: string | null;
  category: string;
  amount: number;
  description: string | null;
  created_at: string;
}

function rowToSplit(row: SplitRow): TransactionSplit {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    categoryId: row.category_id,
    category: row.category,
    amount: row.amount,
    description: row.description,
    createdAt: row.created_at,
  };
}

export function createTransactionSplitRepository() {
  return {
    async createSplits(transactionId: string, splits: TransactionSplitInput[]): Promise<void> {
      const db = await getDb();
      const now = new Date().toISOString();
      for (const split of splits) {
        await db.query(
          'INSERT INTO transaction_splits (id, transaction_id, category_id, category, amount, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            nanoid(),
            transactionId,
            split.categoryId,
            split.category,
            split.amount,
            split.description ?? null,
            now,
          ]
        );
      }
    },

    async deleteSplits(transactionId: string): Promise<void> {
      const db = await getDb();
      await db.query('DELETE FROM transaction_splits WHERE transaction_id = ?', [transactionId]);
    },

    async getSplitsByTransactionId(transactionId: string): Promise<TransactionSplit[]> {
      const db = await getDb();
      const result = await db.query<SplitRow>(
        'SELECT * FROM transaction_splits WHERE transaction_id = ? ORDER BY created_at',
        [transactionId]
      );
      return result.rows.map(rowToSplit);
    },

    async getSplitsForTransactions(
      transactionIds: string[]
    ): Promise<Map<string, TransactionSplit[]>> {
      if (transactionIds.length === 0) return new Map();
      const db = await getDb();
      const placeholders = transactionIds.map(() => '?').join(', ');
      const result = await db.query<SplitRow>(
        `SELECT * FROM transaction_splits WHERE transaction_id IN (${placeholders}) ORDER BY created_at`,
        transactionIds
      );
      const map = new Map<string, TransactionSplit[]>();
      for (const row of result.rows) {
        const split = rowToSplit(row);
        const existing = map.get(split.transactionId) ?? [];
        existing.push(split);
        map.set(split.transactionId, existing);
      }
      return map;
    },

    async countByCategory(categoryId: string): Promise<number> {
      const db = await getDb();
      const result = await db.query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM transaction_splits WHERE category_id = ?',
        [categoryId]
      );
      return result.rows[0]?.cnt ?? 0;
    },
  };
}
