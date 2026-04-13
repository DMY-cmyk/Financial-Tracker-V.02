import { ensureSeeded } from '@/server/db/seed';
import { getDb } from '@/server/db/client';
import type {
  SpendingInsightsResponse,
  HealthScore,
  DayOfWeekItem,
} from '@/lib/api/contracts';

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string };
}

interface MonthTotals {
  income: number;
  expense: number;
}

function buildMonthPrefix(month: number, year: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function computeSavingsRate(income: number, expense: number): number {
  if (income === 0) return 0;
  return Math.round(((income - expense) / income) * 100);
}

function emptyDayOfWeekPattern(): DayOfWeekItem[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    totalAmount: 0,
    count: 0,
    avgAmount: 0,
  }));
}

async function getMonthTotals(prefix: string): Promise<MonthTotals> {
  const db = await getDb();
  const result = await db.query<{ total_income: number; total_expense: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
     FROM transactions
     WHERE date LIKE ? || '%'`,
    [prefix]
  );

  const row = result.rows[0];
  return {
    income: row?.total_income ?? 0,
    expense: row?.total_expense ?? 0,
  };
}

function getPreviousMonthAndYear(month: number, year: number): { month: number; year: number } {
  if (month === 0) {
    return { month: 11, year: year - 1 };
  }
  return { month: month - 1, year };
}

async function computeHealthScore(month: number, year: number): Promise<HealthScore> {
  const currentPrefix = buildMonthPrefix(month, year);
  const current = await getMonthTotals(currentPrefix);

  const savingsRate = computeSavingsRate(current.income, current.expense);

  // Previous month
  const prev = getPreviousMonthAndYear(month, year);
  const prevPrefix = buildMonthPrefix(prev.month, prev.year);
  const prevTotals = await getMonthTotals(prevPrefix);

  // Check if prior month had any data at all
  const hasPriorData = prevTotals.income > 0 || prevTotals.expense > 0;

  let lastMonthRate: number | null = null;
  let rateChange: number | null = null;

  if (hasPriorData) {
    lastMonthRate = computeSavingsRate(prevTotals.income, prevTotals.expense);
    rateChange = savingsRate - lastMonthRate;
  }

  return {
    income: current.income,
    expense: current.expense,
    savingsRate,
    lastMonthRate,
    rateChange,
  };
}

export async function getSpendingInsights(
  month: number,
  year: number
): Promise<ServiceResult<SpendingInsightsResponse>> {
  await ensureSeeded();

  const healthScore = await computeHealthScore(month, year);

  return {
    data: {
      healthScore,
      categoryComparison: [],
      biggestTransactions: [],
      dayOfWeekPattern: emptyDayOfWeekPattern(),
      outliers: [],
      period: { month, year },
    },
  };
}
