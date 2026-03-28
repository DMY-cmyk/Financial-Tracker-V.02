import { NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';

export async function GET() {
  // Only available in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }

  try {
    const db = await getDb();
    const result = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM users', []);
    const hasUsers = result.rows.length > 0 && result.rows[0].count > 0;
    return NextResponse.json({ data: { hasUsers } });
  } catch {
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 });
  }
}
