import { NextRequest, NextResponse } from 'next/server';
import {
  getAnnualBudgetGrid,
  upsertMonthlyBudget,
  deleteMonthlyBudget,
} from '@/server/services/annual-budget.service';
import { readJsonBody } from '@/lib/api/read-json';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get('year');
  if (!yearParam) {
    return NextResponse.json(
      { error: { message: 'year is required', code: 'BAD_REQUEST' } },
      { status: 400 }
    );
  }
  const year = parseInt(yearParam, 10);
  if (isNaN(year)) {
    return NextResponse.json(
      { error: { message: 'year must be a number', code: 'BAD_REQUEST' } },
      { status: 400 }
    );
  }
  const result = await getAnnualBudgetGrid(year);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: result.data });
}

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const result = await upsertMonthlyBudget(body);
  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const result = await deleteMonthlyBudget(body);
  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data });
}
