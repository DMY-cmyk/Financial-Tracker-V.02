import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { listExportJobs, createExportJob } from '@/server/services/export-job.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('createExportJob', () => {
  it('creates an export job and marks as completed', async () => {
    const result = await createExportJob({ format: 'csv', scope: 'current' });
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBeDefined();
    expect(result.data!.format).toBe('csv');
    expect(result.data!.scope).toBe('current');
    expect(result.data!.status).toBe('completed');
    expect(result.data!.filename).toContain('.csv');
  });

  it('creates an export job with all options', async () => {
    const result = await createExportJob({
      format: 'json',
      scope: 'all',
      filters: '{"month":0}',
      options: '{"includeSummary":true}',
      recordCount: 42,
    });
    expect(result.data).toBeDefined();
    expect(result.data!.format).toBe('json');
    expect(result.data!.scope).toBe('all');
    expect(result.data!.recordCount).toBe(42);
  });

  it('returns validation error for invalid format', async () => {
    const result = await createExportJob({ format: 'docx', scope: 'current' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for invalid scope', async () => {
    const result = await createExportJob({ format: 'csv', scope: 'monthly' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for missing fields', async () => {
    const result = await createExportJob({});
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('listExportJobs', () => {
  it('returns all export jobs', async () => {
    await createExportJob({ format: 'csv', scope: 'current' });
    await createExportJob({ format: 'json', scope: 'all' });

    const result = await listExportJobs();
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(2);
  });

  it('returns empty array when no jobs', async () => {
    const result = await listExportJobs();
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(0);
  });
});
