import { ensureSeeded } from '@/server/db/seed';
import { createCategoryRepository } from '@/server/repositories/category.repository';
import { createCategorySchema, updateCategorySchema } from '@/lib/api/validation';
import type { Category } from '@/lib/types';

const repo = createCategoryRepository();

function formatZodError(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const f: Record<string, string[]> = {};
  for (const i of error.issues) { const p = String(i.path.join('.') || '_root'); if (!f[p]) f[p] = []; f[p].push(i.message); }
  return f;
}

interface ServiceResult<T> { data?: T; error?: { message: string; code: string; details?: Record<string, string[]> } }

export async function listCategories(query?: { type?: string }): Promise<ServiceResult<Category[]>> {
  await ensureSeeded();
  if (query?.type === 'income' || query?.type === 'expense') {
    return { data: await repo.findByType(query.type) };
  }
  return { data: await repo.findAll() };
}

export async function createCategory(body: unknown): Promise<ServiceResult<Category>> {
  await ensureSeeded();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) return { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: formatZodError(parsed.error) } };
  return { data: await repo.create(parsed.data) };
}

export async function updateCategory(id: string, body: unknown): Promise<ServiceResult<Category>> {
  await ensureSeeded();
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) return { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: formatZodError(parsed.error) } };
  const result = await repo.update(id, parsed.data);
  if (!result) return { error: { message: 'Category not found', code: 'NOT_FOUND' } };
  return { data: result };
}

export async function deleteCategory(id: string): Promise<ServiceResult<{ success: boolean }>> {
  await ensureSeeded();
  if (!(await repo.delete(id))) return { error: { message: 'Category not found', code: 'NOT_FOUND' } };
  return { data: { success: true } };
}
