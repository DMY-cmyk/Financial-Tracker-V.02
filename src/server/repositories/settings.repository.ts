import { getDb } from '@/server/db/sqlite';

export function createSettingsRepository() {
  return {
    get(key: string): string | undefined {
      const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
      return row?.value;
    },

    getAll(): Record<string, string> {
      const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
      const result: Record<string, string> = {};
      for (const r of rows) result[r.key] = r.value;
      return result;
    },

    set(key: string, value: string): void {
      getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    },

    setMany(entries: Record<string, string>): void {
      const stmt = getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      const tx = getDb().transaction(() => {
        for (const [k, v] of Object.entries(entries)) stmt.run(k, v);
      });
      tx();
    },

    delete(key: string): boolean {
      return getDb().prepare('DELETE FROM settings WHERE key = ?').run(key).changes > 0;
    },
  };
}
