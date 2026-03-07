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
  const categories = useStore(s => s.categories);
  const locale = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t(locale, 'recentTransactions')}</h3>
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {t(locale, 'viewAll')}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
          {t(locale, 'noData')}
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const cat = categories.find(c => c.name === tx.category);
            const color = cat?.color || CATEGORY_COLORS[tx.category] || '#6B7280';

            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
              >
                <div
                  className="h-8 w-8 flex-shrink-0 rounded-lg"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <div className="flex h-full w-full items-center justify-center">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-[10px] text-muted-foreground">
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
