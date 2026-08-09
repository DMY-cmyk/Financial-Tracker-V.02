'use client';

import { motion } from 'framer-motion';
import { t } from '@/lib/i18n';
import { staggerGrid } from '@/lib/motion';
import { BalanceCard } from './BalanceCard';
import type { PaymentMethodBalance } from './types';

interface BalanceGridProps {
  balances: PaymentMethodBalance[];
  locale: 'en' | 'id';
  isLoading?: boolean;
  onCardClick?: (paymentMethodName: string) => void;
}

export function BalanceGrid({ balances, locale, isLoading, onCardClick }: BalanceGridProps) {
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
        {t(locale, 'noPaymentMethodsYet')}
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
        <BalanceCard
          key={b.id}
          balance={b}
          locale={locale}
          onClick={onCardClick ? () => onCardClick(b.name) : undefined}
        />
      ))}
    </motion.div>
  );
}
