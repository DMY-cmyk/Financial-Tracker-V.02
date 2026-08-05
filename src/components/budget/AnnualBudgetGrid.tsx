'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { t, type Locale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { BudgetCell } from './BudgetCell';
import type { AnnualBudgetRow } from '@/hooks/useAnnualBudget';

const MONTH_ABBR: Record<'en' | 'id', string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
};

interface AnnualBudgetGridProps {
  rows: AnnualBudgetRow[];
  monthlyTotals: number[];
  currentMonth: number;
  currentYear: number;
  locale: Locale;
  onSave: (categoryId: string, month: number, amount: number) => Promise<boolean>;
  onClear: (categoryId: string, month: number) => Promise<boolean>;
  isLoading: boolean;
}

export function AnnualBudgetGrid({
  rows,
  monthlyTotals,
  currentMonth,
  locale,
  onSave,
  onClear,
  isLoading,
}: AnnualBudgetGridProps) {
  const handleSave = useCallback(
    (categoryId: string, month: number) => async (amount: number) => {
      return onSave(categoryId, month, amount);
    },
    [onSave]
  );

  const handleClear = useCallback(
    (categoryId: string, month: number) => async () => {
      return onClear(categoryId, month);
    },
    [onClear]
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-muted h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full border-collapse text-sm" style={{ minWidth: '900px' }}>
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="bg-muted/50 text-muted-foreground sticky left-0 z-10 px-4 py-3 text-left font-medium">
              {t(locale, 'category')}
            </th>
            {MONTH_ABBR[locale].map((abbr, m) => (
              <th
                key={m}
                className={cn(
                  'text-muted-foreground px-2 py-3 text-center font-medium',
                  m === currentMonth && 'border-primary/40 text-primary border-l-2'
                )}
              >
                {abbr}
              </th>
            ))}
            <th className="text-muted-foreground px-3 py-3 text-center font-medium">Σ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="bg-card sticky left-0 z-10 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: row.category.color }}
                  />
                  <span className="text-foreground font-medium">{row.category.name}</span>
                </div>
              </td>
              {row.cells.map((cell) => (
                <td
                  key={cell.month}
                  className={cn(
                    'px-1 py-1.5 text-center',
                    cell.month === currentMonth && 'border-primary/20 border-l-2'
                  )}
                >
                  <BudgetCell
                    month={cell.month}
                    effectiveBudget={cell.effectiveBudget}
                    hasOverride={cell.hasOverride}
                    spent={cell.spent}
                    percentage={cell.percentage}
                    isPast={cell.month < currentMonth}
                    isCurrent={cell.month === currentMonth}
                    locale={locale}
                    onSave={handleSave(row.category.id, cell.month)}
                    onClear={handleClear(row.category.id, cell.month)}
                  />
                </td>
              ))}
              <td className="text-muted-foreground px-3 py-2 text-center font-mono text-xs">
                {formatCurrency(row.annualTotal)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/30 border-t">
            <td className="bg-muted/30 text-muted-foreground sticky left-0 z-10 px-4 py-2 text-xs">
              {t(locale, 'monthlyTotal')}
            </td>
            {monthlyTotals.map((total, m) => (
              <td
                key={m}
                className={cn(
                  'text-muted-foreground px-2 py-2 text-center font-mono text-xs',
                  m === currentMonth && 'border-primary/20 border-l-2'
                )}
              >
                {formatCurrency(total)}
              </td>
            ))}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
