'use client';

import { motion } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { staggerList, staggerListItem, fadeInUp } from '@/lib/motion';
import type { BulkImportRow, BulkImportResult, Category, PaymentMethod } from '@/lib/types';

interface ImportPreviewProps {
  result: BulkImportResult;
  onRemoveRow: (rowIndex: number) => void;
  onUpdateRow: (rowIndex: number, updates: Partial<BulkImportRow>) => void;
  onImport: (validOnly?: boolean) => void;
  categories: Category[];
  paymentMethods: PaymentMethod[];
}

const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

export function ImportPreview({
  result,
  onRemoveRow,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdateRow,
  onImport,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  categories,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  paymentMethods,
}: ImportPreviewProps) {
  const locale = useLocale();
  const { rows, validCount, invalidCount, totalIncome, totalExpense } = result;

  const handleRemoveInvalid = () => {
    const invalidIndices = rows
      .filter((r) => !r.isValid)
      .map((r) => r.rowIndex)
      .reverse();
    invalidIndices.forEach((idx) => onRemoveRow(idx));
  };

  if (rows.length === 0) {
    return (
      <motion.div {...fadeInUp} className="border-border bg-card rounded-2xl border p-8">
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8">
          <AlertCircle className="h-10 w-10 opacity-40" />
          <p className="text-sm">{t(locale, 'noData')}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <motion.div {...fadeInUp} className="border-border bg-card rounded-2xl border p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {rows.length} {t(locale, 'row')}
          </span>
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            {validCount} {t(locale, 'validRows')}
          </Badge>
          {invalidCount > 0 && (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {invalidCount} {t(locale, 'invalidRows')}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{t(locale, 'totalIncomeLabel')}: </span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {formatIDR(totalIncome)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">{t(locale, 'totalExpenseLabel')}: </span>
            <span className="font-mono font-semibold text-red-600 dark:text-red-400">
              {formatIDR(totalExpense)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        {...fadeInUp}
        className="flex flex-wrap gap-2"
        transition={{ ...fadeInUp.transition, delay: 0.1 }}
      >
        <Button onClick={() => onImport(true)} disabled={validCount === 0}>
          {t(locale, 'importValid')} ({validCount})
        </Button>
        <Button variant="outline" onClick={() => onImport(false)} disabled={rows.length === 0}>
          {t(locale, 'importAll')}
        </Button>
        {invalidCount > 0 && (
          <Button variant="ghost" onClick={handleRemoveInvalid}>
            {t(locale, 'removeInvalid')}
          </Button>
        )}
      </motion.div>

      {/* Transaction List */}
      <motion.div
        variants={staggerList}
        initial="hidden"
        animate="show"
        className="space-y-2"
      >
        {rows.map((row) => (
          <motion.div
            key={row.rowIndex}
            variants={staggerListItem}
            className={cn(
              'border-border bg-card rounded-2xl border p-4 transition-colors',
              !row.isValid && 'border-l-4 border-l-red-500'
            )}
          >
            <div className="flex items-start gap-3">
              {/* Type Badge */}
              <Badge
                className={cn(
                  'mt-0.5 shrink-0',
                  row.type === 'income'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                )}
              >
                {t(locale, row.type === 'income' ? 'income' : 'expense')}
              </Badge>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-muted-foreground text-xs">{row.date}</span>
                  <span className="text-xs font-medium">{row.category}</span>
                  {row.description && (
                    <span className="text-muted-foreground truncate text-xs">
                      {row.description}
                    </span>
                  )}
                </div>
                {row.paymentMethod && (
                  <span className="text-muted-foreground text-[10px]">{row.paymentMethod}</span>
                )}
              </div>

              {/* Amount */}
              <span
                className={cn(
                  'shrink-0 font-mono text-sm font-semibold',
                  row.type === 'income'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {formatIDR(row.amount)}
              </span>

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRemoveRow(row.rowIndex)}
                aria-label={t(locale, 'delete')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Errors */}
            {!row.isValid && row.errors.length > 0 && (
              <div className="mt-2 space-y-0.5 pl-8">
                {row.errors.map((err, i) => (
                  <p key={i} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {err}
                  </p>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
