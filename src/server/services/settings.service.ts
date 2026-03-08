import { ensureSeeded } from '@/server/db/seed';
import { createSettingsRepository } from '@/server/repositories/settings.repository';
import { updateSettingsSchema } from '@/lib/api/validation';

const repo = createSettingsRepository();

function formatZodError(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const f: Record<string, string[]> = {};
  for (const i of error.issues) { const p = String(i.path.join('.') || '_root'); if (!f[p]) f[p] = []; f[p].push(i.message); }
  return f;
}

interface ServiceResult<T> { data?: T; error?: { message: string; code: string; details?: Record<string, string[]> } }

export function getSettings(): ServiceResult<Record<string, string>> {
  ensureSeeded();
  return { data: repo.getAll() };
}

export function updateSettings(body: unknown): ServiceResult<Record<string, string>> {
  ensureSeeded();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) return { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: formatZodError(parsed.error) } };
  repo.setMany(parsed.data);
  return { data: repo.getAll() };
}
