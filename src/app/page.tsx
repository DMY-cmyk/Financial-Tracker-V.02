'use client';

import { motion } from 'framer-motion';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatCurrency } from '@/lib/formatters';
import { MONTH_NAMES } from '@/lib/constants';
import { staggerContainer, staggerItem, staggerGrid, staggerGridItem } from '@/lib/motion';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';
import { PaymentMethodsSummary } from '@/components/dashboard/PaymentMethods';
import { BillsChecklist } from '@/components/dashboard/BillsChecklist';
import { SavingsGoals } from '@/components/dashboard/SavingsGoals';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { QuickActionButton } from '@/components/shared/QuickActionButton';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton, SummaryCardSkeleton, ChartCardSkeleton, CardSkeleton } from '@/components/shared/Skeletons';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Plus, Upload, Download, BarChart3 } from 'lucide-react';

export default function DashboardPage() {
  const {
    month, year, balance, income, expense, savingsRate,
    isLoading, isEmpty,
  } = useDashboardData();

  if (isLoading) {
    return <div className="mx-auto max-w-7xl"><PageSkeleton /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your financial overview for {MONTH_NAMES[month]} {year}
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
        variants={staggerGrid}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerGridItem}>
          <SummaryCard
            label="Net Balance"
            value={formatCurrency(balance)}
            icon={Wallet}
            color="default"
          />
        </motion.div>
        <motion.div variants={staggerGridItem}>
          <SummaryCard
            label="Income"
            value={formatCurrency(income)}
            icon={TrendingUp}
            color="success"
          />
        </motion.div>
        <motion.div variants={staggerGridItem}>
          <SummaryCard
            label="Expenses"
            value={formatCurrency(expense)}
            icon={TrendingDown}
            color="danger"
          />
        </motion.div>
        <motion.div variants={staggerGridItem}>
          <SummaryCard
            label="Savings Rate"
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
            title="No transactions yet"
            description="Start by adding your first transaction to see your financial overview come to life."
            icon={<BarChart3 className="h-12 w-12" />}
          >
            <a
              href="/transactions/new"
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Transaction
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
              <CashFlowChart />
            </motion.div>
            <motion.div variants={staggerItem}>
              <CategoryBreakdown />
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
              <BudgetProgress />
            </motion.div>
            <motion.div variants={staggerItem}>
              <RecentTransactions />
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
              <BillsChecklist />
            </motion.div>
            <motion.div variants={staggerItem}>
              <SavingsGoals />
            </motion.div>
            <motion.div variants={staggerItem}>
              <PaymentMethodsSummary />
            </motion.div>
          </motion.div>
        </>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Quick Actions
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickActionButton
            icon={Plus}
            label="Add Transaction"
            description="Record income or expense"
            href="/transactions/new"
          />
          <QuickActionButton
            icon={Upload}
            label="Upload Receipt"
            description="Scan and extract data"
            href="/upload"
          />
          <QuickActionButton
            icon={Download}
            label="Export Data"
            description="Download CSV, Excel, or PDF"
            href="/export"
          />
        </div>
      </motion.div>
    </div>
  );
}
