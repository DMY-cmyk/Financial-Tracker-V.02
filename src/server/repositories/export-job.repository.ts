import { getDb } from '@/server/db/sqlite';
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
  id: string; format: string; scope: string; status: string;
  filters: string | null; options: string | null; filename: string | null;
  record_count: number; created_at: string; completed_at: string | null;
}

function rowToJob(r: JobRow): ExportJobRecord {
  return {
    id: r.id, format: r.format, scope: r.scope,
    status: r.status as ExportJobRecord['status'],
    filters: r.filters, options: r.options, filename: r.filename,
    recordCount: r.record_count, createdAt: r.created_at, completedAt: r.completed_at,
  };
}

export function createExportJobRepository() {
  return {
    findAll(): ExportJobRecord[] {
      return (getDb().prepare('SELECT * FROM export_jobs ORDER BY created_at DESC').all() as JobRow[]).map(rowToJob);
    },

    findById(id: string): ExportJobRecord | undefined {
      const r = getDb().prepare('SELECT * FROM export_jobs WHERE id = ?').get(id) as JobRow | undefined;
      return r ? rowToJob(r) : undefined;
    },

    create(data: { format: string; scope: string; filters?: string; options?: string; recordCount?: number }): ExportJobRecord {
      const id = nanoid();
      getDb().prepare(
        'INSERT INTO export_jobs (id, format, scope, filters, options, record_count) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, data.format, data.scope, data.filters || null, data.options || null, data.recordCount || 0);
      return this.findById(id)!;
    },

    updateStatus(id: string, status: string, filename?: string): ExportJobRecord | undefined {
      const existing = this.findById(id);
      if (!existing) return undefined;
      if (status === 'completed') {
        getDb().prepare(`UPDATE export_jobs SET status=?, filename=?, completed_at=datetime('now') WHERE id=?`).run(status, filename || null, id);
      } else {
        getDb().prepare('UPDATE export_jobs SET status=? WHERE id=?').run(status, id);
      }
      return this.findById(id)!;
    },
  };
}
