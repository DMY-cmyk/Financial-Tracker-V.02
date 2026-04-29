'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { useReportsData } from '@/features/reports/useReportsData';
import { useForecastData } from '@/features/reports/useForecastData';
import { BalanceGrid } from '@/features/balances/BalanceGrid';
import { useBalances } from '@/features/balances/useBalances';
import { HeroHeader } from '@/components/layout/HeroHeader';
import { PageHeader } from '@/components/layout/PageHeader';
import { TrendChart } from '@/features/reports/TrendChart';
import { AnnualSummary } from '@/features/reports/AnnualSummary';
import { CurrentMonthForecastCard } from '@/features/reports/CurrentMonthForecastCard';
import { ForecastChart } from '@/features/reports/ForecastChart';
import { ForecastBreakdownList } from '@/features/reports/ForecastBreakdownList';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  const locale = useLocale();
  const { trends, isLoading: trendsLoading, monthCount, setMonthCount } = useReportsData();
  const [annualYear, setAnnualYear] = useState(new Date().getFullYear());
  const { balances, isLoading: balancesLoading } = useBalances();
  const { data: forecastData, isLoading: forecastLoading } = useForecastData(6);

  const totalIncome = trends.reduce((s, m) => s + m.income, 0);
  const totalExpense = trends.reduce((s, m) => s + m.expense, 0);
  const totalBalance = totalIncome - totalExpense;
  const avgSavingsRate =
    trends.length > 0
      ? Math.round(trends.reduce((s, m) => s + m.savingsRate, 0) / trends.length)
      : 0;

  if (trendsLoading) {
    return (
      <div className="space-y-6">
        <HeroHeader title={t(locale, 'reports')} />
        <div className="hidden lg:block">
          <PageHeader title={t(locale, 'reports')} />
        </div>
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="border-border bg-card shadow-card h-80 animate-pulse rounded-2xl border" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="border-border bg-card shadow-card h-24 animate-pulse rounded-2xl border"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const summaryCards = [
    {
      label: t(locale, 'totalIncome'),
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-success-soft text-success-soft-foreground',
    },
    {
      label: t(locale, 'totalExpense'),
      value: formatCurrency(totalExpense),
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-danger-soft text-danger-soft-foreground',
    },
    {
      label: t(locale, 'netBalance'),
      value: formatCurrency(totalBalance),
      icon: Wallet,
      color:
        totalBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400',
      bg:
        totalBalance >= 0
          ? 'bg-info-soft text-info-soft-foreground'
          : 'bg-danger-soft text-danger-soft-foreground',
    },
    {
      label: t(locale, 'avgSavingsRate'),
      value: `${avgSavingsRate}%`,
      icon: PiggyBank,
      color:
        avgSavingsRate >= 20
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-amber-600 dark:text-amber-400',
      bg:
        avgSavingsRate >= 20
          ? 'bg-success-soft text-success-soft-foreground'
          : 'bg-warning-soft text-warning-soft-foreground',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <HeroHeader title={t(locale, 'reports')} />
      <motion.div {...fadeInUp} className="hidden lg:block">
        <PageHeader title={t(locale, 'reports')} description={t(locale, 'financialTrends')} />
      </motion.div>

      <Tabs defaultValue="trends" className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <TabsList>
          <TabsTrigger value="trends">{t(locale, 'financialTrends')}</TabsTrigger>
          <TabsTrigger value="annual">{t(locale, 'annualReport')}</TabsTrigger>
          <TabsTrigger value="forecast">{t(locale, 'forecast')}</TabsTrigger>
        </TabsList>

        {/* ── Trends Tab ── */}
        <TabsContent value="trends" className="space-y-4 sm:space-y-6">
          {/* Month range toggle */}
          <div className="flex justify-end">
            <div className="border-border flex rounded-lg border">
              {[6, 12].map((n) => (
                <button
                  key={n}
                  onClick={() => setMonthCount(n)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                    monthCount === n
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-surface-inset'
                  }`}
                >
                  {n === 6 ? t(locale, 'last6Months') : t(locale, 'last12Months')}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Cards */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {summaryCards.map((card) => (
              <motion.div
                key={card.label}
                variants={staggerItem}
                className="border-border bg-card shadow-card hover:shadow-card-hover rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <div className={`rounded-lg p-1.5 ${card.bg}`}>
                    <card.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-muted-foreground mt-2 text-[10px] font-medium tracking-wider uppercase">
                  {card.label}
                </p>
                <p className={`font-mono text-sm font-semibold tabular-nums ${card.color}`}>
                  {card.value}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Income vs Expense Trend */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="border-border bg-card shadow-card hover:shadow-card-hover rounded-2xl border p-6 transition-shadow duration-300"
          >
            <h3 className="mb-4 text-sm font-semibold">{t(locale, 'incomeVsExpense')}</h3>
            <TrendChart data={trends} />
          </motion.div>

          {/* Monthly Breakdown Table */}
          {trends.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="border-border bg-card shadow-card hover:shadow-card-hover rounded-2xl border p-6 transition-shadow duration-300"
            >
              <h3 className="mb-4 text-sm font-semibold">{t(locale, 'monthlyBreakdown')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-border border-b">
                      <th className="py-2 text-left font-medium">{t(locale, 'month')}</th>
                      <th className="py-2 text-right font-medium">{t(locale, 'income')}</th>
                      <th className="py-2 text-right font-medium">{t(locale, 'expense')}</th>
                      <th className="py-2 text-right font-medium">{t(locale, 'netBalance')}</th>
                      <th className="py-2 text-right font-medium">{t(locale, 'avgSavingsRate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.map((row) => (
                      <tr
                        key={row.monthKey}
                        className="border-border-subtle hover:bg-surface-inset border-b transition-colors last:border-0"
                      >
                        <td className="py-2 font-medium">{row.monthKey}</td>
                        <td className="py-2 text-right font-mono text-emerald-600 tabular-nums dark:text-emerald-400">
                          {formatCurrency(row.income)}
                        </td>
                        <td className="py-2 text-right font-mono text-red-600 tabular-nums dark:text-red-400">
                          {formatCurrency(row.expense)}
                        </td>
                        <td
                          className={`py-2 text-right font-mono tabular-nums ${row.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}
                        >
                          {formatCurrency(row.balance)}
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums">
                          {row.savingsRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </TabsContent>

        {/* ── Annual Tab ── */}
        <TabsContent value="annual" className="space-y-4 sm:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">{t(locale, 'annualReport')}</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setAnnualYear((y) => y - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[4rem] text-center font-mono text-sm font-semibold">
                  {annualYear}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setAnnualYear((y) => y + 1)}
                  disabled={annualYear >= new Date().getFullYear()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <AnnualSummary year={annualYear} />
          </motion.div>

          <motion.div {...fadeInUp} transition={{ duration: 0.3, delay: 0.2 }}>
            <h2 className="mb-4 text-lg font-semibold">{t(locale, 'accountBalances')}</h2>
            <BalanceGrid balances={balances} locale={locale} isLoading={balancesLoading} />
          </motion.div>
        </TabsContent>

        {/* ── Forecast Tab ── */}
        <TabsContent value="forecast" className="space-y-4 sm:space-y-6">
          {forecastLoading ? (
            <div className="space-y-4">
              <div className="border-border bg-card shadow-card h-48 animate-pulse rounded-2xl border" />
              <div className="border-border bg-card shadow-card h-72 animate-pulse rounded-2xl border" />
            </div>
          ) : forecastData ? (
            <>
              <CurrentMonthForecastCard currentMonth={forecastData.currentMonth} />

              <motion.div
                {...fadeInUp}
                transition={{ delay: 0.1 }}
                className="border-border bg-card shadow-card hover:shadow-card-hover rounded-2xl border p-6 transition-shadow duration-300"
              >
                <h3 className="mb-4 text-sm font-semibold">{t(locale, 'cashFlowForecast')}</h3>
                <ForecastChart trends={trends} forecast={forecastData} />
              </motion.div>

              <motion.div
                {...fadeInUp}
                transition={{ delay: 0.2 }}
                className="border-border bg-card shadow-card hover:shadow-card-hover rounded-2xl border p-6 transition-shadow duration-300"
              >
                <h3 className="mb-4 text-sm font-semibold">
                  {t(locale, 'forecastMonths').replace('{n}', '6')}
                </h3>
                <ForecastBreakdownList forecast={forecastData.forecast} />
              </motion.div>
            </>
          ) : (
            <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
              {t(locale, 'noData')}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
