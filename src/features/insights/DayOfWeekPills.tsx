'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/lib/motion';
import { t } from '@/lib/i18n';
import type { DayOfWeekItem } from '@/lib/api/contracts';

interface DayOfWeekPillsProps {
  data: DayOfWeekItem[];
  locale: 'en' | 'id';
}

const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function compactAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return String(amount);
}

export function DayOfWeekPills({ data, locale }: DayOfWeekPillsProps) {
  const dayNames = locale === 'id' ? DAY_NAMES_ID : DAY_NAMES_EN;

  // Sort by dayIndex to ensure Sun..Sat order
  const sorted = [...data].sort((a, b) => a.dayIndex - b.dayIndex);

  // Find max amount for normalization
  const maxAmount = Math.max(...sorted.map((d) => d.totalAmount), 1);

  // Find top 2 days by amount
  const byAmount = [...sorted].sort((a, b) => b.totalAmount - a.totalAmount);
  const top2Indices = new Set(byAmount.slice(0, 2).map((d) => d.dayIndex));
  const allZero = sorted.every((d) => d.totalAmount === 0);

  // Day with highest total for summary sentence
  const topDay = byAmount[0];

  return (
    <motion.div
      {...fadeInUp}
      className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
    >
      <h3 className="mb-4 text-sm font-semibold">{t(locale, 'spendingByDay')}</h3>

      {/* Pill row */}
      <div
        role="list"
        aria-label={t(locale, 'spendingByDay')}
        className="flex justify-between gap-1.5"
      >
        {sorted.map((day) => {
          // Normalize opacity between 0.15 and 0.6
          const ratio = day.totalAmount / maxAmount;
          const opacity = allZero ? 0.15 : 0.15 + ratio * 0.45;
          const isTop2 = !allZero && top2Indices.has(day.dayIndex);
          const dayName = dayNames[day.dayIndex];
          const formattedAmount = allZero ? '0' : compactAmount(day.totalAmount);

          return (
            <div
              key={day.dayIndex}
              role="listitem"
              aria-label={`${dayName}: ${formattedAmount}`}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              {/* Pill */}
              <div
                className={cn(
                  'flex h-14 w-full items-center justify-center rounded-xl text-xs font-semibold transition-colors',
                  isTop2
                    ? 'border border-amber-500/25 text-amber-700 dark:text-amber-300'
                    : 'text-blue-700 dark:text-blue-300'
                )}
                style={{
                  backgroundColor: isTop2
                    ? `rgba(245, 158, 11, ${opacity})`
                    : `rgba(59, 130, 246, ${opacity})`,
                }}
              >
                {dayName}
              </div>
              {/* Amount */}
              <span className="text-muted-foreground font-mono text-[10px]">{formattedAmount}</span>
            </div>
          );
        })}
      </div>

      {/* Summary sentence */}
      {!allZero && topDay && (
        <p className="text-muted-foreground mt-4 text-center text-xs">
          {t(locale, 'youSpendMostOn')}{' '}
          <span className="text-foreground font-semibold">{dayNames[topDay.dayIndex]}</span>
        </p>
      )}
    </motion.div>
  );
}
