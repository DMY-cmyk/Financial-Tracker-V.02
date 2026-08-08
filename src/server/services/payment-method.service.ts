import { ensureSeeded } from '@/server/db/seed';
import { createPaymentMethodRepository } from '@/server/repositories/payment-method.repository';
import { createTransactionRepository } from '@/server/repositories/transaction.repository';
import { createPaymentMethodSchema, updatePaymentMethodSchema } from '@/lib/api/validation';
import type { PaymentMethod } from '@/lib/types';

const repo = createPaymentMethodRepository();

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

export async function listPaymentMethods(userId: string): Promise<ServiceResult<PaymentMethod[]>> {
  await ensureSeeded();
  return { data: await repo.findAll(userId) };
}

export async function createPaymentMethod(
  userId: string,
  body: unknown
): Promise<ServiceResult<PaymentMethod>> {
  await ensureSeeded();
  const parsed = createPaymentMethodSchema.safeParse(body);
  if (!parsed.success)
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  return { data: await repo.create(userId, parsed.data) };
}

export async function updatePaymentMethod(
  userId: string,
  id: string,
  body: unknown
): Promise<ServiceResult<PaymentMethod>> {
  await ensureSeeded();
  const parsed = updatePaymentMethodSchema.safeParse(body);
  if (!parsed.success)
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  const result = await repo.update(userId, id, parsed.data);
  if (!result) return { error: { message: 'Payment method not found', code: 'NOT_FOUND' } };
  return { data: result };
}

export async function deletePaymentMethod(
  userId: string,
  id: string
): Promise<ServiceResult<{ success: boolean }>> {
  await ensureSeeded();
  const method = await repo.findById(userId, id);
  if (!method) return { error: { message: 'Payment method not found', code: 'NOT_FOUND' } };

  const deleted = await repo.deleteIfUnused(userId, id, method.name);
  if (!deleted) {
    const txRepo = createTransactionRepository();
    const count = await txRepo.countByPaymentMethod(userId, method.name);
    return {
      error: {
        message: `Cannot delete "${method.name}" — ${count} transaction(s) still use it`,
        code: 'CONFLICT',
      },
    };
  }
  return { data: { success: true } };
}
