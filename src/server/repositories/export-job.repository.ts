import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

export interface ExportJobRecord {
  id: string;
  format: string;
  scope: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters: string | null;
  options: string | null;
  filename: string | null;
  recordCount: number;
  createdAt: string;
  completedAt: string | null;
}

interface JobRow {
  id: string;
  format: string;
  scope: string;
  status: string;
  filters: string | null;
  options: string | null;
  filename: string | null;
  record_count: number;
  created_at: string;
  completed_at: string | null;
}

function rowToJob(r: JobRow): ExportJobRecord {
  return {
    id: r.id,
    format: r.format,
    scope: r.scope,
    status: r.status as ExportJobRecord['status'],
    filters: r.filters,
    options: r.options,
    filename: r.filename,
    recordCount: r.record_count,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  };
}

export function createExportJobRepository() {
  return {
    async findAll(userId: string): Promise<ExportJobRecord[]> {
      const db = await getDb();
      const result = await db.query<JobRow>(
        'SELECT * FROM export_jobs WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return result.rows.map(rowToJob);
    },

    async findById(userId: string, id: string): Promise<ExportJobRecord | undefined> {
      const db = await getDb();
      const result = await db.query<JobRow>(
        'SELECT * FROM export_jobs WHERE user_id = ? AND id = ?',
        [userId, id]
      );
      return result.rows[0] ? rowToJob(result.rows[0]) : undefined;
    },

    async create(
      userId: string,
      data: {
        format: string;
        scope: string;
        filters?: string;
        options?: string;
        recordCount?: number;
      }
    ): Promise<ExportJobRecord> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        'INSERT INTO export_jobs (id, user_id, format, scope, filters, options, record_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          userId,
          data.format,
          data.scope,
          data.filters || null,
          data.options || null,
          data.recordCount || 0,
        ]
      );
      const record = await this.findById(userId, id);
      return record!;
    },

    async updateStatus(
      userId: string,
      id: string,
      status: string,
      filename?: string
    ): Promise<ExportJobRecord | undefined> {
      const existing = await this.findById(userId, id);
      if (!existing) return undefined;
      const db = await getDb();
      if (status === 'completed') {
        await db.query(
          'UPDATE export_jobs SET status=?, filename=?, completed_at=CURRENT_TIMESTAMP WHERE user_id=? AND id=?',
          [status, filename || null, userId, id]
        );
      } else {
        await db.query('UPDATE export_jobs SET status=? WHERE user_id=? AND id=?', [
          status,
          userId,
          id,
        ]);
      }
      return this.findById(userId, id).then((r) => r!);
    },
  };
}
