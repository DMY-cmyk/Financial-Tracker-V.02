import { ensureSeeded } from '@/server/db/seed';
import { createLiabilityRepository } from '@/server/repositories/liability.repository';
import { createLiabilitySchema, updateLiabilitySchema } from '@/lib/api/validation';
import type { Liability } from '@/lib/types';

const repo = createLiabilityRepository();

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string; details?: Record<string, string[]> };
}

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

export async function listLiabilities(userId: string): Promise<ServiceResult<Liability[]>> {
  await ensureSeeded();
  return { data: await repo.findAll(userId) };
}

export async function createLiability(
  userId: string,
  body: unknown
): Promise<ServiceResult<Liability>> {
  await ensureSeeded();
  const parsed = createLiabilitySchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }
  return { data: await repo.create(userId, parsed.data) };
}

export async function updateLiability(
  userId: string,
  id: string,
  body: unknown
): Promise<ServiceResult<Liability>> {
  await ensureSeeded();
  const parsed = updateLiabilitySchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  }
  const updated = await repo.update(userId, id, parsed.data);
  if (!updated) {
    return { error: { message: 'Liability not found', code: 'NOT_FOUND' } };
  }
  return { data: updated };
}

export async function deleteLiability(
  userId: string,
  id: string
): Promise<ServiceResult<{ success: true }>> {
  await ensureSeeded();
  const deleted = await repo.delete(userId, id);
  if (!deleted) {
    return { error: { message: 'Liability not found', code: 'NOT_FOUND' } };
  }
  return { data: { success: true } };
}
