'use client';

import { formatCurrency } from '@/lib/formatters';
import { t, useLocale } from '@/lib/i18n';

interface TransactionSummaryProps {
  income: number;
  expense: number;
}

export function TransactionSummary({ income, expense }: TransactionSummaryProps) {
  const locale = useLocale();

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex-1 text-center">
        <p className="text-xs text-muted-foreground">{t(locale, 'income')}</p>
        <p className="mt-1 font-mono text-lg font-semibold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(income)}
        </p>
      </div>
      <div className="w-px bg-border" />
      <div className="flex-1 text-center">
        <p className="text-xs text-muted-foreground">{t(locale, 'expense')}</p>
        <p className="mt-1 font-mono text-lg font-semibold text-red-600 dark:text-red-400">
          {formatCurrency(expense)}
        </p>
      </div>
      <div className="w-px bg-border" />
      <div className="flex-1 text-center">
        <p className="text-xs text-muted-foreground">{t(locale, 'netBalance')}</p>
        <p className="mt-1 font-mono text-lg font-semibold">
          {formatCurrency(income - expense)}
        </p>
      </div>
    </div>
  );
}
