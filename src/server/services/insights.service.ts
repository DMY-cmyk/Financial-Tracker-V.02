import { ensureSeeded } from '@/server/db/seed';
import { getDb } from '@/server/db/client';
import type {
  SpendingInsightsResponse,
  HealthScore,
  DayOfWeekItem,
  BiggestTransaction,
  CategoryComparisonItem,
  SpendingOutlier,
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

async function getMonthTotals(userId: string, prefix: string): Promise<MonthTotals> {
  const db = await getDb();
  const result = await db.query<{ total_income: number; total_expense: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
     FROM transactions
     WHERE user_id = ? AND date LIKE ? || '%'`,
    [userId, prefix]
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

async function computeHealthScore(
  userId: string,
  month: number,
  year: number
): Promise<HealthScore> {
  const currentPrefix = buildMonthPrefix(month, year);
  const current = await getMonthTotals(userId, currentPrefix);

  const savingsRate = computeSavingsRate(current.income, current.expense);

  const prev = getPreviousMonthAndYear(month, year);
  const prevPrefix = buildMonthPrefix(prev.month, prev.year);
  const prevTotals = await getMonthTotals(userId, prevPrefix);

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

interface CategoryTotalRow {
  category_id: string;
  category: string;
  total: number;
}

interface CategoryColorRow {
  id: string;
  color: string;
}

async function getCategoryExpenseTotals(
  userId: string,
  prefix: string
): Promise<CategoryTotalRow[]> {
  const db = await getDb();
  const result = await db.query<CategoryTotalRow>(
    `SELECT category_id, category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ? AND type = 'expense' AND date LIKE ? || '%'
     GROUP BY category_id`,
    [userId, prefix]
  );
  return result.rows;
}

async function computeCategoryComparison(
  userId: string,
  month: number,
  year: number
): Promise<CategoryComparisonItem[]> {
  const currentPrefix = buildMonthPrefix(month, year);
  const prev = getPreviousMonthAndYear(month, year);
  const prevPrefix = buildMonthPrefix(prev.month, prev.year);

  const [thisMonthRows, lastMonthRows] = await Promise.all([
    getCategoryExpenseTotals(userId, currentPrefix),
    getCategoryExpenseTotals(userId, prevPrefix),
  ]);

  const lastMonthMap = new Map<string, number>();
  for (const row of lastMonthRows) {
    lastMonthMap.set(row.category_id, row.total);
  }

  const allCategoryIds = new Set<string>();
  const categoryNames = new Map<string, string>();
  for (const row of thisMonthRows) {
    allCategoryIds.add(row.category_id);
    categoryNames.set(row.category_id, row.category);
  }
  for (const row of lastMonthRows) {
    allCategoryIds.add(row.category_id);
    if (!categoryNames.has(row.category_id)) {
      categoryNames.set(row.category_id, row.category);
    }
  }

  const db = await getDb();
  const categoryIds = Array.from(allCategoryIds);
  const colorMap = new Map<string, string>();
  if (categoryIds.length > 0) {
    const placeholders = categoryIds.map(() => '?').join(',');
    const colorResult = await db.query<CategoryColorRow>(
      `SELECT id, color FROM categories WHERE user_id = ? AND id IN (${placeholders})`,
      [userId, ...categoryIds]
    );
    for (const row of colorResult.rows) {
      colorMap.set(row.id, row.color);
    }
  }

  const thisMonthMap = new Map<string, number>();
  for (const row of thisMonthRows) {
    thisMonthMap.set(row.category_id, row.total);
  }

  const items: CategoryComparisonItem[] = [];
  for (const catId of allCategoryIds) {
    const thisTotal = thisMonthMap.get(catId) ?? 0;
    const lastTotal = lastMonthMap.get(catId) ?? 0;
    const changePct =
      lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : null;
    const changeDelta = thisTotal - lastTotal;

    items.push({
      categoryId: catId,
      category: categoryNames.get(catId) ?? 'Unknown',
      color: colorMap.get(catId) ?? '#6B7280',
      thisMonth: thisTotal,
      lastMonth: lastTotal,
      changePct,
      changeDelta,
    });
  }

  items.sort((a, b) => b.thisMonth - a.thisMonth);

  if (items.length <= 8) {
    return items;
  }

  const top7 = items.slice(0, 7);
  const rest = items.slice(7);

  const otherThisMonth = rest.reduce((sum, c) => sum + c.thisMonth, 0);
  const otherLastMonth = rest.reduce((sum, c) => sum + c.lastMonth, 0);
  const otherChangePct =
    otherLastMonth > 0
      ? Math.round(((otherThisMonth - otherLastMonth) / otherLastMonth) * 100)
      : null;

  top7.push({
    categoryId: 'other',
    category: 'Other',
    color: '#64748B',
    thisMonth: otherThisMonth,
    lastMonth: otherLastMonth,
    changePct: otherChangePct,
    changeDelta: otherThisMonth - otherLastMonth,
  });

  return top7;
}

interface BiggestTransactionRow {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  payment_method: string;
  color: string;
}

async function computeBiggestTransactions(
  userId: string,
  month: number,
  year: number
): Promise<BiggestTransaction[]> {
  const db = await getDb();
  const prefix = buildMonthPrefix(month, year);
  const result = await db.query<BiggestTransactionRow>(
    `SELECT t.id, t.description, t.amount, t.date, t.category, t.payment_method,
            COALESCE(c.color, '#64748B') as color
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
     WHERE t.user_id = ? AND t.type = 'expense' AND t.date LIKE ? || '%'
     ORDER BY t.amount DESC
     LIMIT 5`,
    [userId, prefix]
  );
  return result.rows.map((row) => ({
    id: row.id,
    description: row.description,
    amount: row.amount,
    date: row.date,
    category: row.category,
    color: row.color,
    paymentMethod: row.payment_method,
  }));
}

interface DayOfWeekRow {
  day_index: number;
  total_amount: number;
  count: number;
}

async function computeDayOfWeekPattern(
  userId: string,
  month: number,
  year: number
): Promise<DayOfWeekItem[]> {
  const db = await getDb();
  const prefix = buildMonthPrefix(month, year);
  const result = await db.query<DayOfWeekRow>(
    `SELECT CAST(strftime('%w', date) AS INTEGER) as day_index,
            SUM(amount) as total_amount,
            COUNT(*) as count
     FROM transactions
     WHERE user_id = ? AND type = 'expense' AND date LIKE ? || '%'
     GROUP BY strftime('%w', date)`,
    [userId, prefix]
  );

  const dayMap = new Map<number, { totalAmount: number; count: number }>();
  for (const row of result.rows) {
    dayMap.set(row.day_index, {
      totalAmount: row.total_amount,
      count: row.count,
    });
  }

  return Array.from({ length: 7 }, (_, i) => {
    const data = dayMap.get(i);
    if (!data) {
      return { dayIndex: i, totalAmount: 0, count: 0, avgAmount: 0 };
    }
    return {
      dayIndex: i,
      totalAmount: data.totalAmount,
      count: data.count,
      avgAmount: Math.round(data.totalAmount / data.count),
    };
  });
}

const OUTLIER_MIN_DELTA = 50000;
const OUTLIER_LIMIT = 5;
const BASELINE_MONTHS = 3;

interface CategoryAvgRow {
  category_id: string;
  avg_amount: number;
}

interface OutlierTransactionRow {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  category_id: string;
  color: string;
}

function getBaselinePrefixes(month: number, year: number): string[] {
  const prefixes: string[] = [];
  for (let i = 1; i <= BASELINE_MONTHS; i++) {
    let m = month - i;
    let y = year;
    if (m < 0) {
      m += 12;
      y -= 1;
    }
    prefixes.push(buildMonthPrefix(m, y));
  }
  return prefixes;
}

async function computeOutliers(
  userId: string,
  month: number,
  year: number
): Promise<SpendingOutlier[]> {
  const db = await getDb();
  const prefixes = getBaselinePrefixes(month, year);

  const placeholders = prefixes.map(() => '?').join(',');
  const monthCountResult = await db.query<{ month_count: number }>(
    `SELECT COUNT(DISTINCT substr(date, 1, 7)) AS month_count
     FROM transactions
     WHERE user_id = ? AND type = 'expense'
       AND substr(date, 1, 7) IN (${placeholders})`,
    [userId, ...prefixes]
  );

  const monthCount = monthCountResult.rows[0]?.month_count ?? 0;
  if (monthCount < BASELINE_MONTHS) {
    return [];
  }

  const avgResult = await db.query<CategoryAvgRow>(
    `SELECT category_id, AVG(amount) AS avg_amount
     FROM transactions
     WHERE user_id = ? AND type = 'expense'
       AND substr(date, 1, 7) IN (${placeholders})
     GROUP BY category_id`,
    [userId, ...prefixes]
  );

  const categoryAvgMap = new Map<string, number>();
  for (const row of avgResult.rows) {
    categoryAvgMap.set(row.category_id, row.avg_amount);
  }

  const currentPrefix = buildMonthPrefix(month, year);
  const txResult = await db.query<OutlierTransactionRow>(
    `SELECT t.id, t.description, t.amount, t.date, t.category, t.category_id,
            COALESCE(c.color, '#64748B') AS color
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
     WHERE t.user_id = ? AND t.type = 'expense' AND t.date LIKE ? || '%'`,
    [userId, currentPrefix]
  );

  const candidates: SpendingOutlier[] = [];
  for (const tx of txResult.rows) {
    const categoryAvg = categoryAvgMap.get(tx.category_id);
    if (categoryAvg === undefined) continue;
    const delta = tx.amount - categoryAvg;
    if (delta < OUTLIER_MIN_DELTA) continue;
    const multiplier = categoryAvg > 0 ? tx.amount / categoryAvg : 0;
    candidates.push({
      id: tx.id,
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
      category: tx.category,
      color: tx.color,
      categoryAvg: Math.round(categoryAvg),
      delta: Math.round(delta),
      multiplier: Math.round(multiplier * 100) / 100,
    });
  }

  candidates.sort((a, b) => b.delta - a.delta);
  return candidates.slice(0, OUTLIER_LIMIT);
}

export async function getSpendingInsights(
  userId: string,
  month: number,
  year: number
): Promise<ServiceResult<SpendingInsightsResponse>> {
  await ensureSeeded();

  const [healthScore, categoryComparison, biggestTransactions, dayOfWeekPattern, outliers] =
    await Promise.all([
      computeHealthScore(userId, month, year),
      computeCategoryComparison(userId, month, year),
      computeBiggestTransactions(userId, month, year),
      computeDayOfWeekPattern(userId, month, year),
      computeOutliers(userId, month, year),
    ]);

  return {
    data: {
      healthScore,
      categoryComparison,
      biggestTransactions,
      dayOfWeekPattern,
      outliers,
      period: { month, year },
    },
  };
}
