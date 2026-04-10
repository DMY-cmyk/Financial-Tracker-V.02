'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { NetWorthCurrent, NetWorthSnapshot } from '@/lib/types';

interface NetWorthDashboardWidgetProps {
  current: NetWorthCurrent | null;
  history: NetWorthSnapshot[];
  isLoading: boolean;
}

export function NetWorthDashboardWidget({
  current,
  history,
  isLoading,
}: NetWorthDashboardWidgetProps) {
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="h-28 animate-pulse rounded-2xl bg-gradient-to-br from-blue-900 to-blue-600" />
    );
  }

  const lastTwo = history.slice(-2);
  const prev = lastTwo.length === 2 ? lastTwo[0] : null;
  const latest = lastTwo.length >= 1 ? lastTwo[lastTwo.length - 1] : null;
  const delta = prev && latest ? latest.netWorth - prev.netWorth : null;
  const positive = delta !== null && delta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Link href="/net-worth" className="block">
        <div className="rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] p-5 text-white transition-opacity hover:opacity-90">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
            {t(locale, 'netWorth')}
          </p>
          <p className="font-mono text-2xl font-extrabold">
            {formatCurrency(current?.netWorth ?? 0)}
          </p>
          {delta !== null && (
            <p
              className={cn(
                'mt-2 text-xs',
                positive ? 'text-emerald-300' : 'text-red-300'
              )}
            >
              {positive ? '▲' : '▼'} {formatCurrency(Math.abs(delta))}{' '}
              {locale === 'id' ? 'vs bulan lalu' : 'vs last month'}
            </p>
          )}
          <div className="mt-3 flex gap-4 border-t border-white/20 pt-3 text-[10px]">
            <div>
              <span className="opacity-60">{t(locale, 'assets')}: </span>
              <span className="font-mono font-semibold">
                {formatCurrency(current?.totalAssets ?? 0)}
              </span>
            </div>
            <div>
              <span className="opacity-60">{t(locale, 'liabilities')}: </span>
              <span className="font-mono font-semibold">
                {formatCurrency(current?.totalLiabilities ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
