import { getDb } from './client';
import { getSampleData } from '@/data/sample-data';

let seeded = false;

export function resetSeeded() {
  seeded = false;
}

export function markSeeded() {
  seeded = true;
}

export async function ensureSeeded() {
  if (seeded) return;

  const db = await getDb();
  const result = await db.query<{ c: number }>('SELECT COUNT(*) as c FROM transactions');

  if (result.rows[0]?.c > 0) {
    seeded = true;
    return;
  }

  const data = getSampleData();

  for (const t of data.transactions) {
    await db.query(
      'INSERT INTO transactions (id, date, description, category, type, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [t.id, t.date, t.description, t.category, t.type, t.amount, t.paymentMethod, t.notes]
    );
  }
  for (const c of data.categories) {
    await db.query(
      'INSERT INTO categories (id, name, type, color, icon, budget) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [c.id, c.name, c.type, c.color, c.icon, c.budget]
    );
  }
  for (const p of data.paymentMethods) {
    await db.query(
      'INSERT INTO payment_methods (id, name, icon, type) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [p.id, p.name, p.icon, p.type]
    );
  }
  for (const b of data.bills) {
    await db.query(
      'INSERT INTO bills (id, name, amount, due_date, is_paid, month, year) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [b.id, b.name, b.amount, b.dueDate, b.isPaid ? 1 : 0, b.month, b.year]
    );
  }
  for (const s of data.savingsGoals) {
    await db.query(
      'INSERT INTO savings_goals (id, name, target_amount, saved_amount, color) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [s.id, s.name, s.targetAmount, s.savedAmount, s.color]
    );
  }

  // Default settings
  await db.query('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING', [
    'theme',
    'system',
  ]);
  await db.query('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING', [
    'locale',
    'en',
  ]);

  seeded = true;
}
