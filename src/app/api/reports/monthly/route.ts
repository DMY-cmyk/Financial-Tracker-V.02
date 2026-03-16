import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyReportData } from '@/server/services/report.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const monthStr = searchParams.get('month');
  const yearStr = searchParams.get('year');

  const month = monthStr !== null ? parseInt(monthStr, 10) : NaN;
  const year = yearStr !== null ? parseInt(yearStr, 10) : NaN;

  if (isNaN(month) || isNaN(year) || month < 0 || month > 11 || year < 2000) {
    return NextResponse.json(
      { error: { message: 'Valid month (0-11) and year are required', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  const result = await getMonthlyReportData(month, year);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: { report: result.data } });
}
