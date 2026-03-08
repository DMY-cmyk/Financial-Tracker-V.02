import { ensureSeeded } from '@/server/db/seed';
import { createTransactionRepository } from '@/server/repositories/transaction.repository';
import { dashboardSummaryQuerySchema } from '@/lib/api/validation';
import {
  totalIncome,
  totalExpense,
  categoryTotals,
  paymentMethodTotals,
  cashFlowByDate,
} from '@/lib/calculations';
import type { DashboardSummaryResponse } from '@/lib/api/contracts';

const repo = createTransactionRepository();

function formatZodError(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!fieldErrors[path]) fieldErrors[path] = [];
    fieldErrors[path].push(issue.message);
  }
  return fieldErrors;
}

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string; details?: Record<string, string[]> };
}

export function getDashboardSummary(
  rawQuery: Record<string, unknown>
): ServiceResult<DashboardSummaryResponse> {
  ensureSeeded();

  const parsed = dashboardSummaryQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return {
      error: {
        message: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }

  const { month, year } = parsed.data;
  const transactions = repo.findByMonth(month, year);

  const income = totalIncome(transactions);
  const expense = totalExpense(transactions);
  const balance = income - expense;
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return {
    data: {
      balance,
      income,
      expense,
      savingsRate,
      transactionCount: transactions.length,
      categoryTotals: categoryTotals(transactions, 'expense'),
      paymentMethodTotals: paymentMethodTotals(transactions),
      cashFlow: cashFlowByDate(transactions, month, year),
      recentTransactions,
    },
  };
}
