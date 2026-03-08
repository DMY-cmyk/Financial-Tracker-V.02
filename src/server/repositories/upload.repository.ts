import { getDb } from '@/server/db/sqlite';
import { nanoid } from 'nanoid';

export interface UploadRecord {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'processing' | 'extracted' | 'saved' | 'error';
  extractedData: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UploadRow {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  status: string;
  extracted_data: string | null;
  created_at: string;
  updated_at: string;
}

function rowToUpload(r: UploadRow): UploadRecord {
  return {
    id: r.id, filename: r.filename, fileSize: r.file_size, mimeType: r.mime_type,
    status: r.status as UploadRecord['status'], extractedData: r.extracted_data,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export function createUploadRepository() {
  return {
    findAll(): UploadRecord[] {
      return (getDb().prepare('SELECT * FROM uploads ORDER BY created_at DESC').all() as UploadRow[]).map(rowToUpload);
    },

    findById(id: string): UploadRecord | undefined {
      const r = getDb().prepare('SELECT * FROM uploads WHERE id = ?').get(id) as UploadRow | undefined;
      return r ? rowToUpload(r) : undefined;
    },

    create(data: { filename: string; fileSize: number; mimeType: string }): UploadRecord {
      const id = nanoid();
      getDb().prepare('INSERT INTO uploads (id, filename, file_size, mime_type) VALUES (?, ?, ?, ?)').run(id, data.filename, data.fileSize, data.mimeType);
      return this.findById(id)!;
    },

    update(id: string, data: { status?: string; extractedData?: string }): UploadRecord | undefined {
      const existing = this.findById(id);
      if (!existing) return undefined;
      if (data.status) getDb().prepare(`UPDATE uploads SET status=?, updated_at=datetime('now') WHERE id=?`).run(data.status, id);
      if (data.extractedData !== undefined) getDb().prepare(`UPDATE uploads SET extracted_data=?, updated_at=datetime('now') WHERE id=?`).run(data.extractedData, id);
      return this.findById(id)!;
    },
  };
}
