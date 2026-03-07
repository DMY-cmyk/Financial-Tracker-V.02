import { Transaction, Category, Bill } from './types';

export function filterByMonth(transactions: Transaction[], month: number, year: number): Transaction[] {
  return transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

export function totalIncome(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function totalExpense(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function netBalance(transactions: Transaction[]): number {
  return totalIncome(transactions) - totalExpense(transactions);
}

export function categoryTotals(
  transactions: Transaction[],
  type: 'income' | 'expense' = 'expense'
): Record<string, number> {
  const totals: Record<string, number> = {};
  transactions
    .filter(t => t.type === type)
    .forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
  return totals;
}

export function paymentMethodTotals(transactions: Transaction[]): Record<string, number> {
  const totals: Record<string, number> = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      totals[t.paymentMethod] = (totals[t.paymentMethod] || 0) + t.amount;
    });
  return totals;
}

export function budgetStatus(
  transactions: Transaction[],
  categories: Category[]
): { category: string; budget: number; spent: number; remaining: number; color: string; percentage: number }[] {
  const expenseTotals = categoryTotals(transactions, 'expense');
  return categories
    .filter(c => c.type === 'expense' && c.budget > 0)
    .map(c => {
      const spent = expenseTotals[c.name] || 0;
      const remaining = c.budget - spent;
      const percentage = c.budget > 0 ? Math.min((spent / c.budget) * 100, 100) : 0;
      return { category: c.name, budget: c.budget, spent, remaining, color: c.color, percentage };
    });
}

export function cashFlowByDate(
  transactions: Transaction[],
  month: number,
  year: number
): { date: string; income: number; expense: number }[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const flow: Record<number, { income: number; expense: number }> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    flow[d] = { income: 0, expense: 0 };
  }

  transactions.forEach(t => {
    const day = new Date(t.date).getDate();
    if (flow[day]) {
      if (t.type === 'income') flow[day].income += t.amount;
      else flow[day].expense += t.amount;
    }
  });

  return Object.entries(flow).map(([day, values]) => ({
    date: `${parseInt(day)}`,
    income: values.income,
    expense: values.expense,
  }));
}

export function billsForMonth(bills: Bill[], month: number, year: number): Bill[] {
  return bills.filter(b => b.month === month && b.year === year);
}

export function billsSummary(bills: Bill[]) {
  const total = bills.reduce((sum, b) => sum + b.amount, 0);
  const paid = bills.filter(b => b.isPaid).reduce((sum, b) => sum + b.amount, 0);
  const paidCount = bills.filter(b => b.isPaid).length;
  return { total, paid, unpaid: total - paid, paidCount, totalCount: bills.length };
}
