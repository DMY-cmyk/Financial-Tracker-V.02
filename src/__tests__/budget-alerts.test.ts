import { describe, it, expect } from 'vitest';
import { computeBudgetAlerts } from '@/lib/budget-alerts';

const makeCategory = (overrides: {
  id?: string;
  name?: string;
  color?: string;
  budget: number;
  spent: number;
}) => ({
  id: overrides.id ?? 'cat-1',
  name: overrides.name ?? 'Dining',
  color: overrides.color ?? '#EF4444',
  budget: overrides.budget,
  spent: overrides.spent,
});

describe('computeBudgetAlerts', () => {
  it('returns empty array when no categories', () => {
    expect(computeBudgetAlerts([])).toEqual([]);
  });

  it('returns no alert at 79% spent', () => {
    const result = computeBudgetAlerts([makeCategory({ budget: 1_000_000, spent: 790_000 })]);
    expect(result).toHaveLength(0);
  });

  it('returns warning at exactly 80% spent', () => {
    const result = computeBudgetAlerts([makeCategory({ budget: 1_000_000, spent: 800_000 })]);
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe('warning');
    expect(result[0].spentPct).toBeCloseTo(0.8);
  });

  it('returns warning at 95% (between 80% and exclusive 100%)', () => {
    const result = computeBudgetAlerts([makeCategory({ budget: 1_000_000, spent: 950_000 })]);
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe('warning');
  });

  it('returns exceeded at exactly 100% spent', () => {
    const result = computeBudgetAlerts([makeCategory({ budget: 1_000_000, spent: 1_000_000 })]);
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe('exceeded');
    expect(result[0].spentPct).toBeCloseTo(1.0);
  });

  it('returns exceeded above 100% spent', () => {
    const result = computeBudgetAlerts([makeCategory({ budget: 1_000_000, spent: 1_200_000 })]);
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe('exceeded');
    expect(result[0].spentPct).toBeCloseTo(1.2);
  });

  it('excludes categories with budget = 0', () => {
    const result = computeBudgetAlerts([makeCategory({ budget: 0, spent: 500_000 })]);
    expect(result).toHaveLength(0);
  });

  it('returns no alert when spent = 0', () => {
    const result = computeBudgetAlerts([makeCategory({ budget: 1_000_000, spent: 0 })]);
    expect(result).toHaveLength(0);
  });

  it('includes correct fields in returned alert', () => {
    const input = makeCategory({
      id: 'c1',
      name: 'Food',
      color: '#F00',
      budget: 500_000,
      spent: 450_000,
    });
    const [alert] = computeBudgetAlerts([input]);
    expect(alert).toMatchObject({
      categoryId: 'c1',
      categoryName: 'Food',
      color: '#F00',
      budgetAmount: 500_000,
      spentAmount: 450_000,
      level: 'warning',
    });
  });

  it('handles multiple categories, returns only alerted ones', () => {
    const categories = [
      makeCategory({ id: 'c1', budget: 1_000_000, spent: 200_000 }), // 20% — no alert
      makeCategory({ id: 'c2', budget: 1_000_000, spent: 850_000 }), // 85% — warning
      makeCategory({ id: 'c3', budget: 1_000_000, spent: 1_100_000 }), // 110% — exceeded
    ];
    const result = computeBudgetAlerts(categories);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.categoryId === 'c2')?.level).toBe('warning');
    expect(result.find((r) => r.categoryId === 'c3')?.level).toBe('exceeded');
  });
});
