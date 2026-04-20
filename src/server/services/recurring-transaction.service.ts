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

// Advance nextDueDate based on frequency (UTC-safe to avoid timezone shifts)
function advanceDate(dateStr: string, frequency: RecurringTransaction['frequency']): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  switch (frequency) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case 'monthly':
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case 'yearly':
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Generate pending transactions from all active recurring rules up to today
export async function generateRecurringTransactions(): Promise<
  ServiceResult<{ generated: number; skipped: number; totalIncome: number; totalExpense: number }>
> {
  await ensureSeeded();
  const today = new Date().toISOString().slice(0, 10);
  const dueRules = await repo.findDue(today);

  let generated = 0;
  let skipped = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  for (const rule of dueRules) {
    let nextDate = rule.nextDueDate;

    // Generate transactions for all missed due dates up to today
    while (nextDate <= today) {
      // Don't generate past endDate
      if (rule.endDate && nextDate > rule.endDate) break;

      // Idempotency check: skip if a transaction already exists for this rule + due date
      const existing = await txRepo.findBySource(rule.id, nextDate);
      if (existing) {
        skipped++;
        nextDate = advanceDate(nextDate, rule.frequency);
        continue;
      }

      await txRepo.create({
        date: nextDate,
        description: rule.description,
        category: rule.category,
        categoryId: rule.categoryId,
        type: rule.type,
        amount: rule.amount,
        paymentMethod: rule.paymentMethod,
        notes: rule.notes,
        sourceRecurringId: rule.id,
        sourceDueDate: nextDate,
        isSplit: false,
      });
      generated++;

      if (rule.type === 'income') {
        totalIncome += rule.amount;
      } else {
        totalExpense += rule.amount;
      }

      nextDate = advanceDate(nextDate, rule.frequency);
    }

    // Check if rule should be deactivated (past endDate)
    if (rule.endDate && nextDate > rule.endDate) {
      await repo.update(rule.id, { isActive: false, nextDueDate: nextDate });
    } else {
      await repo.update(rule.id, { nextDueDate: nextDate });
    }
  }

  return { data: { generated, skipped, totalIncome, totalExpense } };
}

// Compute overdue counts per rule for the dashboard banner (read-only, no side effects)
export async function getDueItems(): Promise<
  ServiceResult<{
    dueItems: Array<{
      id: string;
      description: string;
      type: 'income' | 'expense';
      amount: number;
      frequency: string;
      paymentMethod: string;
      overdueCount: number;
      totalAmount: number;
    }>;
    totalTransactions: number;
    totalIncome: number;
    totalExpense: number;
  }>
> {
  await ensureSeeded();
  const today = new Date().toISOString().slice(0, 10);
  const dueRules = await repo.findDue(today);

  const dueItems = dueRules.map((rule) => {
    let count = 0;
    let date = rule.nextDueDate;
    while (date <= today) {
      if (rule.endDate && date > rule.endDate) break;
      count++;
      date = advanceDate(date, rule.frequency);
    }
    return {
      id: rule.id,
      description: rule.description,
      type: rule.type,
      amount: rule.amount,
      frequency: rule.frequency,
      paymentMethod: rule.paymentMethod,
      overdueCount: count,
      totalAmount: rule.amount * count,
    };
  });

  const totalTransactions = dueItems.reduce((s, i) => s + i.overdueCount, 0);
  const totalIncome = dueItems
    .filter((i) => i.type === 'income')
    .reduce((s, i) => s + i.totalAmount, 0);
  const totalExpense = dueItems
    .filter((i) => i.type === 'expense')
    .reduce((s, i) => s + i.totalAmount, 0);

  return { data: { dueItems, totalTransactions, totalIncome, totalExpense } };
}
