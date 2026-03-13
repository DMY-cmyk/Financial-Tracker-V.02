import { ensureSeeded } from '@/server/db/seed';
import { createSavingsGoalRepository } from '@/server/repositories/savings-goal.repository';
import { createSavingsGoalSchema, updateSavingsGoalSchema } from '@/lib/api/validation';
import type { SavingsGoal } from '@/lib/types';

const repo = createSavingsGoalRepository();

function formatZodError(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
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

export async function listSavingsGoals(): Promise<ServiceResult<SavingsGoal[]>> {
  await ensureSeeded();
  return { data: await repo.findAll() };
}

export async function getSavingsGoal(id: string): Promise<ServiceResult<SavingsGoal>> {
  await ensureSeeded();
  const goal = await repo.findById(id);
  if (!goal) return { error: { message: 'Savings goal not found', code: 'NOT_FOUND' } };
  return { data: goal };
}

export async function createSavingsGoal(body: unknown): Promise<ServiceResult<SavingsGoal>> {
  await ensureSeeded();
  const parsed = createSavingsGoalSchema.safeParse(body);
  if (!parsed.success) {
    return { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: formatZodError(parsed.error) } };
  }
  const data = parsed.data;
  return {
    data: await repo.create({
      name: data.name,
      targetAmount: data.targetAmount,
      savedAmount: data.savedAmount ?? 0,
      color: data.color,
    }),
  };
}

export async function updateSavingsGoal(id: string, body: unknown): Promise<ServiceResult<SavingsGoal>> {
  await ensureSeeded();
  const parsed = updateSavingsGoalSchema.safeParse(body);
  if (!parsed.success) {
    return { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: formatZodError(parsed.error) } };
  }
  const result = await repo.update(id, parsed.data);
  if (!result) return { error: { message: 'Savings goal not found', code: 'NOT_FOUND' } };
  return { data: result };
}

export async function deleteSavingsGoal(id: string): Promise<ServiceResult<{ success: boolean }>> {
  await ensureSeeded();
  if (!(await repo.delete(id))) return { error: { message: 'Savings goal not found', code: 'NOT_FOUND' } };
  return { data: { success: true } };
}
