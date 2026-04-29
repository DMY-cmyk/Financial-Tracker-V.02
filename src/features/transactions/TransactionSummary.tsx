'use client';

import { formatCurrency } from '@/lib/formatters';
import { t, useLocale } from '@/lib/i18n';

interface TransactionSummaryProps {
  income: number;
  expense: number;
}

export function TransactionSummary({ income, expense }: TransactionSummaryProps) {
  const locale = useLocale();
  const net = income - expense;

  return (
    <div className="border-border bg-card shadow-card flex flex-wrap gap-3 rounded-2xl border p-4">
      <div className="flex-1 text-center">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {t(locale, 'income')}
        </p>
        <p className="mt-1 font-mono text-lg font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
          {formatCurrency(income)}
        </p>
      </div>
      <div className="bg-border-subtle w-px" />
      <div className="flex-1 text-center">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {t(locale, 'expense')}
        </p>
        <p className="mt-1 font-mono text-lg font-semibold text-red-600 tabular-nums dark:text-red-400">
          {formatCurrency(expense)}
        </p>
      </div>
      <div className="bg-border-subtle w-px" />
      <div className="flex-1 text-center">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {t(locale, 'netBalance')}
        </p>
        <p className="mt-1 font-mono text-lg font-semibold tabular-nums">{formatCurrency(net)}</p>
      </div>
    </div>
  );
}
