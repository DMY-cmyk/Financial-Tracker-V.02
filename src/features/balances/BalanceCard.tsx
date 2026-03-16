'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Building2, Wallet, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { staggerGridItem, tapScale } from '@/lib/motion';
import type { PaymentMethodBalance } from './types';

const TYPE_LABELS: Record<PaymentMethodBalance['type'], { en: string; id: string }> = {
  bank: { en: 'Bank', id: 'Bank' },
  cash: { en: 'Cash', id: 'Tunai' },
  ewallet: { en: 'E-Wallet', id: 'E-Wallet' },
};

const TYPE_ICONS: Record<PaymentMethodBalance['type'], typeof Building2> = {
  bank: Building2,
  cash: Wallet,
  ewallet: Smartphone,
};

interface BalanceCardProps {
  balance: PaymentMethodBalance;
  locale: 'en' | 'id';
}

export function BalanceCard({ balance, locale }: BalanceCardProps) {
  const Icon = TYPE_ICONS[balance.type];
  const typeLabel = TYPE_LABELS[balance.type][locale];
  const isPositive = balance.balance > 0;

  return (
    <motion.div
      variants={staggerGridItem}
      whileTap={tapScale}
      className="bg-card border-border rounded-2xl border p-4 shadow-sm"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
            <Icon className="text-primary h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{balance.name}</p>
            <p className="text-muted-foreground text-xs">{typeLabel}</p>
          </div>
        </div>
      </div>

      {/* Balance */}
      <p
        className={cn(
          'font-mono text-xl font-bold tracking-tight',
          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
        )}
      >
        {formatCurrency(balance.balance)}
      </p>

      {/* Income / Expense breakdown */}
      <div className="mt-2 flex gap-3">
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          {formatCurrency(balance.income)}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <TrendingDown className="h-3 w-3 text-red-500" />
          {formatCurrency(balance.expense)}
        </span>
      </div>
    </motion.div>
  );
}
