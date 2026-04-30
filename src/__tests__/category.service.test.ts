import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/server/services/category.service';
import { createTransactionRepository } from '@/server/repositories/transaction.repository';
import { createCategoryRepository } from '@/server/repositories/category.repository';
import { createMonthlyBudgetRepository } from '@/server/repositories/monthly-budget.repository';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('createCategory', () => {
  const validInput = {
    name: 'Food',
    type: 'expense' as const,
    color: '#D97706',
    icon: 'utensils',
    budget: 500000,
  };

  it('creates a category with valid input', async () => {
    const result = await createCategory(validInput);
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBeDefined();
    expect(result.data!.name).toBe('Food');
    expect(result.data!.budget).toBe(500000);
  });

  it('creates a category with defaults', async () => {
    const result = await createCategory({ name: 'Test', type: 'income', color: '#000' });
    expect(result.data).toBeDefined();
    expect(result.data!.icon).toBe('circle');
    expect(result.data!.budget).toBe(0);
  });

  it('returns validation error for empty name', async () => {
    const result = await createCategory({ ...validInput, name: '' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for invalid type', async () => {
    const result = await createCategory({ ...validInput, type: 'invalid' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for missing fields', async () => {
    const result = await createCategory({});
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for negative budget', async () => {
    const result = await createCategory({ ...validInput, budget: -100 });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('listCategories', () => {
  beforeEach(async () => {
    await createCategory({
      name: 'Food',
      type: 'expense',
      color: '#D97706',
      icon: 'circle',
      budget: 500000,
    });
    await createCategory({
      name: 'Transport',
      type: 'expense',
      color: '#3B82F6',
      icon: 'circle',
      budget: 300000,
    });
    await createCategory({
      name: 'Salary',
      type: 'income',
      color: '#059669',
      icon: 'circle',
      budget: 0,
    });
  });

  it('returns all categories', async () => {
    const result = await listCategories();
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(3);
  });

  it('filters by type', async () => {
    const result = await listCategories({ type: 'expense' });
    expect(result.data!.length).toBe(2);
    expect(result.data!.every((c) => c.type === 'expense')).toBe(true);
  });

  it('filters income categories', async () => {
    const result = await listCategories({ type: 'income' });
    expect(result.data!.length).toBe(1);
    expect(result.data![0].name).toBe('Salary');
  });
});

describe('updateCategory', () => {
  it('updates an existing category', async () => {
    const created = await createCategory({
      name: 'Food',
      type: 'expense',
      color: '#D97706',
      icon: 'circle',
      budget: 500000,
    });
    const result = await updateCategory(created.data!.id, { name: 'Food & Drink', budget: 700000 });

    expect(result.error).toBeUndefined();
    expect(result.data!.name).toBe('Food & Drink');
    expect(result.data!.budget).toBe(700000);
    expect(result.data!.color).toBe('#D97706'); // unchanged
  });

  it('returns NOT_FOUND for nonexistent ID', async () => {
    const result = await updateCategory('nonexistent', { name: 'Test' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});

describe('deleteCategory', () => {
  it('deletes an existing category', async () => {
    const created = await createCategory({
      name: 'Food',
      type: 'expense',
      color: '#D97706',
      icon: 'circle',
      budget: 500000,
    });
    const result = await deleteCategory(created.data!.id);
    expect(result.data).toEqual({ success: true });

    const list = await listCategories();
    expect(list.data!.length).toBe(0);
  });

  it('returns NOT_FOUND for nonexistent ID', async () => {
    const result = await deleteCategory('nonexistent');
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });

  it('blocks deletion when transactions reference the category', async () => {
    const cat = await createCategory({
      name: 'Food',
      type: 'expense',
      color: '#D97706',
      icon: 'circle',
      budget: 500000,
    });
    const txRepo = createTransactionRepository();
    await txRepo.create({
      date: '2026-03-01',
      description: 'Lunch',
      category: 'Food',
      categoryId: cat.data!.id,
      type: 'expense',
      amount: 50000,
      paymentMethod: 'Cash',
      notes: '',
    });

    const result = await deleteCategory(cat.data!.id);
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('CONFLICT');

    const list = await listCategories();
    expect(list.data!.length).toBe(1);
  });

  it('allows deletion when no transactions reference the category', async () => {
    const cat = await createCategory({
      name: 'Food',
      type: 'expense',
      color: '#D97706',
      icon: 'circle',
      budget: 500000,
    });

    const result = await deleteCategory(cat.data!.id);
    expect(result.data).toEqual({ success: true });

    const list = await listCategories();
    expect(list.data!.length).toBe(0);
  });
});

describe('findWithEffectiveBudget', () => {
  it('returns default budget when no override exists', async () => {
    const catRepo = createCategoryRepository();
    const cat = await catRepo.create({
      name: 'Food',
      type: 'expense',
      color: '#D97706',
      icon: 'utensils',
      budget: 1800000,
    });

    const results = await catRepo.findWithEffectiveBudget('expense', 3, 2026);
    const found = results.find((c) => c.id === cat.id);
    expect(found).toBeDefined();
    expect(found!.budget).toBe(1800000);
  });

  it('returns override budget when monthly override exists', async () => {
    const catRepo = createCategoryRepository();
    const mbRepo = createMonthlyBudgetRepository();
    const cat = await catRepo.create({
      name: 'Food',
      type: 'expense',
      color: '#D97706',
      icon: 'utensils',
      budget: 1800000,
    });
    await mbRepo.upsert({ categoryId: cat.id, month: 3, year: 2026, budgetAmount: 2500000 });

    const results = await catRepo.findWithEffectiveBudget('expense', 3, 2026);
    const found = results.find((c) => c.id === cat.id);
    expect(found!.budget).toBe(2500000);
  });

  it('only returns the requested type', async () => {
    const catRepo = createCategoryRepository();
    await catRepo.create({
      name: 'Salary',
      type: 'income',
      color: '#22C55E',
      icon: 'wallet',
      budget: 0,
    });
    await catRepo.create({
      name: 'Food',
      type: 'expense',
      color: '#D97706',
      icon: 'utensils',
      budget: 1000000,
    });

    const results = await catRepo.findWithEffectiveBudget('expense', 3, 2026);
    expect(results.every((c) => c.type === 'expense')).toBe(true);
  });
});

describe('listCategories with month/year', () => {
  it('returns effective budget (default) when no override', async () => {
    await createCategory({
      name: 'Food',
      type: 'expense',
      color: '#D97706',
      icon: 'utensils',
      budget: 1800000,
    });

    const result = await listCategories({ type: 'expense', month: 3, year: 2026 });
    expect(result.error).toBeUndefined();
    expect(result.data![0].budget).toBe(1800000);
  });

  it('returns override budget when monthly override exists', async () => {
    const catResult = await createCategory({
      name: 'Transport',
      type: 'expense',
      color: '#3B82F6',
      icon: 'car',
      budget: 1800000,
    });
    const { createMonthlyBudgetRepository } =
      await import('@/server/repositories/monthly-budget.repository');
    const mbRepo = createMonthlyBudgetRepository();
    await mbRepo.upsert({
      categoryId: catResult.data!.id,
      month: 3,
      year: 2026,
      budgetAmount: 2500000,
    });

    const result = await listCategories({ type: 'expense', month: 3, year: 2026 });
    const found = result.data!.find((c) => c.id === catResult.data!.id);
    expect(found!.budget).toBe(2500000);
  });

  it('falls back to findAll when no type provided with month/year', async () => {
    const result = await listCategories({ month: 3, year: 2026 });
    expect(result.error).toBeUndefined();
    expect(Array.isArray(result.data)).toBe(true);
  });
});
