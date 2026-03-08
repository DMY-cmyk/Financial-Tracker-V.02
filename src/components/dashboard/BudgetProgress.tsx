'use client';

import { useBudgetStatus } from '@/store/selectors';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function BudgetProgress() {
  const budgets = useBudgetStatus();
  const locale = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="border-border bg-card rounded-2xl border p-6"
    >
      <h3 className="mb-4 text-sm font-semibold">{t(locale, 'budgetProgress')}</h3>

      {budgets.length === 0 ? (
        <div className="text-muted-foreground flex h-20 items-center justify-center text-sm">
          {t(locale, 'noData')}
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map((b) => {
            const isOver = b.percentage >= 100;
            const isWarning = b.percentage >= 80 && !isOver;

            return (
              <div key={b.category}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="font-medium">{b.category}</span>
                  </div>
                  <span className="text-muted-foreground font-mono">
                    {formatCurrency(b.spent)} / {formatCurrency(b.budget)}
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700 ease-out',
                      isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                  />
                </div>
                {isOver && (
                  <p className="mt-1 text-[10px] font-medium text-red-500">
                    {t(locale, 'overBudget')} ({formatCurrency(Math.abs(b.remaining))})
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
