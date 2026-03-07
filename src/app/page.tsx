'use client';

import { NetBalanceCard } from '@/components/dashboard/NetBalanceCard';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';
import { PaymentMethodsSummary } from '@/components/dashboard/PaymentMethods';
import { BillsChecklist } from '@/components/dashboard/BillsChecklist';
import { SavingsGoals } from '@/components/dashboard/SavingsGoals';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';

export default function DashboardPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="sm:col-span-2">
        <NetBalanceCard />
      </div>
      <MonthSelector />

      <div className="sm:col-span-2">
        <CashFlowChart />
      </div>
      <CategoryBreakdown />

      <div className="sm:col-span-2">
        <BudgetProgress />
      </div>
      <PaymentMethodsSummary />

      <BillsChecklist />
      <SavingsGoals />
      <RecentTransactions />
    </div>
  );
}
