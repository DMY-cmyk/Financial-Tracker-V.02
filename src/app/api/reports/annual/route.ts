import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded } from '@/server/db/seed';
import { getDb } from '@/server/db/client';

interface CategoryTotal {
  category: string;
  total_amount: number;
}

interface MonthlyTotal {
  month_key: string;
  total_income: number;
  total_expense: number;
}

export async function GET(request: NextRequest) {
  await ensureSeeded();
  const db = await getDb();

  const yearParam = request.nextUrl.searchParams.get('year');
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  const prefix = `${year}-`;

  // Yearly totals
  const totalsResult = await db.query<{
    total_income: number;
    total_expense: number;
    tx_count: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
       COUNT(*) as tx_count
     FROM transactions
     WHERE date LIKE ? || '%'`,
    [prefix]
  );

  const totals = totalsResult.rows[0] || { total_income: 0, total_expense: 0, tx_count: 0 };

  // Top expense categories
  const categoriesResult = await db.query<CategoryTotal>(
    `SELECT category, SUM(amount) as total_amount
     FROM transactions
     WHERE date LIKE ? || '%' AND type = 'expense'
     GROUP BY category
     ORDER BY total_amount DESC
     LIMIT 5`,
    [prefix]
  );

  // Monthly breakdown for this year
  const monthlyResult = await db.query<MonthlyTotal>(
    `SELECT
       substr(date, 1, 7) as month_key,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
     FROM transactions
     WHERE date LIKE ? || '%'
     GROUP BY month_key
     ORDER BY month_key`,
    [prefix]
  );

  return NextResponse.json({
    data: {
      year,
      totalIncome: totals.total_income,
      totalExpense: totals.total_expense,
      totalBalance: totals.total_income - totals.total_expense,
      transactionCount: totals.tx_count,
      savingsRate:
        totals.total_income > 0
          ? Math.round(((totals.total_income - totals.total_expense) / totals.total_income) * 100)
          : 0,
      topExpenseCategories: categoriesResult.rows.map((r) => ({
        category: r.category,
        amount: r.total_amount,
      })),
      monthlyBreakdown: monthlyResult.rows.map((r) => ({
        monthKey: r.month_key,
        income: r.total_income,
        expense: r.total_expense,
        balance: r.total_income - r.total_expense,
      })),
    },
  });
}
