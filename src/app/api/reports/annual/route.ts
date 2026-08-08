import { NextRequest, NextResponse } from 'next/server';
import { getAnnualReportData } from '@/server/services/report.service';
import { requireUserId } from '@/server/auth/current-user';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearStr = searchParams.get('year');
  const year = yearStr !== null ? parseInt(yearStr, 10) : NaN;

  if (isNaN(year) || year < 2000) {
    return NextResponse.json(
      { error: { message: 'Valid year is required', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  const result = await getAnnualReportData(requireUserId(request), year);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: result.data });
}
