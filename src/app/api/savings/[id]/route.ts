import { NextRequest, NextResponse } from 'next/server';
import { updateSavingsGoal, deleteSavingsGoal } from '@/server/services/savings-goal.service';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const result = await updateSavingsGoal(id, body);

  if (result.error) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await deleteSavingsGoal(id);

  if (result.error) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data });
}
