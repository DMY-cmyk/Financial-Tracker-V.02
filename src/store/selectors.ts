import { useStore } from './index';
import { useMemo } from 'react';
import {
  filterByMonth,
  totalIncome,
  totalExpense,
  netBalance,
  categoryTotals,
  paymentMethodTotals,
  budgetStatus,
  cashFlowByDate,
  billsForMonth,
  billsSummary,
} from '@/lib/calculations';

export function useMonthlyTransactions() {
  const transactions = useStore(s => s.transactions);
  const month = useStore(s => s.ui.selectedMonth);
  const year = useStore(s => s.ui.selectedYear);
  return useMemo(() => filterByMonth(transactions, month, year), [transactions, month, year]);
}

export function useMonthlyIncome() {
  const monthly = useMonthlyTransactions();
  return useMemo(() => totalIncome(monthly), [monthly]);
}

export function useMonthlyExpense() {
  const monthly = useMonthlyTransactions();
  return useMemo(() => totalExpense(monthly), [monthly]);
}

export function useMonthlyBalance() {
  const monthly = useMonthlyTransactions();
  return useMemo(() => netBalance(monthly), [monthly]);
}

export function useCategoryTotals(type: 'income' | 'expense' = 'expense') {
  const monthly = useMonthlyTransactions();
  return useMemo(() => categoryTotals(monthly, type), [monthly, type]);
}

export function usePaymentMethodTotals() {
  const monthly = useMonthlyTransactions();
  return useMemo(() => paymentMethodTotals(monthly), [monthly]);
}

export function useBudgetStatus() {
  const monthly = useMonthlyTransactions();
  const categories = useStore(s => s.categories);
  return useMemo(() => budgetStatus(monthly, categories), [monthly, categories]);
}

export function useCashFlow() {
  const transactions = useStore(s => s.transactions);
  const month = useStore(s => s.ui.selectedMonth);
  const year = useStore(s => s.ui.selectedYear);
  const monthly = useMemo(() => filterByMonth(transactions, month, year), [transactions, month, year]);
  return useMemo(() => cashFlowByDate(monthly, month, year), [monthly, month, year]);
}

export function useMonthlyBills() {
  const bills = useStore(s => s.bills);
  const month = useStore(s => s.ui.selectedMonth);
  const year = useStore(s => s.ui.selectedYear);
  return useMemo(() => billsForMonth(bills, month, year), [bills, month, year]);
}

export function useMonthlyBillsSummary() {
  const monthlyBills = useMonthlyBills();
  return useMemo(() => billsSummary(monthlyBills), [monthlyBills]);
}

export function useRecentTransactions(count: number = 5) {
  const monthly = useMonthlyTransactions();
  return useMemo(
    () => [...monthly].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, count),
    [monthly, count]
  );
}
