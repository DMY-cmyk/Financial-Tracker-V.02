import { NextRequest, NextResponse } from 'next/server';
import { getForecast } from '@/server/services/forecast.service';
import { requireUserId } from '@/server/auth/current-user';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawMonths = searchParams.get('months');
  const months = Math.min(Math.max(parseInt(rawMonths ?? '6', 10) || 6, 1), 12);

  const result = await getForecast(requireUserId(request), months);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: result.data });
}
