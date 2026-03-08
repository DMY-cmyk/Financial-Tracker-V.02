import type { PaymentMethod } from '@/lib/types';
import { getDb } from '@/server/db/sqlite';
import { nanoid } from 'nanoid';

interface PmRow { id: string; name: string; icon: string; type: string; }

function rowToPm(row: PmRow): PaymentMethod {
  return { id: row.id, name: row.name, icon: row.icon, type: row.type as 'bank' | 'cash' | 'ewallet' };
}

export function createPaymentMethodRepository() {
  return {
    findAll(): PaymentMethod[] {
      return (getDb().prepare('SELECT * FROM payment_methods ORDER BY name').all() as PmRow[]).map(rowToPm);
    },

    findById(id: string): PaymentMethod | undefined {
      const row = getDb().prepare('SELECT * FROM payment_methods WHERE id = ?').get(id) as PmRow | undefined;
      return row ? rowToPm(row) : undefined;
    },

    create(data: Omit<PaymentMethod, 'id'>): PaymentMethod {
      const id = nanoid();
      getDb().prepare('INSERT INTO payment_methods (id, name, icon, type) VALUES (?, ?, ?, ?)').run(id, data.name, data.icon, data.type);
      return { ...data, id };
    },

    update(id: string, data: Partial<PaymentMethod>): PaymentMethod | undefined {
      const existing = getDb().prepare('SELECT * FROM payment_methods WHERE id = ?').get(id) as PmRow | undefined;
      if (!existing) return undefined;
      const updated = { ...rowToPm(existing), ...data };
      getDb().prepare('UPDATE payment_methods SET name=?, icon=?, type=? WHERE id=?').run(updated.name, updated.icon, updated.type, id);
      return updated;
    },

    delete(id: string): boolean {
      return getDb().prepare('DELETE FROM payment_methods WHERE id = ?').run(id).changes > 0;
    },
  };
}
