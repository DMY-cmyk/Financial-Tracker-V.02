import { NextRequest, NextResponse } from 'next/server';
import { generateRecurringBills } from '@/server/services/bill.service';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const month = Number(body.month);
  const year = Number(body.year);

  if (isNaN(month) || isNaN(year)) {
    return NextResponse.json(
      { error: { message: 'month and year are required', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  const result = await generateRecurringBills(month, year);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: result.data });
}
