import { NextRequest, NextResponse } from 'next/server';
import {
  listRecurringTransactions,
  createRecurringTransaction,
} from '@/server/services/recurring-transaction.service';

export async function GET() {
  const result = await listRecurringTransactions();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: { recurringTransactions: result.data } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await createRecurringTransaction(body);

  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
