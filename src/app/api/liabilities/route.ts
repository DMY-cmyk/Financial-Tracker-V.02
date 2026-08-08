import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/api/read-json';
import { listLiabilities, createLiability } from '@/server/services/liability.service';
import { requireUserId } from '@/server/auth/current-user';

export async function GET(request: NextRequest) {
  const result = await listLiabilities(requireUserId(request));
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: { liabilities: result.data } });
}

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const result = await createLiability(requireUserId(request), body);
  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
