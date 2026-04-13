import { ensureSeeded } from '@/server/db/seed';
import { getDb } from '@/server/db/client';
import type {
  SpendingInsightsResponse,
  HealthScore,
  DayOfWeekItem,
  CategoryComparisonItem,
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

interface CategoryTotalRow {
  category_id: string;
  category: string;
  total: number;
}

interface CategoryColorRow {
  id: string;
  color: string;
}

async function getCategoryExpenseTotals(prefix: string): Promise<CategoryTotalRow[]> {
  const db = await getDb();
  const result = await db.query<CategoryTotalRow>(
    `SELECT category_id, category, SUM(amount) AS total
     FROM transactions
     WHERE type = 'expense' AND date LIKE ? || '%'
     GROUP BY category_id`,
    [prefix]
  );
  return result.rows;
}

async function computeCategoryComparison(
  month: number,
  year: number
): Promise<CategoryComparisonItem[]> {
  const currentPrefix = buildMonthPrefix(month, year);
  const prev = getPreviousMonthAndYear(month, year);
  const prevPrefix = buildMonthPrefix(prev.month, prev.year);

  const [thisMonthRows, lastMonthRows] = await Promise.all([
    getCategoryExpenseTotals(currentPrefix),
    getCategoryExpenseTotals(prevPrefix),
  ]);

  // Build lookup of last month totals by categoryId
  const lastMonthMap = new Map<string, number>();
  for (const row of lastMonthRows) {
    lastMonthMap.set(row.category_id, row.total);
  }

  // Collect all category IDs from both months
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

  // Fetch category colors
  const db = await getDb();
  const categoryIds = Array.from(allCategoryIds);
  const colorMap = new Map<string, string>();
  if (categoryIds.length > 0) {
    const placeholders = categoryIds.map(() => '?').join(',');
    const colorResult = await db.query<CategoryColorRow>(
      `SELECT id, color FROM categories WHERE id IN (${placeholders})`,
      categoryIds
    );
    for (const row of colorResult.rows) {
      colorMap.set(row.id, row.color);
    }
  }

  // Build merged items
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

  // Sort by thisMonth DESC
  items.sort((a, b) => b.thisMonth - a.thisMonth);

  // Bucket into top 7 + Other if more than 8
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

export async function getSpendingInsights(
  month: number,
  year: number
): Promise<ServiceResult<SpendingInsightsResponse>> {
  await ensureSeeded();

  const [healthScore, categoryComparison] = await Promise.all([
    computeHealthScore(month, year),
    computeCategoryComparison(month, year),
  ]);

  return {
    data: {
      healthScore,
      categoryComparison,
      biggestTransactions: [],
      dayOfWeekPattern: emptyDayOfWeekPattern(),
      outliers: [],
      period: { month, year },
    },
  };
}
