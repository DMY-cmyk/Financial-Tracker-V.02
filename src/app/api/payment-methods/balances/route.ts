import { NextResponse } from 'next/server';
import { listPaymentMethodBalances } from '@/server/services/balance.service';

export async function GET() {
  const result = await listPaymentMethodBalances();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: { balances: result.data } });
}
