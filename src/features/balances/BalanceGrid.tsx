'use client';

import { motion } from 'framer-motion';
import { staggerGrid } from '@/lib/motion';
import { BalanceCard } from './BalanceCard';
import type { PaymentMethodBalance } from './types';

interface BalanceGridProps {
  balances: PaymentMethodBalance[];
  locale: 'en' | 'id';
  isLoading?: boolean;
}

export function BalanceGrid({ balances, locale, isLoading }: BalanceGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-muted h-28 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        {locale === 'id' ? 'Belum ada metode pembayaran.' : 'No payment methods yet.'}
      </p>
    );
  }

  return (
    <motion.div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      variants={staggerGrid}
      initial="hidden"
      animate="show"
    >
      {balances.map((b) => (
        <BalanceCard key={b.id} balance={b} locale={locale} />
      ))}
    </motion.div>
  );
}
