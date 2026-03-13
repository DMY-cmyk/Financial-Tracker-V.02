import { NextRequest, NextResponse } from 'next/server';
import { listSavingsGoals, createSavingsGoal } from '@/server/services/savings-goal.service';

export async function GET() {
  const result = await listSavingsGoals();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: { goals: result.data } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await createSavingsGoal(body);

  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
