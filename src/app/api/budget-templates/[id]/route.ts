import { NextRequest, NextResponse } from 'next/server';
import { deleteTemplate } from '@/server/services/budget-template.service';
import { requireUserId } from '@/server/auth/current-user';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await deleteTemplate(requireUserId(request), id);
  if (result.error) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data });
}
