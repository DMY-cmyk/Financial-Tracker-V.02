'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useSavingsGoals } from '@/features/savings/useSavingsGoals';
import { useTransactions } from '@/features/transactions/useTransactions';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/lib/types';

function lastWeekStart(now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - 7);
  return d;
}

export function SavingsRingCard() {
  const locale = useLocale();
  const { goals } = useSavingsGoals();
  const { transactions } = useTransactions();

  const totalTarget = goals.reduce((s, g) => s + (g.targetAmount || 0), 0);
  const totalSaved = goals.reduce((s, g) => s + (g.savedAmount || 0), 0);
  const ringPct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  const start = lastWeekStart();
  const recent = (transactions as Transaction[]).filter((tx) => new Date(tx.date) >= start);
  const revenueLastWeek = recent
    .filter((tx) => tx.type === 'income')
    .reduce((s, tx) => s + tx.amount, 0);

  const expenseByCat = new Map<string, number>();
  for (const tx of recent) {
    if (tx.type !== 'expense') continue;
    const key = tx.category;
    expenseByCat.set(key, (expenseByCat.get(key) ?? 0) + tx.amount);
  }
  const topCategory =
    [...expenseByCat.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], locale);
    })[0]?.[0] ?? null;

  const ringData = [
    { name: 'done', value: ringPct },
    { name: 'rest', value: 100 - ringPct },
  ];

  return (
    <div className="bg-card rounded-3xl p-5 shadow-sm">
      <div className="grid grid-cols-2 items-center gap-4">
        <div className="relative h-32">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={ringData}
                dataKey="value"
                innerRadius={42}
                outerRadius={56}
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                <Cell fill="var(--brand-mint)" />
                <Cell fill="var(--brand-mint-soft)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-semibold">
            {ringPct}%
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-base font-semibold">{t(locale, 'homeSavingsTitle')}</p>
          <div>
            <p className="text-muted-foreground text-xs">{t(locale, 'homeStatsRevenueLastWeek')}</p>
            <p
              className={cn(
                'font-mono',
                revenueLastWeek > 0 ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {revenueLastWeek > 0 ? formatCurrency(revenueLastWeek) : t(locale, 'homeStatsEmpty')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">
              {t(locale, 'homeStatsTopCategoryLastWeek')}
            </p>
            <p
              className={cn('font-mono', topCategory ? 'text-foreground' : 'text-muted-foreground')}
            >
              {topCategory ?? t(locale, 'homeStatsEmpty')}
            </p>
          </div>
        </div>
      </div>
      {goals.length === 0 && (
        <p className="text-muted-foreground mt-3 text-xs">{t(locale, 'homeSavingsEmpty')}</p>
      )}
    </div>
  );
}
