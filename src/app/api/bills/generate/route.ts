import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/api/read-json';
import { generateRecurringBills } from '@/server/services/bill.service';

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const month = Number((body as { month?: unknown }).month);
  const year = Number((body as { year?: unknown }).year);

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
