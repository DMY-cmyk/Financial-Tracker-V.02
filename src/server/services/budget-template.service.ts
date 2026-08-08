import { ensureSeeded } from '@/server/db/seed';
import { createBudgetTemplateRepository } from '@/server/repositories/budget-template.repository';
import { createCategoryRepository } from '@/server/repositories/category.repository';
import { createBudgetTemplateSchema } from '@/lib/api/validation';
import type { BudgetTemplate, BudgetSuggestion } from '@/lib/api/contracts';

const repo = createBudgetTemplateRepository();
const catRepo = createCategoryRepository();

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string; details?: Record<string, string[]> };
}

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

export async function listTemplates(userId: string): Promise<ServiceResult<BudgetTemplate[]>> {
  await ensureSeeded();
  const templates = await repo.findAll(userId);
  return { data: templates };
}

export async function createTemplate(
  userId: string,
  name: unknown
): Promise<ServiceResult<BudgetTemplate>> {
  await ensureSeeded();
  const parsed = createBudgetTemplateSchema.safeParse({ name });
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }
  const allCategories = await catRepo.findAll(userId);
  const entries = allCategories
    .filter((c) => c.budget > 0)
    .map((c) => ({ categoryId: c.id, categoryName: c.name, budget: c.budget }));
  const template = await repo.create(userId, parsed.data.name, entries);
  return { data: template };
}

export async function deleteTemplate(
  userId: string,
  id: string
): Promise<ServiceResult<{ success: boolean }>> {
  await ensureSeeded();
  const deleted = await repo.delete(userId, id);
  if (!deleted) return { error: { message: 'Template not found', code: 'NOT_FOUND' } };
  return { data: { success: true } };
}

export async function applyTemplate(
  userId: string,
  id: string
): Promise<ServiceResult<{ applied: number; skipped: number }>> {
  await ensureSeeded();
  const template = await repo.findById(userId, id);
  if (!template) return { error: { message: 'Template not found', code: 'NOT_FOUND' } };
  let applied = 0;
  let skipped = 0;
  for (const entry of template.entries) {
    const existing = await catRepo.findById(userId, entry.categoryId);
    if (!existing) {
      skipped++;
      continue;
    }
    await catRepo.update(userId, entry.categoryId, { budget: entry.budget });
    applied++;
  }
  return { data: { applied, skipped } };
}

export async function getBudgetSuggestions(
  userId: string,
  months: number
): Promise<ServiceResult<BudgetSuggestion[]>> {
  await ensureSeeded();
  const rows = await repo.getBudgetSuggestions(userId, months);
  return {
    data: rows.map((r) => ({
      categoryId: r.categoryId,
      category: r.categoryName,
      color: r.color,
      suggestedBudget: r.suggestedBudget,
      basedOnMonths: r.basedOnMonths,
    })),
  };
}
