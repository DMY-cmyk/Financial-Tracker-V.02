import { ensureSeeded } from '@/server/db/seed';
import { createBillRepository } from '@/server/repositories/bill.repository';
import { createBillSchema, updateBillSchema } from '@/lib/api/validation';
import type { Bill } from '@/lib/types';

const repo = createBillRepository();

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

export async function listBills(
  userId: string,
  query?: { month?: number; year?: number }
): Promise<ServiceResult<Bill[]>> {
  await ensureSeeded();
  if (query?.month !== undefined && query?.year !== undefined) {
    return { data: await repo.findByMonth(userId, query.month, query.year) };
  }
  return { data: await repo.findAll(userId) };
}

export async function getBill(userId: string, id: string): Promise<ServiceResult<Bill>> {
  await ensureSeeded();
  const bill = await repo.findById(userId, id);
  if (!bill) return { error: { message: 'Bill not found', code: 'NOT_FOUND' } };
  return { data: bill };
}

export async function createBill(userId: string, body: unknown): Promise<ServiceResult<Bill>> {
  await ensureSeeded();
  const parsed = createBillSchema.safeParse(body);
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
    data: await repo.create(userId, {
      name: data.name,
      amount: data.amount,
      dueDate: data.dueDate,
      isPaid: data.isPaid ?? false,
      isRecurring: data.isRecurring ?? false,
      month: data.month,
      year: data.year,
    }),
  };
}

export async function updateBill(
  userId: string,
  id: string,
  body: unknown
): Promise<ServiceResult<Bill>> {
  await ensureSeeded();
  const parsed = updateBillSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }
  const result = await repo.update(userId, id, parsed.data);
  if (!result) return { error: { message: 'Bill not found', code: 'NOT_FOUND' } };
  return { data: result };
}

export async function deleteBill(
  userId: string,
  id: string
): Promise<ServiceResult<{ success: boolean }>> {
  await ensureSeeded();
  if (!(await repo.delete(userId, id)))
    return { error: { message: 'Bill not found', code: 'NOT_FOUND' } };
  return { data: { success: true } };
}

/** Copy recurring bills from a previous month into the target month (unpaid). */
export async function generateRecurringBills(
  userId: string,
  month: number,
  year: number
): Promise<ServiceResult<{ generated: number }>> {
  await ensureSeeded();

  // Find if target month already has bills
  const existing = await repo.findByMonth(userId, month, year);
  if (existing.length > 0) {
    return { data: { generated: 0 } };
  }

  // Find the most recent month with recurring bills (look back up to 12 months)
  let sourceMonth = month - 1;
  let sourceYear = year;
  if (sourceMonth < 0) {
    sourceMonth = 11;
    sourceYear--;
  }

  let recurringBills: Bill[] = [];
  for (let i = 0; i < 12; i++) {
    recurringBills = await repo.findRecurringByMonth(userId, sourceMonth, sourceYear);
    if (recurringBills.length > 0) break;
    sourceMonth--;
    if (sourceMonth < 0) {
      sourceMonth = 11;
      sourceYear--;
    }
  }

  if (recurringBills.length === 0) {
    return { data: { generated: 0 } };
  }

  let generated = 0;
  for (const bill of recurringBills) {
    await repo.create(userId, {
      name: bill.name,
      amount: bill.amount,
      dueDate: bill.dueDate,
      isPaid: false,
      isRecurring: true,
      month,
      year,
    });
    generated++;
  }

  return { data: { generated } };
}
