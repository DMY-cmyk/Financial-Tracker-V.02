'use client';

import { motion } from 'framer-motion';
import { Target, TrendingDown, Wallet } from 'lucide-react';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { staggerGrid, staggerGridItem } from '@/lib/motion';

interface BudgetOverviewProps {
  totalBudget: number;
  totalSpent: number;
}

export function BudgetOverview({ totalBudget, totalSpent }: BudgetOverviewProps) {
  const locale = useLocale();
  const remaining = totalBudget - totalSpent;
  const percentage = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const isOver = totalSpent > totalBudget;

  return (
    <div className="space-y-4">
      <motion.div
        variants={staggerGrid}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <motion.div variants={staggerGridItem}>
          <SummaryCard
            label={t(locale, 'totalBudget')}
            value={formatCurrency(totalBudget)}
            icon={Target}
            color="default"
          />
        </motion.div>
        <motion.div variants={staggerGridItem}>
          <SummaryCard
            label={t(locale, 'totalSpent')}
            value={formatCurrency(totalSpent)}
            icon={TrendingDown}
            color="danger"
          />
        </motion.div>
        <motion.div variants={staggerGridItem}>
          <SummaryCard
            label={t(locale, 'remaining')}
            value={formatCurrency(Math.abs(remaining))}
            icon={Wallet}
            color={isOver ? 'danger' : 'success'}
          />
        </motion.div>
      </motion.div>

      {totalBudget > 0 && (
        <div className="border-border bg-card rounded-2xl border p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">{t(locale, 'budgetOverview')}</span>
            <span className="font-mono font-medium">
              {percentage.toFixed(0)}% {t(locale, 'percentUsed')}
            </span>
          </div>
          <div className="bg-muted h-3 overflow-hidden rounded-full">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                percentage >= 100
                  ? 'bg-red-500'
                  : percentage >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
