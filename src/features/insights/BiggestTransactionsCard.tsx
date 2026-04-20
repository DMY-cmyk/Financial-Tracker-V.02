'use client';

import { motion } from 'framer-motion';
import { fadeInUp, staggerList, staggerListItem } from '@/lib/motion';
import { t } from '@/lib/i18n';
import type { BiggestTransaction } from '@/lib/api/contracts';

interface BiggestTransactionsCardProps {
  transactions: BiggestTransaction[];
  locale: 'en' | 'id';
}

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

function formatDate(dateStr: string, locale: 'en' | 'id'): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

export function BiggestTransactionsCard({ transactions, locale }: BiggestTransactionsCardProps) {
  const items = transactions.slice(0, 5);

  return (
    <motion.div
      {...fadeInUp}
      className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
    >
      <h3 className="mb-4 text-sm font-semibold">{t(locale, 'biggestTransactions')}</h3>

      {items.length === 0 ? (
        <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
          {t(locale, 'noExpensesThisMonth')}
        </div>
      ) : (
        <motion.ul variants={staggerList} initial="hidden" animate="show" className="space-y-3">
          {items.map((tx) => (
            <motion.li
              key={tx.id}
              variants={staggerListItem}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  aria-hidden="true"
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: tx.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{tx.description}</p>
                  <p className="text-muted-foreground text-xs">
                    {tx.category} &middot; {formatDate(tx.date, locale)}
                  </p>
                </div>
              </div>
              <span className="flex-shrink-0 font-mono text-sm font-semibold text-red-500">
                -{idrFormatter.format(tx.amount)}
              </span>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </motion.div>
  );
}
