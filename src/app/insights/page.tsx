'use client';

import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { getMonthNames } from '@/lib/constants';
import { fadeInUp, staggerGrid, staggerGridItem } from '@/lib/motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { useInsightsData } from '@/features/insights/useInsightsData';
import { HealthScoreCard } from '@/features/insights/HealthScoreCard';
import { CategoryComparisonChart } from '@/features/insights/CategoryComparisonChart';
import { BiggestTransactionsCard } from '@/features/insights/BiggestTransactionsCard';
import { DayOfWeekPills } from '@/features/insights/DayOfWeekPills';
import { OutlierAlerts } from '@/features/insights/OutlierAlerts';

function InsightsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Health score skeleton */}
      <div className="border-border bg-card h-40 animate-pulse rounded-2xl border" />
      {/* Category comparison + biggest transactions skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="border-border bg-card h-72 animate-pulse rounded-2xl border lg:col-span-2" />
        <div className="border-border bg-card h-72 animate-pulse rounded-2xl border lg:col-span-1" />
      </div>
      {/* Day of week skeleton */}
      <div className="border-border bg-card h-32 animate-pulse rounded-2xl border" />
      {/* Outlier alerts skeleton */}
      <div className="border-border bg-card h-48 animate-pulse rounded-2xl border" />
    </div>
  );
}

export default function InsightsPage() {
  const locale = useLocale();
  const selectedMonth = useStore((s) => s.ui.selectedMonth);
  const selectedYear = useStore((s) => s.ui.selectedYear);
  const { data, isLoading, error } = useInsightsData(selectedMonth, selectedYear);

  const monthNames = getMonthNames(locale);
  const headerDescription = `${monthNames[selectedMonth]} ${selectedYear}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div {...fadeInUp}>
        <PageHeader title={t(locale, 'spendingInsights')} description={headerDescription} />
      </motion.div>

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        {isLoading ? (
          <InsightsSkeleton />
        ) : error ? (
          <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
            {t(locale, 'error')}
          </div>
        ) : !data ? (
          <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
            {t(locale, 'noData')}
          </div>
        ) : (
          <motion.div variants={staggerGrid} initial="hidden" animate="show" className="space-y-4">
            {/* Row 1: Health Score — full width */}
            <motion.div variants={staggerGridItem}>
              <HealthScoreCard healthScore={data.healthScore} locale={locale} />
            </motion.div>

            {/* Row 2: Category Comparison + Biggest Transactions */}
            <motion.div
              variants={staggerGridItem}
              className="grid grid-cols-1 gap-4 lg:grid-cols-3"
            >
              <div className="lg:col-span-2">
                <CategoryComparisonChart data={data.categoryComparison} locale={locale} />
              </div>
              <div className="lg:col-span-1">
                <BiggestTransactionsCard transactions={data.biggestTransactions} locale={locale} />
              </div>
            </motion.div>

            {/* Row 3: Day of Week Pills — full width */}
            <motion.div variants={staggerGridItem}>
              <DayOfWeekPills data={data.dayOfWeekPattern} locale={locale} />
            </motion.div>

            {/* Row 4: Outlier Alerts — full width */}
            <motion.div variants={staggerGridItem}>
              <OutlierAlerts outliers={data.outliers} locale={locale} />
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
