'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { t, useLocale } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import type { ForecastMonth } from '@/lib/api/contracts';

interface ForecastBreakdownListProps {
  forecast: ForecastMonth[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface ForecastMonthItemProps {
  forecastMonth: ForecastMonth;
}

function ForecastMonthItem({ forecastMonth }: ForecastMonthItemProps) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const { month, year, projectedIncome, projectedExpense, projectedNet, recurringItems } =
    forecastMonth;
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;

  return (
    <div className="border-border overflow-hidden rounded-xl border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-muted/40 flex w-full items-center justify-between px-4 py-3 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </motion.div>
          <span className="text-sm font-medium">{monthLabel}</span>
          {recurringItems.length === 0 && (
            <span className="text-muted-foreground text-xs">
              {t(locale, 'noRecurringForForecast')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-right">
          <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(projectedIncome)}
          </span>
          <span className="font-mono text-xs text-red-600 dark:text-red-400">
            -{formatCurrency(projectedExpense)}
          </span>
          <span
            className={`font-mono text-xs font-semibold ${
              projectedNet >= 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {projectedNet >= 0 ? '+' : ''}
            {formatCurrency(projectedNet)}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-border border-t px-4 py-3">
              {recurringItems.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  {t(locale, 'noRecurringForForecast')}
                </p>
              ) : (
                <div className="space-y-2">
                  {recurringItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.type === 'income' ? (
                          <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                        )}
                        <span className="text-xs">{item.description}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {item.frequency}
                          {item.occurrences > 1 ? ` ×${item.occurrences}` : ''}
                        </Badge>
                      </div>
                      <span
                        className={`font-mono text-xs font-medium ${
                          item.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {item.type === 'income' ? '+' : '-'}
                        {formatCurrency(item.amount * item.occurrences)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ForecastBreakdownList({ forecast }: ForecastBreakdownListProps) {
  const locale = useLocale();

  if (forecast.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t(locale, 'noData')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {forecast.map((f) => (
        <ForecastMonthItem
          key={`${f.year}-${f.month}`}
          forecastMonth={f}
        />
      ))}
    </div>
  );
}
