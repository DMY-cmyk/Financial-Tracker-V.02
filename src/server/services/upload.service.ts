import { ensureSeeded } from '@/server/db/seed';
import { createUploadRepository, type UploadRecord } from '@/server/repositories/upload.repository';
import { createUploadSchema, updateUploadSchema } from '@/lib/api/validation';

const repo = createUploadRepository();

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

export async function listUploads(userId: string): Promise<ServiceResult<UploadRecord[]>> {
  await ensureSeeded();
  return { data: await repo.findAll(userId) };
}

export async function createUpload(
  userId: string,
  body: unknown
): Promise<ServiceResult<UploadRecord>> {
  await ensureSeeded();
  const parsed = createUploadSchema.safeParse(body);
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

export async function updateUpload(
  userId: string,
  id: string,
  body: unknown
): Promise<ServiceResult<UploadRecord>> {
  await ensureSeeded();
  const parsed = updateUploadSchema.safeParse(body);
  if (!parsed.success)
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodError(parsed.error),
      },
    };
  const result = await repo.update(userId, id, parsed.data);
  if (!result) return { error: { message: 'Upload not found', code: 'NOT_FOUND' } };
  return { data: result };
}
