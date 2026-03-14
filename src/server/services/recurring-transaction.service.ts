import { ensureSeeded } from '@/server/db/seed';
import { createRecurringTransactionRepository } from '@/server/repositories/recurring-transaction.repository';
import { createTransactionRepository } from '@/server/repositories/transaction.repository';
import {
  createRecurringTransactionSchema,
  updateRecurringTransactionSchema,
} from '@/lib/api/validation';
import type { RecurringTransaction } from '@/lib/types';

const repo = createRecurringTransactionRepository();
const txRepo = createTransactionRepository();

function formatZodError(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string[]> {
  const f: Record<string, string[]> = {};
  for (const i of error.issues) {
    const p = String(i.path.join('.') || '_root');
    if (!f[p]) f[p] = [];
    f[p].push(i.message);
  }
  return f;
}

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string; details?: Record<string, string[]> };
}

export async function listRecurringTransactions(): Promise<ServiceResult<RecurringTransaction[]>> {
  await ensureSeeded();
  return { data: await repo.findAll() };
}

export async function getRecurringTransaction(
  id: string
): Promise<ServiceResult<RecurringTransaction>> {
  await ensureSeeded();
  const rt = await repo.findById(id);
  if (!rt) return { error: { message: 'Recurring transaction not found', code: 'NOT_FOUND' } };
  return { data: rt };
}

export async function createRecurringTransaction(
  body: unknown
): Promise<ServiceResult<RecurringTransaction>> {
  await ensureSeeded();
  const parsed = createRecurringTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }
  const data = parsed.data;
  return {
    data: await repo.create({
      description: data.description,
      category: data.category,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate,
      nextDueDate: data.nextDueDate,
      isActive: data.isActive,
    }),
  };
}

export async function updateRecurringTransaction(
  id: string,
  body: unknown
): Promise<ServiceResult<RecurringTransaction>> {
  await ensureSeeded();
  const parsed = updateRecurringTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }
  const result = await repo.update(id, parsed.data);
  if (!result) {
    return { error: { message: 'Recurring transaction not found', code: 'NOT_FOUND' } };
  }
  return { data: result };
}

export async function deleteRecurringTransaction(
  id: string
): Promise<ServiceResult<{ success: boolean }>> {
  await ensureSeeded();
  if (!(await repo.delete(id))) {
    return { error: { message: 'Recurring transaction not found', code: 'NOT_FOUND' } };
  }
  return { data: { success: true } };
}

// Advance nextDueDate based on frequency
function advanceDate(dateStr: string, frequency: RecurringTransaction['frequency']): string {
  const d = new Date(dateStr + 'T00:00:00');
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}

// Generate pending transactions from all active recurring rules up to today
export async function generateRecurringTransactions(): Promise<
  ServiceResult<{ generated: number }>
> {
  await ensureSeeded();
  const today = new Date().toISOString().slice(0, 10);
  const dueRules = await repo.findDue(today);

  let generated = 0;

  for (const rule of dueRules) {
    let nextDate = rule.nextDueDate;

    // Generate transactions for all missed due dates up to today
    while (nextDate <= today) {
      // Don't generate past endDate
      if (rule.endDate && nextDate > rule.endDate) break;

      await txRepo.create({
        date: nextDate,
        description: rule.description,
        category: rule.category,
        categoryId: rule.categoryId,
        type: rule.type,
        amount: rule.amount,
        paymentMethod: rule.paymentMethod,
        notes: rule.notes,
      });
      generated++;

      nextDate = advanceDate(nextDate, rule.frequency);
    }

    // Check if rule should be deactivated (past endDate)
    if (rule.endDate && nextDate > rule.endDate) {
      await repo.update(rule.id, { isActive: false, nextDueDate: nextDate });
    } else {
      await repo.update(rule.id, { nextDueDate: nextDate });
    }
  }

  return { data: { generated } };
}
