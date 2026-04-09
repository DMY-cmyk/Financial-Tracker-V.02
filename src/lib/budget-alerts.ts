import type { Category } from '@/lib/types';

export type BudgetAlertLevel = 'warning' | 'exceeded';

export interface BudgetAlert {
  categoryId: string;
  categoryName: string;
  color: string;
  budgetAmount: number;
  spentAmount: number;
  spentPct: number; // ratio, e.g. 1.2 = 120%; not clamped — values > 1.0 indicate overspend
  level: BudgetAlertLevel;
}

type CategoryWithSpent = Pick<Category, 'id' | 'name' | 'color' | 'budget'> & { spent: number };

/**
 * Computes budget alerts for a given set of categories.
 * @param categories - Categories with a computed `spent` amount for the period.
 *   `budget` must be >= 0 (enforced by API). `spent` is assumed >= 0.
 */
export function computeBudgetAlerts(categories: CategoryWithSpent[]): BudgetAlert[] {
  return categories
    .filter((c) => c.budget > 0)
    .flatMap((c): BudgetAlert[] => {
      const spentPct = c.spent / c.budget;
      if (spentPct >= 1.0) {
        return [
          {
            categoryId: c.id,
            categoryName: c.name,
            color: c.color,
            budgetAmount: c.budget,
            spentAmount: c.spent,
            spentPct,
            level: 'exceeded',
          },
        ];
      }
      if (spentPct >= 0.8) {
        return [
          {
            categoryId: c.id,
            categoryName: c.name,
            color: c.color,
            budgetAmount: c.budget,
            spentAmount: c.spent,
            spentPct,
            level: 'warning',
          },
        ];
      }
      return [];
    });
}
