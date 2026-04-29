'use client';

import { Transaction } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CategoryChip } from './CategoryChip';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';
import { Pencil, Trash2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';

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
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: -16, transition: { duration: 0.2 } },
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
                <motion.div
                  key={tx.id}
                  layout
                  variants={rowVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className={cn(
                    'group bg-card hover:border-border-subtle hover:bg-surface-inset hover:shadow-card flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all',
                    hasSelection && selectedIds.has(tx.id) && 'border-primary/30 bg-primary/5'
                  )}
                >
                  {hasSelection && (
                    <Checkbox
                      checked={selectedIds.has(tx.id)}
                      onCheckedChange={() => onToggleSelect(tx.id)}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tx.description}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <CategoryChip category={tx.category} />
                      <span className="text-muted-foreground text-[10px]">{tx.paymentMethod}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'font-mono text-sm font-semibold whitespace-nowrap tabular-nums',
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
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="border-border bg-card shadow-card flex items-center justify-between rounded-2xl border px-4 py-3">
          <span className="text-muted-foreground text-xs tabular-nums">
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
