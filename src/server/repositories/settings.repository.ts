import { getDb } from '@/server/db/client';

export function createSettingsRepository() {
  return {
    async get(userId: string, key: string): Promise<string | undefined> {
      const db = await getDb();
      const result = await db.query<{ value: string }>(
        'SELECT value FROM settings WHERE user_id = ? AND key = ?',
        [userId, key]
      );
      return result.rows[0]?.value;
    },

    async getAll(userId: string): Promise<Record<string, string>> {
      const db = await getDb();
      const result = await db.query<{ key: string; value: string }>(
        'SELECT key, value FROM settings WHERE user_id = ?',
        [userId]
      );
      const out: Record<string, string> = {};
      for (const r of result.rows) out[r.key] = r.value;
      return out;
    },

    async set(userId: string, key: string, value: string): Promise<void> {
      const db = await getDb();
      await db.query(
        'INSERT INTO settings (key, user_id, value) VALUES (?, ?, ?) ON CONFLICT (key, user_id) DO UPDATE SET value = EXCLUDED.value',
        [key, userId, value]
      );
    },

    async setMany(userId: string, entries: Record<string, string>): Promise<void> {
      const db = await getDb();
      for (const [k, v] of Object.entries(entries)) {
        await db.query(
          'INSERT INTO settings (key, user_id, value) VALUES (?, ?, ?) ON CONFLICT (key, user_id) DO UPDATE SET value = EXCLUDED.value',
          [k, userId, v]
        );
      }
    },

    async delete(userId: string, key: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.query('DELETE FROM settings WHERE user_id = ? AND key = ?', [
        userId,
        key,
      ]);
      return result.rowCount > 0;
    },
  };
}
