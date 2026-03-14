'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Hash, BarChart3 } from 'lucide-react';

interface AnnualData {
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  transactionCount: number;
  savingsRate: number;
  topExpenseCategories: { category: string; amount: number }[];
  monthlyBreakdown: { monthKey: string; income: number; expense: number; balance: number }[];
}

interface AnnualSummaryProps {
  year: number;
}

export function AnnualSummary({ year }: AnnualSummaryProps) {
  const locale = useLocale();

  const { data, isLoading } = useQuery<AnnualData | null>({
    queryKey: ['reports-annual', year],
    queryFn: async () => {
      const res = await fetch(`/api/reports/annual?year=${year}`);
      const json = await res.json();
      return json.data ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="border-border bg-card h-48 animate-pulse rounded-2xl border" />
      </div>
    );
  }

  if (!data || data.transactionCount === 0) {
    return (
      <div className="border-border bg-card text-muted-foreground flex h-32 items-center justify-center rounded-2xl border text-sm">
        {t(locale, 'noData')}
      </div>
    );
  }

  const statCards = [
    {
      label: t(locale, 'totalIncome'),
      value: formatCurrency(data.totalIncome),
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: t(locale, 'totalExpense'),
      value: formatCurrency(data.totalExpense),
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/30',
    },
    {
      label: t(locale, 'netBalance'),
      value: formatCurrency(data.totalBalance),
      icon: Wallet,
      color:
        data.totalBalance >= 0
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-red-600 dark:text-red-400',
      bg:
        data.totalBalance >= 0 ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-red-50 dark:bg-red-950/30',
    },
    {
      label: t(locale, 'avgSavingsRate'),
      value: `${data.savingsRate}%`,
      icon: PiggyBank,
      color:
        data.savingsRate >= 20
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-amber-600 dark:text-amber-400',
      bg:
        data.savingsRate >= 20
          ? 'bg-emerald-50 dark:bg-emerald-950/30'
          : 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      label: t(locale, 'totalTransactions'),
      value: String(data.transactionCount),
      icon: Hash,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Year Stats */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {statCards.map((card) => (
          <motion.div
            key={card.label}
            variants={staggerItem}
            className="border-border bg-card rounded-2xl border p-4"
          >
            <div className={`inline-flex rounded-lg p-1.5 ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-muted-foreground mt-2 text-[11px]">{card.label}</p>
            <p className="font-mono text-sm font-semibold">{card.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Top Expense Categories */}
      {data.topExpenseCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="border-border bg-card rounded-2xl border p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-semibold">{t(locale, 'topCategories')}</h3>
          </div>
          <div className="space-y-3">
            {data.topExpenseCategories.map((cat, i) => {
              const pct = data.totalExpense > 0 ? (cat.amount / data.totalExpense) * 100 : 0;
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {i + 1}. {cat.category}
                    </span>
                    <span className="font-mono text-red-600 dark:text-red-400">
                      {formatCurrency(cat.amount)} ({Math.round(pct)}%)
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
