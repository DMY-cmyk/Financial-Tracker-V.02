import { getDb } from './sqlite';
import { getSampleData } from '@/data/sample-data';

let seeded = false;

export function resetSeeded() {
  seeded = false;
}

export function markSeeded() {
  seeded = true;
}

export function ensureSeeded() {
  if (seeded) return;

  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM transactions').get() as { c: number };

  if (count.c > 0) {
    seeded = true;
    return;
  }

  const data = getSampleData();

  const insertTx = db.prepare(`
    INSERT OR IGNORE INTO transactions (id, date, description, category, type, amount, payment_method, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCat = db.prepare(`
    INSERT OR IGNORE INTO categories (id, name, type, color, icon, budget)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertPm = db.prepare(`
    INSERT OR IGNORE INTO payment_methods (id, name, icon, type)
    VALUES (?, ?, ?, ?)
  `);
  const insertBill = db.prepare(`
    INSERT OR IGNORE INTO bills (id, name, amount, due_date, is_paid, month, year)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertGoal = db.prepare(`
    INSERT OR IGNORE INTO savings_goals (id, name, target_amount, saved_amount, color)
    VALUES (?, ?, ?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    for (const t of data.transactions) {
      insertTx.run(t.id, t.date, t.description, t.category, t.type, t.amount, t.paymentMethod, t.notes);
    }
    for (const c of data.categories) {
      insertCat.run(c.id, c.name, c.type, c.color, c.icon, c.budget);
    }
    for (const p of data.paymentMethods) {
      insertPm.run(p.id, p.name, p.icon, p.type);
    }
    for (const b of data.bills) {
      insertBill.run(b.id, b.name, b.amount, b.dueDate, b.isPaid ? 1 : 0, b.month, b.year);
    }
    for (const s of data.savingsGoals) {
      insertGoal.run(s.id, s.name, s.targetAmount, s.savedAmount, s.color);
    }
    // Default settings
    db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run('theme', 'system');
    db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run('locale', 'en');
  });

  seedAll();
  seeded = true;
}
