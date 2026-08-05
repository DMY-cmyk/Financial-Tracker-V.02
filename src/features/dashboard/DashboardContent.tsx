'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useDashboardData } from '@/features/dashboard/useDashboardData';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { MONTH_NAMES } from '@/lib/constants';
import { staggerContainer, staggerItem, staggerGrid, staggerGridItem } from '@/lib/motion';
import { BudgetAlertBanner } from '@/features/dashboard/BudgetAlertBanner';
import { useBudgetAlertToasts } from '@/hooks/useBudgetAlertToasts';
import { BillsChecklist } from '@/features/dashboard/BillsChecklist';
import { SavingsGoals } from '@/features/dashboard/SavingsGoals';
import { RecentTransactions } from '@/features/dashboard/RecentTransactions';
import { AccountBalancesWidget } from '@/features/balances/AccountBalancesWidget';
import { NetWorthDashboardWidget } from '@/features/net-worth/NetWorthDashboardWidget';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { QuickActionButton } from '@/components/shared/QuickActionButton';
import { EmptyState, InlineError } from '@/components/shared/EmptyState';
import { PageSkeleton, ChartCardSkeleton } from '@/components/shared/Skeletons';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  Upload,
  Download,
  BarChart3,
} from 'lucide-react';

const CashFlowChart = dynamic(
  () => import('@/features/dashboard/CashFlowChart').then((m) => ({ default: m.CashFlowChart })),
  { loading: () => <ChartCardSkeleton />, ssr: false }
);
const CategoryBreakdown = dynamic(
  () =>
    import('@/features/dashboard/CategoryBreakdown').then((m) => ({
      default: m.CategoryBreakdown,
    })),
  { loading: () => <ChartCardSkeleton />, ssr: false }
);
const BudgetProgress = dynamic(
  () => import('@/features/dashboard/BudgetProgress').then((m) => ({ default: m.BudgetProgress })),
  { loading: () => <ChartCardSkeleton />, ssr: false }
);
const PaymentMethodsSummary = dynamic(
  () =>
    import('@/features/dashboard/PaymentMethods').then((m) => ({
      default: m.PaymentMethodsSummary,
    })),
  { loading: () => <ChartCardSkeleton />, ssr: false }
);

export function DashboardContent() {
  const locale = useLocale();
  const {
    month,
    year,
    balance,
    income,
    expense,
    savingsRate,
    cashFlow,
    categoryTotals,
    budgetStatus,
    paymentMethodTotals,
    recentTransactions,
    bills,
    savingsGoals,
    categories,
    netWorthCurrent,
    netWorthHistory,
    onToggleBill,
    isLoading,
    isError,
    refetch,
    isEmpty,
    updateBudget,
    budgetAlerts,
  } = useDashboardData();

  useBudgetAlertToasts(budgetAlerts);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError) {
    return (
      <InlineError
        message={t(locale, 'error')}
        onRetry={() => refetch()}
        retryLabel={t(locale, 'tryAgain')}
        className="mt-8"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <p className="text-muted-foreground/70 text-[10px] font-semibold tracking-[0.18em] uppercase">
            {locale === 'id' ? 'Ringkasan' : 'Overview'}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[28px]">
            {t(locale, 'dashboard')}
          </h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            {locale === 'id'
              ? `Ringkasan keuangan untuk ${MONTH_NAMES[month]} ${year}`
              : `Your financial overview for ${MONTH_NAMES[month]} ${year}`}
          </p>
        </div>
        <div className="border-border-subtle bg-surface-inset text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] font-medium tabular-nums">
          <span className="bg-primary h-1.5 w-1.5 rounded-full" />
          {MONTH_NAMES[month]} · {year}
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        className="relative grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
        variants={staggerGrid}
        initial="hidden"
        animate="show"
      >
        <div
          className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full blur-3xl"
          style={{ background: 'rgb(var(--glow-primary) / 0.12)' }}
        />
        <div
          className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full blur-3xl"
          style={{ background: 'rgb(var(--glow-success) / 0.12)' }}
        />
        <div
          className="pointer-events-none absolute top-1/2 left-1/3 h-24 w-24 -translate-y-1/2 rounded-full blur-2xl"
          style={{ background: 'rgb(var(--glow-accent) / 0.10)' }}
        />
        <motion.div variants={staggerGridItem}>
          <SummaryCard
            label={t(locale, 'netBalance')}
            value={formatCurrency(balance)}
            icon={Wallet}
            color="default"
          />
        </motion.div>
        <motion.div variants={staggerGridItem}>
          <SummaryCard
            label={t(locale, 'income')}
            value={formatCurrency(income)}
            icon={TrendingUp}
            color="success"
          />
        </motion.div>
        <motion.div variants={staggerGridItem}>
          <SummaryCard
            label={t(locale, 'totalExpense')}
            value={formatCurrency(expense)}
            icon={TrendingDown}
            color="danger"
          />
        </motion.div>
        <motion.div variants={staggerGridItem}>
          <SummaryCard
            label={t(locale, 'savingsRate')}
            value={`${savingsRate}%`}
            icon={PiggyBank}
            color={savingsRate >= 20 ? 'success' : savingsRate >= 0 ? 'warning' : 'danger'}
          />
        </motion.div>
      </motion.div>

      {isEmpty ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <EmptyState
            title={locale === 'id' ? 'Belum ada transaksi' : 'No transactions yet'}
            description={
              locale === 'id'
                ? 'Mulai dengan menambahkan transaksi pertama Anda.'
                : 'Start by adding your first transaction to see your financial overview come to life.'
            }
            icon={<BarChart3 className="h-12 w-12" />}
          >
            <a
              href="/transactions/new"
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {t(locale, 'addTransaction')}
            </a>
          </EmptyState>
        </motion.div>
      ) : (
        <>
          {/* Budget Alert Banner */}
          {budgetAlerts.length > 0 && <BudgetAlertBanner alerts={budgetAlerts} />}

          {/* Charts Section */}
          <motion.div
            className="grid gap-4 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div className="lg:col-span-2" variants={staggerItem}>
              <CashFlowChart data={cashFlow} />
            </motion.div>
            <motion.div variants={staggerItem}>
              <CategoryBreakdown categoryTotals={categoryTotals} categories={categories} />
            </motion.div>
          </motion.div>

          {/* Budget & Recent Activity */}
          <motion.div
            className="grid gap-4 lg:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={staggerItem}>
              <BudgetProgress
                budgets={budgetStatus}
                alerts={budgetAlerts}
                onUpdateBudget={updateBudget}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <RecentTransactions transactions={recentTransactions} categories={categories} />
            </motion.div>
          </motion.div>

          {/* Bills, Savings, Payment Methods */}
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={staggerItem}>
              <BillsChecklist bills={bills} onToggle={onToggleBill} />
            </motion.div>
            <motion.div variants={staggerItem}>
              <SavingsGoals goals={savingsGoals} />
            </motion.div>
            <motion.div variants={staggerItem}>
              <PaymentMethodsSummary totals={paymentMethodTotals} />
            </motion.div>
          </motion.div>

          {/* Account Balances */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <AccountBalancesWidget />
          </motion.div>

          {/* Net Worth */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <NetWorthDashboardWidget
              current={netWorthCurrent}
              history={netWorthHistory}
              isLoading={isLoading}
            />
          </motion.div>
        </>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <h3 className="text-muted-foreground/70 mb-3 text-xs font-semibold tracking-wider uppercase">
          {t(locale, 'quickActions')}
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickActionButton
            icon={Plus}
            label={t(locale, 'addTransaction')}
            description={
              locale === 'id' ? 'Catat pemasukan atau pengeluaran' : 'Record income or expense'
            }
            href="/transactions/new"
          />
          <QuickActionButton
            icon={Upload}
            label={t(locale, 'uploadReceipt')}
            description={locale === 'id' ? 'Pindai dan ekstrak data' : 'Scan and extract data'}
            href="/upload"
          />
          <QuickActionButton
            icon={Download}
            label={t(locale, 'exportData')}
            description={
              locale === 'id' ? 'Unduh CSV, Excel, atau PDF' : 'Download CSV, Excel, or PDF'
            }
            href="/export"
          />
        </div>
      </motion.div>
    </div>
  );
}
