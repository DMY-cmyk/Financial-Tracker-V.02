export type BudgetAlertLevel = 'warning' | 'exceeded';

export interface BudgetAlert {
  categoryId: string;
  categoryName: string;
  color: string;
  budgetAmount: number;
  spentAmount: number;
  spentPct: number; // e.g. 1.2 = 120%
  level: BudgetAlertLevel;
}

interface CategoryInput {
  id: string;
  name: string;
  color: string;
  budget: number;
  spent: number;
}

export function computeBudgetAlerts(categories: CategoryInput[]): BudgetAlert[] {
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
