import { NextResponse } from 'next/server';
import { getDueItems } from '@/server/services/recurring-transaction.service';

export async function GET() {
  const result = await getDueItems();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ data: result.data });
}
