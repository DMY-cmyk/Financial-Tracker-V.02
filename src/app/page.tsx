'use client';

import { useMonthlyBalance, useMonthlyIncome, useMonthlyExpense } from '@/store/selectors';
import { useStore } from '@/store';
import { formatCurrency } from '@/lib/formatters';
import { MONTH_NAMES } from '@/lib/constants';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';
import { PaymentMethodsSummary } from '@/components/dashboard/PaymentMethods';
import { BillsChecklist } from '@/components/dashboard/BillsChecklist';
import { SavingsGoals } from '@/components/dashboard/SavingsGoals';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { QuickActionButton } from '@/components/shared/QuickActionButton';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Plus, Upload, Download } from 'lucide-react';

export default function DashboardPage() {
  const balance = useMonthlyBalance();
  const income = useMonthlyIncome();
  const expense = useMonthlyExpense();
  const month = useStore(s => s.ui.selectedMonth);
  const year = useStore(s => s.ui.selectedYear);

  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your financial overview for {MONTH_NAMES[month]} {year}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <SummaryCard
          label="Net Balance"
          value={formatCurrency(balance)}
          icon={Wallet}
          color="default"
        />
        <SummaryCard
          label="Income"
          value={formatCurrency(income)}
          icon={TrendingUp}
          color="success"
        />
        <SummaryCard
          label="Expenses"
          value={formatCurrency(expense)}
          icon={TrendingDown}
          color="danger"
        />
        <SummaryCard
          label="Savings Rate"
          value={`${savingsRate}%`}
          icon={PiggyBank}
          color={savingsRate >= 20 ? 'success' : savingsRate >= 0 ? 'warning' : 'danger'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CashFlowChart />
        </div>
        <CategoryBreakdown />
      </div>

      {/* Budget & Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BudgetProgress />
        <RecentTransactions />
      </div>

      {/* Bills, Savings, Payment Methods */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BillsChecklist />
        <SavingsGoals />
        <PaymentMethodsSummary />
      </div>

      {/* Quick Actions */}
      <div>
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
            description="Download as CSV or JSON"
            href="/export"
          />
        </div>
      </div>
    </div>
  );
}
