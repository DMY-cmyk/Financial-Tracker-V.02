import { NextRequest, NextResponse } from 'next/server';
import { generateRecurringTransactions } from '@/server/services/recurring-transaction.service';
import { requireUserId } from '@/server/auth/current-user';

export async function POST(request: NextRequest) {
  const result = await generateRecurringTransactions(requireUserId(request));

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: result.data });
}
