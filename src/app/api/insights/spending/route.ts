import { NextRequest, NextResponse } from 'next/server';
import { getSpendingInsights } from '@/server/services/insights.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get('month') ?? '0', 10);
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);

  if (isNaN(month) || month < 0 || month > 11 || isNaN(year)) {
    return NextResponse.json(
      { error: { message: 'Invalid month or year', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  const result = await getSpendingInsights(month, year);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ data: result.data });
}
