'use client';

import Link from 'next/link';
import { useRecentTransactions } from '@/store/selectors';
import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency, formatDateShort } from '@/lib/formatters';
import { CATEGORY_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function RecentTransactions() {
  const transactions = useRecentTransactions(5);
  const categories = useStore((s) => s.categories);
  const locale = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="border-border bg-card rounded-2xl border p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t(locale, 'recentTransactions')}</h3>
        <Link
          href="/transactions"
          className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
        >
          {t(locale, 'viewAll')}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="text-muted-foreground flex h-20 items-center justify-center text-sm">
          {t(locale, 'noData')}
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const cat = categories.find((c) => c.name === tx.category);
            const color = cat?.color || CATEGORY_COLORS[tx.category] || '#6B7280';

            return (
              <div
                key={tx.id}
                className="hover:bg-muted/50 flex items-center gap-3 rounded-lg p-2 transition-colors"
              >
                <div
                  className="h-8 w-8 flex-shrink-0 rounded-lg"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tx.description}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {formatDateShort(tx.date)} &middot; {tx.category}
                  </p>
                </div>
                <span
                  className={cn(
                    'font-mono text-sm font-semibold',
                    tx.type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {tx.type === 'income' ? '+' : '-'}
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
