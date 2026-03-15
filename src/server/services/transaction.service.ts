import type { Transaction } from '@/lib/types';
import { createTransactionRepository } from '@/server/repositories/transaction.repository';
import { ensureSeeded } from '@/server/db/seed';
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
  bulkCreateTransactionSchema,
  bulkDeleteTransactionSchema,
} from '@/lib/api/validation';
import type {
  TransactionListResponse,
  BulkCreateTransactionResponse,
  BulkDeleteTransactionResponse,
} from '@/lib/api/contracts';

const repo = createTransactionRepository();

function formatZodError(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string[]> {
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

export async function listTransactions(
  rawQuery: Record<string, unknown>
): Promise<ServiceResult<TransactionListResponse>> {
  await ensureSeeded();

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
  const { rows: transactions, total, income, expense } = await repo.findFiltered(query);
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 25;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: { transactions, total, income, expense, page, pageSize, totalPages },
  };
}

export async function createTransaction(body: unknown): Promise<ServiceResult<Transaction>> {
  await ensureSeeded();

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

  const transaction = await repo.create(parsed.data);
  return { data: transaction };
}

export async function updateTransaction(
  id: string,
  body: unknown
): Promise<ServiceResult<Transaction>> {
  await ensureSeeded();

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

  const transaction = await repo.update(id, parsed.data);
  if (!transaction) {
    return { error: { message: 'Transaction not found', code: 'NOT_FOUND' } };
  }

  return { data: transaction };
}

export async function bulkCreateTransactions(
  body: unknown
): Promise<ServiceResult<BulkCreateTransactionResponse>> {
  await ensureSeeded();

  const parsed = bulkCreateTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }

  const result = await repo.createMany(parsed.data.transactions);

  return {
    data: {
      created: result.created.length,
      duplicates: result.duplicates,
      failed: result.errors.length,
      errors: result.errors,
    },
  };
}

export async function bulkDeleteTransactions(
  body: unknown
): Promise<ServiceResult<BulkDeleteTransactionResponse>> {
  await ensureSeeded();

  const parsed = bulkDeleteTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }

  const deleted = await repo.deleteMany(parsed.data.ids);
  return { data: { deleted } };
}

export async function deleteTransaction(id: string): Promise<ServiceResult<{ success: boolean }>> {
  await ensureSeeded();

  const deleted = await repo.delete(id);
  if (!deleted) {
    return { error: { message: 'Transaction not found', code: 'NOT_FOUND' } };
  }

  return { data: { success: true } };
}
