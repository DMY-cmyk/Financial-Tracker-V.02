'use client';

import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { ProgressRing } from '@/components/shared/ProgressRing';
import { motion } from 'framer-motion';

export function SavingsGoals() {
  const goals = useStore((s) => s.savingsGoals);
  const locale = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="border-border bg-card rounded-2xl border p-6"
    >
      <h3 className="mb-4 text-sm font-semibold">{t(locale, 'savingsGoals')}</h3>

      {goals.length === 0 ? (
        <div className="text-muted-foreground flex h-20 items-center justify-center text-sm">
          {t(locale, 'noData')}
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const pct =
              goal.targetAmount > 0 ? Math.round((goal.savedAmount / goal.targetAmount) * 100) : 0;

            return (
              <div key={goal.id} className="flex items-center gap-4">
                <ProgressRing percentage={pct} size={56} strokeWidth={6} color={goal.color}>
                  <span className="text-[10px] font-bold">{pct}%</span>
                </ProgressRing>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{goal.name}</p>
                  <p className="text-muted-foreground font-mono text-[10px]">
                    {formatCurrency(goal.savedAmount)} {t(locale, 'of')}{' '}
                    {formatCurrency(goal.targetAmount)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
