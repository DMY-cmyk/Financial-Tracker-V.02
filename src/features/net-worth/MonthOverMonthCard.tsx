'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { NetWorthSnapshot } from '@/lib/types';

interface MonthOverMonthCardProps {
  history: NetWorthSnapshot[];
  isLoading: boolean;
}

export function MonthOverMonthCard({ history, isLoading }: MonthOverMonthCardProps) {
  const locale = useLocale();

  if (isLoading) {
    return <div className="border-border bg-card h-36 animate-pulse rounded-2xl border" />;
  }

  const lastTwo = history.slice(-2);
  const prev = lastTwo.length === 2 ? lastTwo[0] : null;
  const latest = lastTwo.length >= 1 ? lastTwo[lastTwo.length - 1] : null;
  const delta = prev && latest ? latest.netWorth - prev.netWorth : null;
  const pct =
    delta !== null && prev && prev.netWorth !== 0
      ? ((delta / Math.abs(prev.netWorth)) * 100).toFixed(1)
      : null;

  const positive = delta !== null && delta >= 0;

  return (
    <motion.div {...fadeInUp} className="border-border bg-card rounded-2xl border p-6">
      <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
        {t(locale, 'vsLastMonth')}
      </p>
      {delta === null ? (
        <p className="text-muted-foreground text-2xl font-bold">—</p>
      ) : (
        <>
          <p
            className={cn(
              'font-mono text-2xl font-extrabold',
              positive ? 'text-emerald-500' : 'text-destructive'
            )}
          >
            {positive ? '▲' : '▼'} {formatCurrency(Math.abs(delta))}
          </p>
          {pct && (
            <p className="text-muted-foreground mt-1 text-xs">
              {positive ? '+' : ''}
              {pct}% {locale === 'id' ? 'dari' : 'from'} {formatCurrency(prev!.netWorth)}
            </p>
          )}
        </>
      )}
      {latest && (
        <p className="text-muted-foreground mt-4 border-t pt-3 text-xs">
          {locale === 'id' ? 'Snapshot terakhir' : 'Last snapshot'}:{' '}
          {new Date(latest.year, latest.month).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US', {
            month: 'short',
            year: 'numeric',
          })}
        </p>
      )}
    </motion.div>
  );
}
