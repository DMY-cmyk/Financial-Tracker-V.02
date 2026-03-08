import { useMemo } from 'react';
import { useStore } from '@/store';
import {
  useMonthlyBalance,
  useMonthlyIncome,
  useMonthlyExpense,
  useMonthlyTransactions,
  useRecentTransactions,
  useCashFlow,
  useCategoryTotals,
  useBudgetStatus,
  usePaymentMethodTotals,
  useMonthlyBills,
} from '@/store/selectors';

export function useDashboardData() {
  const month = useStore(s => s.ui.selectedMonth);
  const year = useStore(s => s.ui.selectedYear);
  const initialized = useStore(s => s.initialized);
  const savingsGoals = useStore(s => s.savingsGoals);

  const balance = useMonthlyBalance();
  const income = useMonthlyIncome();
  const expense = useMonthlyExpense();
  const transactions = useMonthlyTransactions();
  const recentTransactions = useRecentTransactions(5);
  const cashFlow = useCashFlow();
  const categoryTotals = useCategoryTotals('expense');
  const budgetStatus = useBudgetStatus();
  const paymentMethodTotals = usePaymentMethodTotals();
  const bills = useMonthlyBills();

  const savingsRate = useMemo(
    () => income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
    [income, expense]
  );

  const isLoading = !initialized;
  const isEmpty = initialized && transactions.length === 0;

  return {
    month,
    year,
    balance,
    income,
    expense,
    savingsRate,
    transactions,
    recentTransactions,
    cashFlow,
    categoryTotals,
    budgetStatus,
    paymentMethodTotals,
    bills,
    savingsGoals,
    isLoading,
    isEmpty,
  };
}
