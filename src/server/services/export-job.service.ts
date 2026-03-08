import { ensureSeeded } from '@/server/db/seed';
import { createExportJobRepository, type ExportJobRecord } from '@/server/repositories/export-job.repository';
import { createExportJobSchema } from '@/lib/api/validation';

const repo = createExportJobRepository();

function formatZodError(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const f: Record<string, string[]> = {};
  for (const i of error.issues) { const p = String(i.path.join('.') || '_root'); if (!f[p]) f[p] = []; f[p].push(i.message); }
  return f;
}

interface ServiceResult<T> { data?: T; error?: { message: string; code: string; details?: Record<string, string[]> } }

export function listExportJobs(): ServiceResult<ExportJobRecord[]> {
  ensureSeeded();
  return { data: repo.findAll() };
}

export function createExportJob(body: unknown): ServiceResult<ExportJobRecord> {
  ensureSeeded();
  const parsed = createExportJobSchema.safeParse(body);
  if (!parsed.success) return { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: formatZodError(parsed.error) } };
  const job = repo.create(parsed.data);
  // Mark as completed immediately (actual file generation is client-side for now)
  const completed = repo.updateStatus(job.id, 'completed', `export-${job.id}.${parsed.data.format}`);
  return { data: completed! };
}
