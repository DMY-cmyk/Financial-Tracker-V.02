import { getDb } from '@/server/db/client';

export function createSettingsRepository() {
  return {
    async get(key: string): Promise<string | undefined> {
      const db = await getDb();
      const result = await db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', [
        key,
      ]);
      return result.rows[0]?.value;
    },

    async getAll(): Promise<Record<string, string>> {
      const db = await getDb();
      const result = await db.query<{ key: string; value: string }>(
        'SELECT key, value FROM settings'
      );
      const out: Record<string, string> = {};
      for (const r of result.rows) out[r.key] = r.value;
      return out;
    },

    async set(key: string, value: string): Promise<void> {
      const db = await getDb();
      await db.query(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, value]
      );
    },

    async setMany(entries: Record<string, string>): Promise<void> {
      const db = await getDb();
      for (const [k, v] of Object.entries(entries)) {
        await db.query(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
          [k, v]
        );
      }
    },

    async delete(key: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM settings WHERE key = ?', [key]);
      return result.rowCount > 0;
    },
  };
}
