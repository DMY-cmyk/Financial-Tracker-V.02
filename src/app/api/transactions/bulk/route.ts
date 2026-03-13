import { NextRequest, NextResponse } from 'next/server';
import { bulkCreateTransactions } from '@/server/services/transaction.service';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await bulkCreateTransactions(body);

  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
