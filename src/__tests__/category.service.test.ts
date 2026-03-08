import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/sqlite';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/server/services/category.service';

beforeEach(() => {
  resetDb();
  resetSeeded();
  markSeeded();
});

describe('createCategory', () => {
  const validInput = {
    name: 'Food',
    type: 'expense' as const,
    color: '#F59E0B',
    icon: 'utensils',
    budget: 500000,
  };

  it('creates a category with valid input', () => {
    const result = createCategory(validInput);
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBeDefined();
    expect(result.data!.name).toBe('Food');
    expect(result.data!.budget).toBe(500000);
  });

  it('creates a category with defaults', () => {
    const result = createCategory({ name: 'Test', type: 'income', color: '#000' });
    expect(result.data).toBeDefined();
    expect(result.data!.icon).toBe('circle');
    expect(result.data!.budget).toBe(0);
  });

  it('returns validation error for empty name', () => {
    const result = createCategory({ ...validInput, name: '' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for invalid type', () => {
    const result = createCategory({ ...validInput, type: 'invalid' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for missing fields', () => {
    const result = createCategory({});
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for negative budget', () => {
    const result = createCategory({ ...validInput, budget: -100 });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('listCategories', () => {
  beforeEach(() => {
    createCategory({ name: 'Food', type: 'expense', color: '#F59E0B', icon: 'circle', budget: 500000 });
    createCategory({ name: 'Transport', type: 'expense', color: '#3B82F6', icon: 'circle', budget: 300000 });
    createCategory({ name: 'Salary', type: 'income', color: '#10B981', icon: 'circle', budget: 0 });
  });

  it('returns all categories', () => {
    const result = listCategories();
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(3);
  });

  it('filters by type', () => {
    const result = listCategories({ type: 'expense' });
    expect(result.data!.length).toBe(2);
    expect(result.data!.every((c) => c.type === 'expense')).toBe(true);
  });

  it('filters income categories', () => {
    const result = listCategories({ type: 'income' });
    expect(result.data!.length).toBe(1);
    expect(result.data![0].name).toBe('Salary');
  });
});

describe('updateCategory', () => {
  it('updates an existing category', () => {
    const created = createCategory({ name: 'Food', type: 'expense', color: '#F59E0B', icon: 'circle', budget: 500000 });
    const result = updateCategory(created.data!.id, { name: 'Food & Drink', budget: 700000 });

    expect(result.error).toBeUndefined();
    expect(result.data!.name).toBe('Food & Drink');
    expect(result.data!.budget).toBe(700000);
    expect(result.data!.color).toBe('#F59E0B'); // unchanged
  });

  it('returns NOT_FOUND for nonexistent ID', () => {
    const result = updateCategory('nonexistent', { name: 'Test' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});

describe('deleteCategory', () => {
  it('deletes an existing category', () => {
    const created = createCategory({ name: 'Food', type: 'expense', color: '#F59E0B', icon: 'circle', budget: 500000 });
    const result = deleteCategory(created.data!.id);
    expect(result.data).toEqual({ success: true });

    const list = listCategories();
    expect(list.data!.length).toBe(0);
  });

  it('returns NOT_FOUND for nonexistent ID', () => {
    const result = deleteCategory('nonexistent');
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});
