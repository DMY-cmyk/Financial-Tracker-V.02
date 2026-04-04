import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  listTemplates,
  createTemplate,
  deleteTemplate,
  applyTemplate,
  getBudgetSuggestions,
} from '@/server/services/budget-template.service';
import { createCategory } from '@/server/services/category.service';
import { createTransactionRepository } from '@/server/repositories/transaction.repository';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

async function makeCategory(name: string, budget: number, type: 'expense' | 'income' = 'expense') {
  const result = await createCategory({ name, type, color: '#3B82F6', icon: 'circle', budget });
  return result.data!;
}

async function makeTransaction(
  categoryId: string,
  category: string,
  amount: number,
  date: string
) {
  const txRepo = createTransactionRepository();
  await txRepo.create({
    date,
    description: 'Test',
    category,
    categoryId,
    type: 'expense',
    amount,
    paymentMethod: 'Cash',
    notes: '',
  });
}

describe('listTemplates', () => {
  it('returns empty array when no templates exist', async () => {
    const result = await listTemplates();
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([]);
  });

  it('returns templates ordered by newest first', async () => {
    await makeCategory('Food', 500000);
    await createTemplate('First');
    await createTemplate('Second');
    const result = await listTemplates();
    expect(result.data).toHaveLength(2);
    expect(result.data![0].name).toBe('Second');
  });
});

describe('createTemplate', () => {
  it('snapshots all categories with budget > 0', async () => {
    await makeCategory('Food', 500000);
    await makeCategory('Transport', 300000);
    await makeCategory('Entertainment', 0);
    const result = await createTemplate('My Budget');
    expect(result.error).toBeUndefined();
    expect(result.data!.name).toBe('My Budget');
    expect(result.data!.categoryCount).toBe(2);
    expect(result.data!.preview).toEqual(expect.arrayContaining(['Food', 'Transport']));
  });

  it('allows creating a template with no categories having budgets', async () => {
    await makeCategory('Food', 0);
    const result = await createTemplate('Empty Template');
    expect(result.error).toBeUndefined();
    expect(result.data!.categoryCount).toBe(0);
  });

  it('returns validation error for empty name', async () => {
    const result = await createTemplate('');
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for name over 50 chars', async () => {
    const result = await createTemplate('A'.repeat(51));
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('assigns an id to the created template', async () => {
    await makeCategory('Food', 500000);
    const result = await createTemplate('Test');
    expect(result.data!.id).toBeDefined();
    expect(typeof result.data!.id).toBe('string');
  });
});

describe('deleteTemplate', () => {
  it('deletes an existing template', async () => {
    await makeCategory('Food', 500000);
    const created = await createTemplate('To Delete');
    const result = await deleteTemplate(created.data!.id);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ success: true });
    const list = await listTemplates();
    expect(list.data).toHaveLength(0);
  });

  it('returns NOT_FOUND for nonexistent id', async () => {
    const result = await deleteTemplate('nonexistent-id');
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});

describe('applyTemplate', () => {
  it('updates each category budget from the template', async () => {
    const food = await makeCategory('Food', 500000);
    const transport = await makeCategory('Transport', 300000);
    const created = await createTemplate('My Budget');

    // Change budgets after snapshot
    const { updateCategory } = await import('@/server/services/category.service');
    await updateCategory(food.id, { budget: 100000 });
    await updateCategory(transport.id, { budget: 50000 });

    const result = await applyTemplate(created.data!.id);
    expect(result.error).toBeUndefined();
    expect(result.data!.applied).toBe(2);
    expect(result.data!.skipped).toBe(0);

    const { listCategories } = await import('@/server/services/category.service');
    const cats = await listCategories();
    const foodCat = cats.data!.find((c) => c.id === food.id);
    const transportCat = cats.data!.find((c) => c.id === transport.id);
    expect(foodCat!.budget).toBe(500000);
    expect(transportCat!.budget).toBe(300000);
  });

  it('skips categories that were deleted after template was saved', async () => {
    const food = await makeCategory('Food', 500000);
    const created = await createTemplate('My Budget');
    const { deleteCategory } = await import('@/server/services/category.service');
    await deleteCategory(food.id);
    const result = await applyTemplate(created.data!.id);
    expect(result.error).toBeUndefined();
    expect(result.data!.applied).toBe(0);
    expect(result.data!.skipped).toBe(1);
  });

  it('returns NOT_FOUND for nonexistent template id', async () => {
    const result = await applyTemplate('nonexistent-id');
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });

  it('all categories deleted returns applied:0 skipped:N without error', async () => {
    const food = await makeCategory('Food', 500000);
    const transport = await makeCategory('Transport', 300000);
    const created = await createTemplate('Full');
    const { deleteCategory } = await import('@/server/services/category.service');
    await deleteCategory(food.id);
    await deleteCategory(transport.id);
    const result = await applyTemplate(created.data!.id);
    expect(result.error).toBeUndefined();
    expect(result.data!.applied).toBe(0);
    expect(result.data!.skipped).toBe(2);
  });
});

describe('getBudgetSuggestions', () => {
  it('returns 0 suggestion for categories with no transactions', async () => {
    await makeCategory('Food', 500000);
    const result = await getBudgetSuggestions(3);
    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(1);
    expect(result.data![0].suggestedBudget).toBe(0);
    expect(result.data![0].basedOnMonths).toBe(0);
  });

  it('returns only expense categories', async () => {
    await makeCategory('Food', 500000, 'expense');
    await makeCategory('Salary', 1000000, 'income');
    const result = await getBudgetSuggestions(3);
    expect(result.data!.every((s) => s.category !== 'Salary')).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it('returns correct average for a category with transactions in range', async () => {
    const food = await makeCategory('Food', 0, 'expense');
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const prevMonthStr = prevMonth.toISOString().slice(0, 10);
    await makeTransaction(food.id, 'Food', 400000, prevMonthStr);
    await makeTransaction(food.id, 'Food', 200000, prevMonthStr);
    const result = await getBudgetSuggestions(3);
    expect(result.error).toBeUndefined();
    const suggestion = result.data!.find((s) => s.categoryId === food.id);
    expect(suggestion!.suggestedBudget).toBe(600000);
    expect(suggestion!.basedOnMonths).toBe(1);
  });

  it('returns categoryId, category, color, suggestedBudget, basedOnMonths fields', async () => {
    const food = await makeCategory('Food', 500000, 'expense');
    const result = await getBudgetSuggestions(3);
    const s = result.data![0];
    expect(s.categoryId).toBe(food.id);
    expect(s.category).toBe('Food');
    expect(typeof s.color).toBe('string');
    expect(typeof s.suggestedBudget).toBe('number');
    expect(typeof s.basedOnMonths).toBe('number');
  });
});
