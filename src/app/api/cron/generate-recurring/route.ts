import { NextResponse } from 'next/server';
import { generateRecurringTransactions } from '@/server/services/recurring-transaction.service';
import { getDb } from '@/server/db/client';
import { ensureSeeded } from '@/server/db/seed';

export async function POST(request: Request) {
  // Fail-closed: hanya Bearer CRON_SECRET yang sah. Header
  // x-vercel-cron-signature TIDAK diperiksa karena bisa diset klien mana pun;
  // Vercel Cron sendiri mengirim Authorization: Bearer CRON_SECRET bila env
  // tersebut terpasang di project.
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSeeded();
  const db = await getDb();
  const users = await db.query<{ id: string }>('SELECT id FROM users');

  let totalGenerated = 0;
  let totalSkipped = 0;
  let failed = 0;
  for (const row of users.rows) {
    const result = await generateRecurringTransactions(row.id);
    if (result.error) {
      console.error(`[cron/generate-recurring] user ${row.id}:`, result.error.message);
      failed += 1;
      continue;
    }
    if (result.data) {
      totalGenerated += result.data.generated;
      totalSkipped += result.data.skipped;
    }
  }

  return NextResponse.json({
    data: {
      generated: totalGenerated,
      skipped: totalSkipped,
      users: users.rows.length,
      failed,
    },
  });
}
