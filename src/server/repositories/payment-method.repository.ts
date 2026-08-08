import type { PaymentMethod } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface PmRow {
  id: string;
  name: string;
  icon: string;
  type: string;
  beginning_balance: number;
}

function rowToPm(row: PmRow): PaymentMethod {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    type: row.type as 'bank' | 'cash' | 'ewallet',
    beginningBalance: Number(row.beginning_balance ?? 0),
  };
}

export function createPaymentMethodRepository() {
  return {
    async findAll(userId: string): Promise<PaymentMethod[]> {
      const db = await getDb();
      const result = await db.query<PmRow>(
        'SELECT * FROM payment_methods WHERE user_id = ? ORDER BY name',
        [userId]
      );
      return result.rows.map(rowToPm);
    },

    async findById(userId: string, id: string): Promise<PaymentMethod | undefined> {
      const db = await getDb();
      const result = await db.query<PmRow>(
        'SELECT * FROM payment_methods WHERE user_id = ? AND id = ?',
        [userId, id]
      );
      return result.rows[0] ? rowToPm(result.rows[0]) : undefined;
    },

    async create(userId: string, data: Omit<PaymentMethod, 'id'>): Promise<PaymentMethod> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        'INSERT INTO payment_methods (id, user_id, name, icon, type, beginning_balance) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, data.name, data.icon, data.type, data.beginningBalance ?? 0]
      );
      return { ...data, id, beginningBalance: data.beginningBalance ?? 0 };
    },

    async update(
      userId: string,
      id: string,
      data: Partial<PaymentMethod>
    ): Promise<PaymentMethod | undefined> {
      const db = await getDb();
      const existing = await db.query<PmRow>(
        'SELECT * FROM payment_methods WHERE user_id = ? AND id = ?',
        [userId, id]
      );
      if (!existing.rows[0]) return undefined;
      const updated = { ...rowToPm(existing.rows[0]), ...data };
      await db.query(
        'UPDATE payment_methods SET name=?, icon=?, type=?, beginning_balance=? WHERE user_id=? AND id=?',
        [updated.name, updated.icon, updated.type, updated.beginningBalance ?? 0, userId, id]
      );
      return updated;
    },

    async delete(userId: string, id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM payment_methods WHERE user_id = ? AND id = ?', [
        userId,
        id,
      ]);
      return result.rowCount > 0;
    },

    // Atomic delete: removes the payment method only if no transactions of the
    // same user reference it. Closes the check-then-delete race in
    // deletePaymentMethod().
    async deleteIfUnused(userId: string, id: string, name: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query(
        `DELETE FROM payment_methods
         WHERE user_id = ? AND id = ?
           AND NOT EXISTS (
             SELECT 1 FROM transactions
             WHERE transactions.user_id = ? AND transactions.payment_method = ?
           )`,
        [userId, id, userId, name]
      );
      return result.rowCount > 0;
    },
  };
}
