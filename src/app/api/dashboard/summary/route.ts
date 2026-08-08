import { NextRequest, NextResponse } from 'next/server';
import { getDashboardSummary } from '@/server/services/dashboard.service';
import { requireUserId } from '@/server/auth/current-user';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query: Record<string, unknown> = {};

  const monthStr = searchParams.get('month');
  const yearStr = searchParams.get('year');
  if (monthStr) query.month = parseInt(monthStr, 10);
  if (yearStr) query.year = parseInt(yearStr, 10);

  const result = await getDashboardSummary(requireUserId(request), query);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data });
}
