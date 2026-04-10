import type { NetWorthSnapshot } from '@/lib/types';
import { getDb } from '@/server/db/client';
import { nanoid } from 'nanoid';

interface NetWorthSnapshotRow {
  id: string;
  month: number;
  year: number;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  snapshot_data: string | null;
  created_at: string;
}

function rowToSnapshot(row: NetWorthSnapshotRow): NetWorthSnapshot {
  return {
    id: row.id,
    month: Number(row.month),
    year: Number(row.year),
    totalAssets: Number(row.total_assets),
    totalLiabilities: Number(row.total_liabilities),
    netWorth: Number(row.net_worth),
    snapshotData: row.snapshot_data ? JSON.parse(row.snapshot_data) : null,
    createdAt: row.created_at,
  };
}

export function createNetWorthRepository() {
  return {
    async getHistory(limit = 12): Promise<NetWorthSnapshot[]> {
      const db = await getDb();
      const result = await db.query<NetWorthSnapshotRow>(
        'SELECT * FROM net_worth_snapshots ORDER BY year ASC, month ASC LIMIT ?',
        [limit]
      );
      return result.rows.map(rowToSnapshot);
    },

    async findByMonth(month: number, year: number): Promise<NetWorthSnapshot | undefined> {
      const db = await getDb();
      const result = await db.query<NetWorthSnapshotRow>(
        'SELECT * FROM net_worth_snapshots WHERE month = ? AND year = ?',
        [month, year]
      );
      return result.rows[0] ? rowToSnapshot(result.rows[0]) : undefined;
    },

    async upsert(data: {
      month: number;
      year: number;
      totalAssets: number;
      totalLiabilities: number;
      netWorth: number;
      snapshotData: string;
    }): Promise<NetWorthSnapshot> {
      const id = nanoid();
      const db = await getDb();
      await db.query(
        `INSERT INTO net_worth_snapshots
           (id, month, year, total_assets, total_liabilities, net_worth, snapshot_data)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(month, year) DO UPDATE SET
           total_assets      = excluded.total_assets,
           total_liabilities = excluded.total_liabilities,
           net_worth         = excluded.net_worth,
           snapshot_data     = excluded.snapshot_data`,
        [
          id,
          data.month,
          data.year,
          data.totalAssets,
          data.totalLiabilities,
          data.netWorth,
          data.snapshotData,
        ]
      );
      const result = await db.query<NetWorthSnapshotRow>(
        'SELECT * FROM net_worth_snapshots WHERE month = ? AND year = ?',
        [data.month, data.year]
      );
      return rowToSnapshot(result.rows[0]);
    },
  };
}
