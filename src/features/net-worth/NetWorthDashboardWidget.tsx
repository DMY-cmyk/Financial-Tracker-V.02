'use client';

import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/motion';
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
    <motion.div {...fadeInUp}>
      <Link href="/net-worth" className="group block">
        <div className="shadow-card hover:shadow-elevated relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#3b82f6] p-5 text-white transition-all duration-300 hover:-translate-y-0.5">
          {/* Soft white glow in upper-right */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full opacity-30 blur-3xl"
            style={{ background: 'rgb(255 255 255 / 0.4)' }}
          />
          <div className="relative">
            <p className="mb-1 text-[10px] font-semibold tracking-[0.16em] uppercase opacity-75">
              {t(locale, 'netWorth')}
            </p>
            <p className="font-mono text-2xl leading-tight font-extrabold tabular-nums">
              {formatCurrency(current?.netWorth ?? 0)}
            </p>
            {delta !== null && (
              <p
                className={cn(
                  'mt-2 text-xs font-medium tabular-nums',
                  positive ? 'text-emerald-300' : 'text-red-300'
                )}
              >
                {positive ? '▲' : '▼'} {formatCurrency(Math.abs(delta))} {t(locale, 'vsLastMonth')}
              </p>
            )}
            <div className="mt-3 flex gap-4 border-t border-white/15 pt-3 text-[10px]">
              <div>
                <span className="tracking-wider uppercase opacity-65">{t(locale, 'assets')}: </span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatCurrency(current?.totalAssets ?? 0)}
                </span>
              </div>
              <div>
                <span className="tracking-wider uppercase opacity-65">
                  {t(locale, 'liabilities')}:{' '}
                </span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatCurrency(current?.totalLiabilities ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
