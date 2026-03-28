import { NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';

export async function GET() {
  // Only available in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }

  try {
    const db = await getDb();
    const result = await db.query<{ count: number | string }>('SELECT COUNT(*) as count FROM users');
    const hasUsers = Number(result.rows[0]?.count ?? 0) > 0;
    return NextResponse.json({ data: { hasUsers } });
  } catch {
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 });
  }
}
