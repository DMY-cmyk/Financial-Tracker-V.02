import { NextRequest, NextResponse } from 'next/server';
import { listBills, createBill } from '@/server/services/bill.service';

export async function GET(request: NextRequest) {
  const monthParam = request.nextUrl.searchParams.get('month');
  const yearParam = request.nextUrl.searchParams.get('year');

  const query =
    monthParam !== null && yearParam !== null
      ? { month: parseInt(monthParam, 10), year: parseInt(yearParam, 10) }
      : undefined;

  const result = await listBills(query);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: { bills: result.data } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await createBill(body);

  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
