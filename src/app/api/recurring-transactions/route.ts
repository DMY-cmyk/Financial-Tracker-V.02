import { NextRequest, NextResponse } from 'next/server';
import {
  listRecurringTransactions,
  createRecurringTransaction,
} from '@/server/services/recurring-transaction.service';
import { readJsonBody } from '@/lib/api/read-json';

export async function GET() {
  const result = await listRecurringTransactions();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: { recurringTransactions: result.data } });
}

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const result = await createRecurringTransaction(body);

  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
