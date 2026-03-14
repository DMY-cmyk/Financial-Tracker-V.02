'use client';

import { Transaction } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CategoryChip } from './CategoryChip';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
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
  page = 1,
  totalPages = 1,
  onPageChange,
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

  return (
    <div className="space-y-4">
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
                  className="group bg-card hover:border-border hover:bg-muted/30 flex items-center gap-3 rounded-xl border border-transparent p-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tx.description}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <CategoryChip category={tx.category} />
                      <span className="text-muted-foreground text-[10px]">{tx.paymentMethod}</span>
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
        <div className="border-border flex items-center justify-between rounded-2xl border px-4 py-3">
          <span className="text-muted-foreground text-xs">
            {locale === 'id' ? `Halaman ${page} dari ${totalPages}` : `Page ${page} of ${totalPages}`}
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
