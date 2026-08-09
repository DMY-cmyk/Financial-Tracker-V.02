import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded } from '@/server/db/seed';
import { getDb } from '@/server/db/client';
import { requireUserId } from '@/server/auth/current-user';

interface MonthlyAggregate {
  month_key: string;
  total_income: number;
  total_expense: number;
}

export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = requireUserId(request);
  } catch {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  await ensureSeeded();
  const db = await getDb();

  const monthsParam = request.nextUrl.searchParams.get('months');
  const limit = Math.min(Math.max(parseInt(monthsParam || '12', 10), 1), 24);

  const result = await db.query<MonthlyAggregate>(
    `SELECT
       substr(date, 1, 7) as month_key,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
     FROM transactions
     WHERE user_id = ?
     GROUP BY month_key
     ORDER BY month_key DESC
     LIMIT ?`,
    [userId, limit]
  );

  const months = result.rows.reverse().map((row) => ({
    monthKey: row.month_key,
    income: row.total_income,
    expense: row.total_expense,
    balance: row.total_income - row.total_expense,
    savingsRate:
      row.total_income > 0
        ? Math.round(((row.total_income - row.total_expense) / row.total_income) * 100)
        : 0,
  }));

  return NextResponse.json({ data: { months } });
}
