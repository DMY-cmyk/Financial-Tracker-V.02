import type { PaymentMethod } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface PmRow {
  id: string;
  name: string;
  icon: string;
  type: string;
}

function rowToPm(row: PmRow): PaymentMethod {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    type: row.type as 'bank' | 'cash' | 'ewallet',
  };
}

export function createPaymentMethodRepository() {
  return {
    async findAll(): Promise<PaymentMethod[]> {
      const db = await getDb();
      const result = await db.query<PmRow>('SELECT * FROM payment_methods ORDER BY name');
      return result.rows.map(rowToPm);
    },

    async findById(id: string): Promise<PaymentMethod | undefined> {
      const db = await getDb();
      const result = await db.query<PmRow>('SELECT * FROM payment_methods WHERE id = ?', [id]);
      return result.rows[0] ? rowToPm(result.rows[0]) : undefined;
    },

    async create(data: Omit<PaymentMethod, 'id'>): Promise<PaymentMethod> {
      const id = nanoid();
      const db = await getDb();
      await db.query('INSERT INTO payment_methods (id, name, icon, type) VALUES (?, ?, ?, ?)', [
        id,
        data.name,
        data.icon,
        data.type,
      ]);
      return { ...data, id };
    },

    async update(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
      const db = await getDb();
      const existing = await db.query<PmRow>('SELECT * FROM payment_methods WHERE id = ?', [id]);
      if (!existing.rows[0]) return undefined;
      const updated = { ...rowToPm(existing.rows[0]), ...data };
      await db.query('UPDATE payment_methods SET name=?, icon=?, type=? WHERE id=?', [
        updated.name,
        updated.icon,
        updated.type,
        id,
      ]);
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM payment_methods WHERE id = ?', [id]);
      return result.rowCount > 0;
    },
  };
}
