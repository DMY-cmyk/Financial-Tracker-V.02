'use client';

import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { t, useLocale } from '@/lib/i18n';
import { useStore } from '@/store';
import { MONTH_NAMES } from '@/lib/constants';
import { fadeInUp, staggerGrid, staggerGridItem } from '@/lib/motion';
import { useBudgetData } from '@/hooks/useBudgetData';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { BudgetOverview } from '@/components/budget/BudgetOverview';
import { BudgetCategoryCard } from '@/components/budget/BudgetCategoryCard';
import { UnbudgetedCategories } from '@/components/budget/UnbudgetedCategories';

export default function BudgetPage() {
  const locale = useLocale();
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);

  const {
    budgetedCategories,
    unbudgetedCategories,
    totalBudget,
    totalSpent,
    updateBudget,
    isLoading,
  } = useBudgetData();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <PageHeader title={t(locale, 'budgetPage')} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-border bg-card h-24 animate-pulse rounded-2xl border" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-border bg-card h-32 animate-pulse rounded-2xl border" />
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = budgetedCategories.length === 0 && unbudgetedCategories.length === 0;

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
      <motion.div {...fadeInUp}>
        <PageHeader title={t(locale, 'budgetPage')} description={`${MONTH_NAMES[month]} ${year}`} />
      </motion.div>

      {isEmpty ? (
        <motion.div {...fadeInUp}>
          <EmptyState
            title={t(locale, 'noBudgetCategories')}
            icon={<Target className="h-12 w-12" />}
          />
        </motion.div>
      ) : (
        <>
          <BudgetOverview totalBudget={totalBudget} totalSpent={totalSpent} />

          {budgetedCategories.length > 0 && (
            <motion.div
              variants={staggerGrid}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {budgetedCategories.map((cat) => (
                <motion.div key={cat.id} variants={staggerGridItem}>
                  <BudgetCategoryCard category={cat} onUpdateBudget={updateBudget} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {unbudgetedCategories.length > 0 && (
            <UnbudgetedCategories categories={unbudgetedCategories} onSetBudget={updateBudget} />
          )}
        </>
      )}
    </div>
  );
}
