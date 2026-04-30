'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/motion';
import type { NetWorthCurrent } from '@/lib/types';

interface NetWorthSummaryCardProps {
  current: NetWorthCurrent | null;
  isLoading: boolean;
}

export function NetWorthSummaryCard({ current, isLoading }: NetWorthSummaryCardProps) {
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="h-36 animate-pulse rounded-2xl bg-gradient-to-br from-blue-900 to-blue-600" />
    );
  }

  return (
    <motion.div
      {...fadeInUp}
      className="rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] p-6 text-white"
    >
      <p className="mb-1 text-xs font-semibold tracking-wide uppercase opacity-70">
        {t(locale, 'netWorth')}
      </p>
      <p className="font-mono text-3xl font-extrabold">{formatCurrency(current?.netWorth ?? 0)}</p>
      <div className="mt-4 flex gap-6 border-t border-white/20 pt-4 text-xs">
        <div>
          <p className="opacity-60">{t(locale, 'totalAssets')}</p>
          <p className="font-mono font-semibold">{formatCurrency(current?.totalAssets ?? 0)}</p>
        </div>
        <div>
          <p className="opacity-60">{t(locale, 'totalLiabilities')}</p>
          <p className="font-mono font-semibold">
            {formatCurrency(current?.totalLiabilities ?? 0)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
