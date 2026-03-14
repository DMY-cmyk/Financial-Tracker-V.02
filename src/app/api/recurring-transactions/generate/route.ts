import { NextResponse } from 'next/server';
import { generateRecurringTransactions } from '@/server/services/recurring-transaction.service';

export async function POST() {
  const result = await generateRecurringTransactions();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: result.data });
}
