'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { staggerGridItem, tapScale } from '@/lib/motion';
import { t } from '@/lib/i18n';
import { PaymentMethodIcon } from '@/components/shared/PaymentMethodIcon';
import type { PaymentMethodBalance } from './types';

const TYPE_LABELS: Record<PaymentMethodBalance['type'], { en: string; id: string }> = {
  bank: { en: 'Bank', id: 'Bank' },
  cash: { en: 'Cash', id: 'Tunai' },
  ewallet: { en: 'E-Wallet', id: 'E-Wallet' },
};

interface BalanceCardProps {
  balance: PaymentMethodBalance;
  locale: 'en' | 'id';
  onClick?: () => void;
}

export function BalanceCard({ balance, locale, onClick }: BalanceCardProps) {
  const typeLabel = TYPE_LABELS[balance.type][locale];
  const closingPositive = balance.balance >= 0;

  return (
    <motion.div
      variants={staggerGridItem}
      whileTap={onClick ? tapScale : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'bg-card border-border rounded-2xl border p-4 shadow-sm',
        onClick && 'hover:border-primary/50 cursor-pointer transition-colors'
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <PaymentMethodIcon
          name={balance.name}
          icon={balance.icon}
          type={balance.type}
          size="md"
        />
        <div>
          <p className="text-sm font-medium">{balance.name}</p>
          <p className="text-muted-foreground text-xs">{typeLabel}</p>
        </div>
      </div>

      {/* Ledger rows */}
      <div className="space-y-1 text-xs">
        <div className="text-muted-foreground flex justify-between">
          <span>{t(locale, 'beginningBalance')}</span>
          <span className="font-mono">{formatCurrency(balance.beginningBalance)}</span>
        </div>
        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {t(locale, 'income')}
          </span>
          <span className="font-mono">+{formatCurrency(balance.income)}</span>
        </div>
        <div className="flex justify-between text-red-500">
          <span className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            {t(locale, 'expense')}
          </span>
          <span className="font-mono">-{formatCurrency(balance.expense)}</span>
        </div>
        <div
          className={cn(
            'border-border mt-2 flex justify-between border-t pt-2 font-medium',
            closingPositive ? 'text-foreground' : 'text-destructive'
          )}
        >
          <span>{t(locale, 'closing')}</span>
          <span className="font-mono">{formatCurrency(balance.balance)}</span>
        </div>
      </div>
    </motion.div>
  );
}
