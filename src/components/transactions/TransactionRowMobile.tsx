'use client';

import { Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDateShort } from '@/lib/formatters';
import { useLocale } from '@/lib/i18n';
import type { Transaction, Category } from '@/lib/types';

export interface TransactionRowMobileProps {
  transaction: Transaction;
  category: Category;
  onTap?: () => void;
}

export function TransactionRowMobile({ transaction, category, onTap }: TransactionRowMobileProps) {
  const locale = useLocale();
  const isExpense = transaction.type === 'expense';
  const when = formatDateShort(transaction.date, locale);

  return (
    <button
      type="button"
      onClick={onTap}
      className="hover:bg-muted/40 flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors"
    >
      <div className="bg-tile text-tile-foreground flex h-13 w-13 items-center justify-center rounded-2xl">
        <Tag className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{transaction.description}</p>
        <p className="text-secondary-foreground text-[12px] italic">{when}</p>
      </div>
      <div className="text-muted-foreground text-[12px]">{category.name}</div>
      <div
        data-amount
        className={cn(
          'font-mono text-sm tabular-nums',
          isExpense ? 'text-destructive' : 'text-foreground'
        )}
      >
        {isExpense ? '-' : '+'}
        {formatCurrency(transaction.amount)}
      </div>
    </button>
  );
}
