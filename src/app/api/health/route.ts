import { NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';

export async function GET() {
  try {
    const db = await getDb();
    const result = await db.query<{ ok: number }>('SELECT 1 as ok', []);
    const dbOk = result.rows.length > 0 && result.rows[0].ok === 1;

    return NextResponse.json({
      status: dbOk ? 'healthy' : 'degraded',
      database: dbOk ? 'connected' : 'error',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
