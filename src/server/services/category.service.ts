import { ensureSeeded } from '@/server/db/seed';
import { createCategoryRepository } from '@/server/repositories/category.repository';
import { createTransactionRepository } from '@/server/repositories/transaction.repository';
import {
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
} from '@/lib/api/validation';
import type { Category } from '@/lib/types';

const repo = createCategoryRepository();

function formatZodError(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string[]> {
  const f: Record<string, string[]> = {};
  for (const i of error.issues) {
    const p = String(i.path.join('.') || '_root');
    if (!f[p]) f[p] = [];
    f[p].push(i.message);
  }
  return f;
}

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string; details?: Record<string, string[]> };
}

export async function listCategories(
  userId: string,
  query?: {
    type?: string;
    month?: number;
    year?: number;
  }
): Promise<ServiceResult<Category[]>> {
  await ensureSeeded();
  if (
    query?.month !== undefined &&
    query?.year !== undefined &&
    (query.type === 'income' || query.type === 'expense')
  ) {
    return {
      data: await repo.findWithEffectiveBudget(userId, query.type, query.month, query.year),
    };
  }
  if (query?.type === 'income' || query?.type === 'expense') {
    return { data: await repo.findByType(userId, query.type) };
  }
  return { data: await repo.findAll(userId) };
}

export async function createCategory(
  userId: string,
  body: unknown
): Promise<ServiceResult<Category>> {
  await ensureSeeded();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success)
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  return { data: await repo.create(userId, parsed.data) };
}

export async function updateCategory(
  userId: string,
  id: string,
  body: unknown
): Promise<ServiceResult<Category>> {
  await ensureSeeded();
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success)
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };

  const result = await repo.update(userId, id, parsed.data);
  if (!result) return { error: { message: 'Category not found', code: 'NOT_FOUND' } };

  // Cascade name change to denormalized transaction.category field
  if (parsed.data.name) {
    const txRepo = createTransactionRepository();
    await txRepo.updateCategoryName(userId, id, parsed.data.name);
  }

  return { data: result };
}

export async function reorderCategories(
  userId: string,
  ids: string[]
): Promise<ServiceResult<{ success: boolean }>> {
  await ensureSeeded();
  const parsed = reorderCategoriesSchema.safeParse({ ids });
  if (!parsed.success)
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };

  await repo.reorder(userId, parsed.data.ids);
  return { data: { success: true } };
}

export async function deleteCategory(
  userId: string,
  id: string
): Promise<ServiceResult<{ success: boolean }>> {
  await ensureSeeded();
  const category = await repo.findById(userId, id);
  if (!category) return { error: { message: 'Category not found', code: 'NOT_FOUND' } };

  // Atomic conditional delete — removes only if zero transactions reference it.
  // Closes the check-then-delete race where a concurrent insert could orphan
  // transactions whose category_id no longer resolves.
  const deleted = await repo.deleteIfUnused(userId, id);
  if (!deleted) {
    const txRepo = createTransactionRepository();
    const count = await txRepo.countByCategory(userId, id);
    return {
      error: {
        message: `Cannot delete "${category.name}" — ${count} transaction(s) still use it`,
        code: 'CONFLICT',
      },
    };
  }

  return { data: { success: true } };
}
