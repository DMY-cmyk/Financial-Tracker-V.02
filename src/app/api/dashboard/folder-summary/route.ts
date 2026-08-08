import { NextRequest, NextResponse } from 'next/server';
import { getYearSummaries, getMonthSummaries } from '@/server/services/folder-summary.service';
import { requireUserId } from '@/server/auth/current-user';

export async function GET(request: NextRequest) {
  const yearStr = request.nextUrl.searchParams.get('year');
  const userId = requireUserId(request);

  if (yearStr) {
    const year = parseInt(yearStr, 10);
    const result = await getMonthSummaries(userId, year);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ data: result.data });
  }

  const result = await getYearSummaries(userId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: result.data });
}
