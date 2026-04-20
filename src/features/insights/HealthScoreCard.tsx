'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { fadeInUp } from '@/lib/motion';
import { t } from '@/lib/i18n';
import type { HealthScore } from '@/lib/api/contracts';

interface HealthScoreCardProps {
  healthScore: HealthScore;
  locale: 'en' | 'id';
}

const RING_RADIUS = 40;
const RING_STROKE = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function getRingColor(rate: number): string {
  if (rate > 20) return 'text-emerald-500';
  if (rate >= 0) return 'text-amber-500';
  return 'text-red-500';
}

export function HealthScoreCard({ healthScore, locale }: HealthScoreCardProps) {
  const { income, expense, savingsRate, lastMonthRate, rateChange } = healthScore;
  const clampedRate = Math.max(0, Math.min(100, savingsRate));
  const dashOffset = RING_CIRCUMFERENCE - (clampedRate / 100) * RING_CIRCUMFERENCE;
  const ringColor = getRingColor(savingsRate);

  return (
    <motion.div
      {...fadeInUp}
      className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:border-slate-700 dark:from-slate-800 dark:to-slate-950"
    >
      <h3 className="mb-4 text-sm font-semibold">{t(locale, 'healthScore')}</h3>

      <div className="flex flex-col items-center gap-6 sm:flex-row">
        {/* SVG Circular Ring */}
        <div className="relative flex-shrink-0">
          <svg
            role="img"
            aria-label={`${t(locale, 'healthScore')}: ${Math.round(savingsRate)}%`}
            width={RING_RADIUS * 2 + RING_STROKE * 2}
            height={RING_RADIUS * 2 + RING_STROKE * 2}
            className="-rotate-90"
          >
            {/* Background ring */}
            <circle
              cx={RING_RADIUS + RING_STROKE}
              cy={RING_RADIUS + RING_STROKE}
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={RING_STROKE}
              className="text-slate-200 dark:text-slate-700"
            />
            {/* Foreground ring */}
            <circle
              cx={RING_RADIUS + RING_STROKE}
              cy={RING_RADIUS + RING_STROKE}
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className={cn(ringColor, 'transition-all duration-500')}
            />
          </svg>
          {/* Rate number in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-xl font-bold">{Math.round(savingsRate)}%</span>
          </div>
        </div>

        {/* Income/Expense summary + comparison */}
        <div className="flex-1 space-y-3">
          {/* Comparison with last month */}
          {lastMonthRate !== null && rateChange !== null && (
            <div className="flex items-center gap-1.5">
              {rateChange >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  rateChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                )}
              >
                {rateChange >= 0 ? '+' : ''}
                {Math.round(rateChange)}% {t(locale, 'fromLastMonth')}
              </span>
            </div>
          )}

          {/* Income row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground text-xs">{t(locale, 'income')}</span>
            </div>
            <span className="font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {formatCurrency(income)}
            </span>
          </div>

          {/* Expense row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground text-xs">{t(locale, 'expense')}</span>
            </div>
            <span className="font-mono text-xs font-medium text-red-500">
              {formatCurrency(expense)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
