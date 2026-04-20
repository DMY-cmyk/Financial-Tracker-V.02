import type { Transaction, TransactionSplitInput } from '@/lib/types';
import { createTransactionRepository } from '@/server/repositories/transaction.repository';
import { createTransactionSplitRepository } from '@/server/repositories/transaction-split.repository';
import { ensureSeeded } from '@/server/db/seed';
import {
  createTransactionSchema,
  createTransactionWithSplitsSchema,
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

  // Extract splits from raw body for early business-rule validation before Zod parse.
  const rawSplits =
    body !== null && typeof body === 'object' && 'splits' in body
      ? (body as Record<string, unknown>).splits
      : undefined;

  if (Array.isArray(rawSplits)) {
    // Business-rule: must have at least 2 split lines
    if (rawSplits.length < 2) {
      return {
        error: { message: 'A split requires at least 2 lines', code: 'INVALID_SPLIT_COUNT' },
      };
    }
    // Business-rule: every split amount must be > 0
    for (const s of rawSplits) {
      if (
        s !== null &&
        typeof s === 'object' &&
        'amount' in s &&
        typeof (s as Record<string, unknown>).amount === 'number' &&
        ((s as Record<string, unknown>).amount as number) <= 0
      ) {
        return {
          error: {
            message: 'Each split amount must be greater than zero',
            code: 'INVALID_SPLIT_AMOUNT',
          },
        };
      }
    }
  }

  const parsed = createTransactionWithSplitsSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }

  const { splits, ...txData } = parsed.data;

  if (!splits) {
    // No splits — standard single-category path
    const transaction = await repo.create({ ...txData, isSplit: false });
    return { data: transaction };
  }

  // Split path — validate sum after Zod parse (amounts are guaranteed positive here)
  const splitSum = splits.reduce((sum, s) => sum + s.amount, 0);
  if (Math.abs(splitSum - txData.amount) > 1) {
    return {
      error: {
        message: `Split amounts (${splitSum}) must equal transaction total (${txData.amount})`,
        code: 'SPLIT_SUM_MISMATCH',
      },
    };
  }

  const db = await (await import('@/server/db/client')).getDb();
  const splitRepo = createTransactionSplitRepository();

  await db.exec('BEGIN');
  try {
    const transaction = await repo.create({
      ...txData,
      category: '',
      categoryId: '',
      isSplit: true,
    });
    await splitRepo.createSplits(transaction.id, splits as TransactionSplitInput[]);
    await db.exec('COMMIT');
    return {
      data: { ...transaction, splits: await splitRepo.getSplitsByTransactionId(transaction.id) },
    };
  } catch (err) {
    await db.exec('ROLLBACK');
    throw err;
  }
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

  const result = await repo.createMany(
    parsed.data.transactions.map((t) => ({ ...t, isSplit: false }))
  );

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
