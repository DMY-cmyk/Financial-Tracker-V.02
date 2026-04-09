'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { t, useLocale } from '@/lib/i18n';
import { fadeInUp } from '@/lib/motion';
import type { ForecastCurrentMonth } from '@/lib/api/contracts';

interface CurrentMonthForecastCardProps {
  currentMonth: ForecastCurrentMonth;
}

export function CurrentMonthForecastCard({ currentMonth }: CurrentMonthForecastCardProps) {
  const locale = useLocale();
  const { actualIncome, actualExpense, projectedIncome, projectedExpense, projectedNet } =
    currentMonth;

  const totalExpectedIncome = actualIncome + projectedIncome;
  const totalExpectedExpense = actualExpense + projectedExpense;

  const rows = [
    {
      label: t(locale, 'income'),
      actual: actualIncome,
      projected: projectedIncome,
      total: totalExpectedIncome,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: t(locale, 'expense'),
      actual: actualExpense,
      projected: projectedExpense,
      total: totalExpectedExpense,
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/30',
    },
  ];

  return (
    <motion.div
      {...fadeInUp}
      className="border-border bg-card rounded-2xl border p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="text-primary h-4 w-4" />
        <h3 className="text-sm font-semibold">{t(locale, 'expectedThisMonth')}</h3>
      </div>

      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div className={`rounded-md p-1 ${row.bg}`}>
                <row.icon className={`h-3 w-3 ${row.color}`} />
              </div>
              <span className="text-muted-foreground text-xs font-medium">{row.label}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pl-6 text-xs">
              <div>
                <p className="text-muted-foreground text-[10px]">{t(locale, 'actualSoFar')}</p>
                <p className="font-mono font-semibold">{formatCurrency(row.actual)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px]">{t(locale, 'projected')}</p>
                <p className="font-mono font-semibold">{formatCurrency(row.projected)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px]">Total</p>
                <p className={`font-mono font-semibold ${row.color}`}>
                  {formatCurrency(row.total)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Net row */}
        <div className="border-border mt-2 border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">
              {t(locale, 'projectedNet')}
            </span>
            <span
              className={`font-mono text-sm font-bold ${
                projectedNet >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {projectedNet >= 0 ? '+' : ''}
              {formatCurrency(projectedNet)}
            </span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-muted-foreground mt-4 flex items-center gap-1.5 text-[10px]">
        <Info className="h-3 w-3 flex-shrink-0" />
        <span>{t(locale, 'forecastBasis')}</span>
      </div>
    </motion.div>
  );
}
