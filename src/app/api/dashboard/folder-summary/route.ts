import { NextRequest, NextResponse } from 'next/server';
import { getYearSummaries, getMonthSummaries } from '@/server/services/folder-summary.service';

export async function GET(request: NextRequest) {
  const yearStr = request.nextUrl.searchParams.get('year');

  if (yearStr) {
    const year = parseInt(yearStr, 10);
    const result = await getMonthSummaries(year);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ data: result.data });
  }

  const result = await getYearSummaries();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: result.data });
}
