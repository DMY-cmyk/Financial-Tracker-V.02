import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/api/read-json';
import { updateUpload, deleteUpload } from '@/server/services/upload.service';
import { requireUserId } from '@/server/auth/current-user';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const result = await updateUpload(requireUserId(request), id, body);

  if (result.error) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await deleteUpload(requireUserId(request), id);

  if (result.error) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data });
}
