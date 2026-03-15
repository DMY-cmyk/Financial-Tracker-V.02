import { ensureSeeded } from '@/server/db/seed';
import { createTransactionRepository } from '@/server/repositories/transaction.repository';
import type { FolderSummaryResponse } from '@/lib/api/contracts';

const repo = createTransactionRepository();

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string };
}

export async function getYearSummaries(): Promise<ServiceResult<FolderSummaryResponse>> {
  await ensureSeeded();
  const years = await repo.getYearSummaries();
  return { data: { years } };
}

export async function getMonthSummaries(
  year: number
): Promise<ServiceResult<FolderSummaryResponse>> {
  await ensureSeeded();

  if (isNaN(year) || year < 1900 || year > 2200) {
    return { error: { message: 'Invalid year', code: 'VALIDATION_ERROR' } };
  }

  const months = await repo.getMonthSummaries(year);
  return { data: { months } };
}
