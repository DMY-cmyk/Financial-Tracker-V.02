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
  income: number;
  expense: number;
  balance: number;
}

export async function listPaymentMethodBalances(): Promise<ServiceResult<PaymentMethodBalance[]>> {
  await ensureSeeded();
  const db = await getDb();

  const { rows } = await db.query<BalanceRow>(`
    SELECT
      pm.id,
      pm.name,
      pm.type,
      pm.icon,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount
                        WHEN t.type = 'expense' THEN -t.amount ELSE 0 END), 0) AS balance
    FROM payment_methods pm
    LEFT JOIN transactions t ON t.payment_method = pm.name
    GROUP BY pm.id, pm.name, pm.type, pm.icon
    ORDER BY balance DESC
  `);

  return {
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as 'bank' | 'cash' | 'ewallet',
      icon: row.icon,
      income: Number(row.income),
      expense: Number(row.expense),
      balance: Number(row.balance),
    })),
  };
}
