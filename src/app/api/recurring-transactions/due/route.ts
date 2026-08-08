import { NextRequest, NextResponse } from 'next/server';
import { getDueItems } from '@/server/services/recurring-transaction.service';
import { requireUserId } from '@/server/auth/current-user';

export async function GET(request: NextRequest) {
  const result = await getDueItems(requireUserId(request));

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ data: result.data });
}
