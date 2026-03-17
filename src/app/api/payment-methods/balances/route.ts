import { NextRequest, NextResponse } from 'next/server';
import { listPaymentMethodBalances } from '@/server/services/balance.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const monthStr = searchParams.get('month');
  const yearStr = searchParams.get('year');

  const month = monthStr !== null ? parseInt(monthStr, 10) : undefined;
  const year = yearStr !== null ? parseInt(yearStr, 10) : undefined;

  // Validate if provided
  if (month !== undefined && (isNaN(month) || month < 0 || month > 11)) {
    return NextResponse.json(
      { error: { message: 'month must be 0–11', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }
  if (year !== undefined && (isNaN(year) || year < 2000 || year > 2100)) {
    return NextResponse.json(
      { error: { message: 'year must be 2000–2100', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  const result = await listPaymentMethodBalances(month, year);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: { balances: result.data } });
}
