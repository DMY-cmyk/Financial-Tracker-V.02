import { NextResponse } from 'next/server';
import { generateRecurringTransactions } from '@/server/services/recurring-transaction.service';

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

  const result = await generateRecurringTransactions();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      generated: result.data?.generated ?? 0,
      skipped: result.data?.skipped ?? 0,
    },
  });
}
