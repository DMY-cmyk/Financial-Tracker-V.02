'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Liability } from '@/lib/types';

const CATEGORY_STYLES: Record<string, string> = {
  loan: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  credit_card: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  other: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

interface LiabilitiesListProps {
  liabilities: Liability[];
  onAdd: () => void;
  onEdit: (liability: Liability) => void;
  onDelete: (id: string) => void;
}

export function LiabilitiesList({
  liabilities,
  onAdd,
  onEdit,
  onDelete,
}: LiabilitiesListProps) {
  const locale = useLocale();

  const total = liabilities.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wide">
          {t(locale, 'liabilities')}
        </p>
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={onAdd}>
          <Plus className="h-3 w-3" />
          {t(locale, 'add')}
        </Button>
      </div>

      {liabilities.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">
          {t(locale, 'noLiabilities')}
        </p>
      ) : (
        <div className="space-y-2">
          {liabilities.map((liability) => (
            <div
              key={liability.id}
              className="group flex items-center justify-between rounded-xl bg-red-50 px-3 py-2.5 dark:bg-red-950/20"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{liability.name}</p>
                <span
                  className={cn(
                    'mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold',
                    CATEGORY_STYLES[liability.category]
                  )}
                >
                  {t(locale, liability.category === 'loan'
                    ? 'loanType'
                    : liability.category === 'credit_card'
                    ? 'creditCardType'
                    : 'otherType'
                  )}
                </span>
              </div>
              <div className="ml-3 flex items-center gap-1.5">
                <span className="font-mono text-xs text-red-600 dark:text-red-400">
                  {formatCurrency(liability.amount)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => onEdit(liability)}
                  aria-label={t(locale, 'edit')}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => onDelete(liability.id)}
                  aria-label={t(locale, 'delete')}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-border mt-3 flex justify-between border-t pt-3 text-sm font-bold">
        <span>{t(locale, 'totalLiabilities')}</span>
        <span className="font-mono text-red-600 dark:text-red-400">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
