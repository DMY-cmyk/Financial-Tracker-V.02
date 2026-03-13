import { getDb } from '@/server/db/client';
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
    async findAll(): Promise<UploadRecord[]> {
      const db = await getDb();
      const result = await db.query<UploadRow>('SELECT * FROM uploads ORDER BY created_at DESC');
      return result.rows.map(rowToUpload);
    },

    async findById(id: string): Promise<UploadRecord | undefined> {
      const db = await getDb();
      const result = await db.query<UploadRow>('SELECT * FROM uploads WHERE id = ?', [id]);
      return result.rows[0] ? rowToUpload(result.rows[0]) : undefined;
    },

    async create(data: { filename: string; fileSize: number; mimeType: string }): Promise<UploadRecord> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        'INSERT INTO uploads (id, filename, file_size, mime_type) VALUES (?, ?, ?, ?)',
        [id, data.filename, data.fileSize, data.mimeType]
      );
      const record = await this.findById(id);
      return record!;
    },

    async update(id: string, data: { status?: string; extractedData?: string }): Promise<UploadRecord | undefined> {
      const existing = await this.findById(id);
      if (!existing) return undefined;
      const db = await getDb();
      if (data.status) {
        await db.query('UPDATE uploads SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [data.status, id]);
      }
      if (data.extractedData !== undefined) {
        await db.query('UPDATE uploads SET extracted_data=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [data.extractedData, id]);
      }
      return this.findById(id).then((r) => r!);
    },
  };
}
