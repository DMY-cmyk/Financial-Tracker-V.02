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

export async function listBills(query?: {
  month?: number;
  year?: number;
}): Promise<ServiceResult<Bill[]>> {
  await ensureSeeded();
  if (query?.month !== undefined && query?.year !== undefined) {
    return { data: await repo.findByMonth(query.month, query.year) };
  }
  return { data: await repo.findAll() };
}

export async function getBill(id: string): Promise<ServiceResult<Bill>> {
  await ensureSeeded();
  const bill = await repo.findById(id);
  if (!bill) return { error: { message: 'Bill not found', code: 'NOT_FOUND' } };
  return { data: bill };
}

export async function createBill(body: unknown): Promise<ServiceResult<Bill>> {
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
    data: await repo.create({
      name: data.name,
      amount: data.amount,
      dueDate: data.dueDate,
      isPaid: data.isPaid ?? false,
      month: data.month,
      year: data.year,
    }),
  };
}

export async function updateBill(id: string, body: unknown): Promise<ServiceResult<Bill>> {
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
  const result = await repo.update(id, parsed.data);
  if (!result) return { error: { message: 'Bill not found', code: 'NOT_FOUND' } };
  return { data: result };
}

export async function deleteBill(id: string): Promise<ServiceResult<{ success: boolean }>> {
  await ensureSeeded();
  if (!(await repo.delete(id))) return { error: { message: 'Bill not found', code: 'NOT_FOUND' } };
  return { data: { success: true } };
}
