'use client';

import { useState } from 'react';
import { Transaction } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CategoryChip } from './CategoryChip';
import { SplitBadge } from '@/components/transactions/SplitBadge';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';
import { Pencil, Trash2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn } from '@/lib/motion';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (tx: Transaction) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
}

const rowVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: fadeIn.transition },
  exit: { opacity: 0, x: -16, transition: fadeIn.transition },
};

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  onDuplicate,
  page = 1,
  totalPages = 1,
  onPageChange,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  isAllSelected,
}: TransactionTableProps) {
  const locale = useLocale();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (transactions.length === 0) {
    return (
      <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
        {t(locale, 'noData')}
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, Transaction[]> = {};
  transactions.forEach((tx) => {
    const key = tx.date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(tx);
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const hasSelection = selectedIds !== undefined && onToggleSelect !== undefined;

  return (
    <div className="space-y-4">
      {hasSelection && onSelectAll && (
        <div className="flex items-center gap-3 px-3">
          <Checkbox checked={isAllSelected ?? false} onCheckedChange={() => onSelectAll()} />
          <span className="text-muted-foreground text-xs font-medium">
            {isAllSelected ? t(locale, 'deselectAll') : t(locale, 'selectAll')}
          </span>
        </div>
      )}
      {sortedDates.map((date) => (
        <div key={date}>
          <div className="text-muted-foreground mb-2 text-xs font-medium">
            {formatDate(date, locale)}
          </div>
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {grouped[date].map((tx) => (
                <div key={tx.id}>
                  <motion.div
                    layout
                    variants={rowVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className={cn(
                      'group bg-card hover:border-border hover:bg-muted/30 flex items-center gap-3 rounded-xl border border-transparent p-3 transition-colors',
                      hasSelection && selectedIds.has(tx.id) && 'border-primary/30 bg-primary/5',
                      tx.isSplit && expandedRows.has(tx.id) && 'rounded-b-none border-b-0'
                    )}
                  >
                    {hasSelection && (
                      <Checkbox
                        checked={selectedIds.has(tx.id)}
                        onCheckedChange={() => onToggleSelect(tx.id)}
                      />
                    )}
                    {tx.isSplit && (
                      <button
                        type="button"
                        onClick={() => toggleRow(tx.id)}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        aria-label={t(locale, 'expandSplits')}
                      >
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 transition-transform',
                            expandedRows.has(tx.id) && 'rotate-90'
                          )}
                        />
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{tx.description}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {tx.isSplit ? (
                          <SplitBadge locale={locale} />
                        ) : (
                          <CategoryChip category={tx.category} />
                        )}
                        <span className="text-muted-foreground text-[10px]">
                          {tx.paymentMethod}
                          {tx.isSplit && tx.splits && (
                            <>
                              {' '}
                              &middot; {tx.splits.length} {t(locale, 'categories')}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'font-mono text-sm font-semibold whitespace-nowrap',
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </span>
                    <div className="flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEdit(tx)}
                        aria-label={t(locale, 'edit')}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {onDuplicate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onDuplicate(tx)}
                          aria-label={t(locale, 'duplicate')}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-7 w-7"
                        onClick={() => onDelete(tx.id)}
                        aria-label={t(locale, 'delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                  <AnimatePresence>
                    {tx.isSplit && expandedRows.has(tx.id) && tx.splits && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={fadeIn.transition}
                        className="bg-muted/30 overflow-hidden rounded-b-xl border border-t-0 border-transparent pr-4 pl-10"
                      >
                        <div className="border-l-2 border-blue-200 py-2 pl-4 dark:border-blue-800">
                          {tx.splits.map((split) => (
                            <div
                              key={split.id}
                              className="text-muted-foreground flex items-center justify-between py-1 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <CategoryChip category={split.category} />
                                {split.description && (
                                  <span className="text-xs">{split.description}</span>
                                )}
                              </div>
                              <span className="font-mono text-xs">
                                {split.amount.toLocaleString('id-ID')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="border-border flex items-center justify-between rounded-2xl border px-4 py-3">
          <span className="text-muted-foreground text-xs">
            {locale === 'id'
              ? `Halaman ${page} dari ${totalPages}`
              : `Page ${page} of ${totalPages}`}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="h-8 w-8 p-0"
              aria-label={locale === 'id' ? 'Sebelumnya' : 'Previous'}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="h-8 w-8 p-0"
              aria-label={locale === 'id' ? 'Berikutnya' : 'Next'}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
