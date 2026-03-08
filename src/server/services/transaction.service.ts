import type { Transaction } from '@/lib/types';
import { createTransactionRepository } from '@/server/repositories/transaction.repository';
import { ensureSeeded } from '@/server/db/seed';
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
  type ListTransactionsQuery,
} from '@/lib/api/validation';
import type { TransactionListResponse } from '@/lib/api/contracts';

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

function applyFilters(
  transactions: Transaction[],
  query: ListTransactionsQuery
): Transaction[] {
  let filtered = transactions;

  if (query.type) {
    filtered = filtered.filter((t) => t.type === query.type);
  }
  if (query.category) {
    filtered = filtered.filter((t) => t.category === query.category);
  }
  if (query.search) {
    const q = query.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q)
    );
  }

  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string; details?: Record<string, string[]> };
}

export function listTransactions(rawQuery: Record<string, unknown>): ServiceResult<TransactionListResponse> {
  ensureSeeded();

  const parsed = listTransactionsQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return {
      error: {
        message: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }

  const query = parsed.data;
  const base =
    query.month !== undefined && query.year !== undefined
      ? repo.findByMonth(query.month, query.year)
      : repo.findAll();

  const transactions = applyFilters(base, query);
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  return {
    data: { transactions, total: transactions.length, income, expense },
  };
}

export function createTransaction(body: unknown): ServiceResult<Transaction> {
  ensureSeeded();

  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }

  const transaction = repo.create(parsed.data);
  return { data: transaction };
}

export function updateTransaction(
  id: string,
  body: unknown
): ServiceResult<Transaction> {
  ensureSeeded();

  const parsed = updateTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }

  const transaction = repo.update(id, parsed.data);
  if (!transaction) {
    return { error: { message: 'Transaction not found', code: 'NOT_FOUND' } };
  }

  return { data: transaction };
}

export function deleteTransaction(id: string): ServiceResult<{ success: boolean }> {
  ensureSeeded();

  const deleted = repo.delete(id);
  if (!deleted) {
    return { error: { message: 'Transaction not found', code: 'NOT_FOUND' } };
  }

  return { data: { success: true } };
}
