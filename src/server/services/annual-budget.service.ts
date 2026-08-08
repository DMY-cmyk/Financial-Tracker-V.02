import { ensureSeeded } from '@/server/db/seed';
import { createCategoryRepository } from '@/server/repositories/category.repository';
import { createMonthlyBudgetRepository } from '@/server/repositories/monthly-budget.repository';
import { getDb } from '@/server/db/client';
import type { AnnualBudgetGridResponse, MonthlyBudget } from '@/lib/types';
import { upsertMonthlyBudgetSchema, deleteMonthlyBudgetSchema } from '@/lib/api/validation';

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string };
}

const catRepo = createCategoryRepository();
const mbRepo = createMonthlyBudgetRepository();

export async function getAnnualBudgetGrid(
  userId: string,
  year: number
): Promise<ServiceResult<AnnualBudgetGridResponse>> {
  await ensureSeeded();
  const categories = await catRepo.findByType(userId, 'expense');
  const overrides = await mbRepo.findByYear(userId, year);

  const db = await getDb();
  const spendingResult = await db.query<{
    category_id: string;
    month: number;
    spent: number;
  }>(
    `SELECT category_id,
       CAST(substr(date, 6, 2) AS INTEGER) - 1 AS month,
       SUM(amount) AS spent
     FROM transactions
     WHERE user_id = ? AND type = 'expense' AND substr(date, 1, 4) = ?
     GROUP BY category_id, month`,
    [userId, String(year)]
  );

  return {
    data: {
      year,
      categories,
      overrides,
      spending: spendingResult.rows.map((r) => ({
        categoryId: r.category_id,
        month: r.month,
        spent: r.spent,
      })),
    },
  };
}

export async function upsertMonthlyBudget(
  userId: string,
  body: unknown
): Promise<ServiceResult<MonthlyBudget>> {
  await ensureSeeded();
  const parsed = upsertMonthlyBudgetSchema.safeParse(body);
  if (!parsed.success) {
    return { error: { message: 'Validation failed', code: 'VALIDATION_ERROR' } };
  }
  const result = await mbRepo.upsert(userId, parsed.data);
  return { data: result };
}

export async function deleteMonthlyBudget(
  userId: string,
  body: unknown
): Promise<ServiceResult<{ success: boolean }>> {
  await ensureSeeded();
  const parsed = deleteMonthlyBudgetSchema.safeParse(body);
  if (!parsed.success) {
    return { error: { message: 'Validation failed', code: 'VALIDATION_ERROR' } };
  }
  const { categoryId, month, year } = parsed.data;
  const deleted = await mbRepo.delete(userId, categoryId, month, year);
  return { data: { success: deleted } };
}
