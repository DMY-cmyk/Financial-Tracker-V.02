import { getDb } from '@/server/db/client';
import { ensureSeeded } from '@/server/db/seed';
import type { PaymentMethodBalance } from '@/lib/api/contracts';

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string };
}

interface BalanceRow {
  id: string;
  name: string;
  type: string;
  icon: string;
  beginning_balance: number;
  income: number;
  expense: number;
  balance: number;
}

export async function listPaymentMethodBalances(
  month?: number,
  year?: number
): Promise<ServiceResult<PaymentMethodBalance[]>> {
  await ensureSeeded();
  const db = await getDb();

  if (month !== undefined && year !== undefined) {
    // Monthly path: chain calculation
    const monthStr = String(month + 1).padStart(2, '0');
    const monthStart = `${year}-${monthStr}-01`;
    const monthPattern = `${year}-${monthStr}-%`;

    const { rows } = await db.query<BalanceRow>(
      `SELECT
        pm.id, pm.name, pm.type, pm.icon,
        COALESCE(SUM(CASE WHEN t.type = 'income' AND t.date < ? THEN t.amount
                          WHEN t.type = 'expense' AND t.date < ? THEN -t.amount
                          ELSE 0 END), 0) AS beginning_balance,
        COALESCE(SUM(CASE WHEN t.type = 'income' AND t.date LIKE ? THEN t.amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.date LIKE ? THEN t.amount ELSE 0 END), 0) AS expense,
        COALESCE(SUM(CASE WHEN t.type = 'income' AND t.date < ? THEN t.amount
                          WHEN t.type = 'expense' AND t.date < ? THEN -t.amount
                          ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN t.type = 'income' AND t.date LIKE ? THEN t.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.date LIKE ? THEN t.amount ELSE 0 END), 0) AS balance
      FROM payment_methods pm
      LEFT JOIN transactions t ON t.payment_method = pm.name
      GROUP BY pm.id, pm.name, pm.type, pm.icon
      ORDER BY balance DESC`,
      [
        monthStart,
        monthStart,
        monthPattern,
        monthPattern,
        monthStart,
        monthStart,
        monthPattern,
        monthPattern,
      ]
    );

    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type as 'bank' | 'cash' | 'ewallet',
        icon: row.icon,
        beginningBalance: Number(row.beginning_balance),
        income: Number(row.income),
        expense: Number(row.expense),
        balance: Number(row.balance),
      })),
    };
  }

  // All-time path (used by annual report, no month/year given)
  const { rows } = await db.query<BalanceRow>(
    `SELECT
      pm.id, pm.name, pm.type, pm.icon,
      0 AS beginning_balance,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount
                        WHEN t.type = 'expense' THEN -t.amount ELSE 0 END), 0) AS balance
    FROM payment_methods pm
    LEFT JOIN transactions t ON t.payment_method = pm.name
    GROUP BY pm.id, pm.name, pm.type, pm.icon
    ORDER BY balance DESC`
  );

  return {
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as 'bank' | 'cash' | 'ewallet',
      icon: row.icon,
      beginningBalance: 0,
      income: Number(row.income),
      expense: Number(row.expense),
      balance: Number(row.balance),
    })),
  };
}
