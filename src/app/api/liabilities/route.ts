import { NextRequest, NextResponse } from 'next/server';
import { listLiabilities, createLiability } from '@/server/services/liability.service';

export async function GET() {
  const result = await listLiabilities();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: { liabilities: result.data } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await createLiability(body);
  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
