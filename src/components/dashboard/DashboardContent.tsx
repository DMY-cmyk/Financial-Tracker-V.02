'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useDashboardData } from '@/hooks/useDashboardData';
import { t, useLocale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/formatters';
import { MONTH_NAMES } from '@/lib/constants';
import { staggerContainer, staggerItem, staggerGrid, staggerGridItem } from '@/lib/motion';
import { BillsChecklist } from '@/components/dashboard/BillsChecklist';
import { SavingsGoals } from '@/components/dashboard/SavingsGoals';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { AccountBalancesWidget } from '@/features/balances/AccountBalancesWidget';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { QuickActionButton } from '@/components/shared/QuickActionButton';
import { EmptyState } from '@/components/shared/EmptyState';
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
  () => import('@/components/dashboard/CashFlowChart').then((m) => ({ default: m.CashFlowChart })),
  { loading: () => <ChartCardSkeleton />, ssr: false }
);
const CategoryBreakdown = dynamic(
  () =>
    import('@/components/dashboard/CategoryBreakdown').then((m) => ({
      default: m.CategoryBreakdown,
    })),
  { loading: () => <ChartCardSkeleton />, ssr: false }
);
const BudgetProgress = dynamic(
  () =>
    import('@/components/dashboard/BudgetProgress').then((m) => ({ default: m.BudgetProgress })),
  { loading: () => <ChartCardSkeleton />, ssr: false }
);
const PaymentMethodsSummary = dynamic(
  () =>
    import('@/components/dashboard/PaymentMethods').then((m) => ({
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
    isLoading,
    isEmpty,
    updateBudget,
  } = useDashboardData();

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t(locale, 'dashboard')}</h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          {locale === 'id'
            ? `Ringkasan keuangan untuk ${MONTH_NAMES[month]} ${year}`
            : `Your financial overview for ${MONTH_NAMES[month]} ${year}`}
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        className="relative grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
        variants={staggerGrid}
        initial="hidden"
        animate="show"
      >
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/3 h-24 w-24 -translate-y-1/2 rounded-full bg-violet-500/8 blur-2xl" />
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
              <BudgetProgress budgets={budgetStatus} onUpdateBudget={updateBudget} />
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
              <BillsChecklist bills={bills} />
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
