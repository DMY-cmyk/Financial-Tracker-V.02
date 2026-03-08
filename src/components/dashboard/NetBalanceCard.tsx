'use client';

import { useMonthlyBalance, useMonthlyIncome, useMonthlyExpense } from '@/store/selectors';
import { useStore } from '@/store';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';
import { MONTH_NAMES } from '@/lib/constants';
import { t, useLocale } from '@/lib/i18n';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { motion } from 'framer-motion';

export function NetBalanceCard() {
  const balance = useMonthlyBalance();
  const income = useMonthlyIncome();
  const expense = useMonthlyExpense();
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const locale = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="border-border bg-card relative overflow-hidden rounded-2xl border p-6"
    >
      <div className="bg-primary/5 absolute -top-8 -right-8 h-32 w-32 rounded-full" />
      <div className="bg-primary/10 absolute top-4 -right-4 h-16 w-16 rounded-full" />

      <p className="text-muted-foreground text-sm font-medium">
        {t(locale, 'netBalance')} &middot; {MONTH_NAMES[month]} {year}
      </p>

      <div className="mt-2">
        <AnimatedCounter
          value={balance}
          className="text-3xl font-bold tracking-tight sm:text-4xl"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 dark:bg-emerald-950/40">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {formatCurrency(income)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 dark:bg-red-950/40">
          <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
          <span className="text-xs font-medium text-red-700 dark:text-red-300">
            {formatCurrency(expense)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
