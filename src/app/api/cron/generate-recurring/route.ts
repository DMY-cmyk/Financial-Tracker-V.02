import { NextResponse } from 'next/server';
import { generateRecurringTransactions } from '@/server/services/recurring-transaction.service';
import { getDb } from '@/server/db/client';
import { ensureSeeded } from '@/server/db/seed';

if (!process.env.CRON_SECRET) {
  console.warn(
    'CRON_SECRET not set — cron endpoint will reject all requests unless Vercel header is present'
  );
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const vercelHeader = request.headers.get('x-vercel-cron-signature');

  const isSecretValid =
    !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isVercelCron = vercelHeader != null;

  if (!isSecretValid && !isVercelCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Cron is system-wide. Run generation for every known user; propagate the
  // first error so monitoring can alert. ensureSeeded() guarantees at least
  // the demo user exists in fresh installs.
  await ensureSeeded();
  const db = await getDb();
  const users = await db.query<{ id: string }>('SELECT id FROM users');

  let totalGenerated = 0;
  let totalSkipped = 0;
  for (const row of users.rows) {
    const result = await generateRecurringTransactions(row.id);
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
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
    },
  });
}
