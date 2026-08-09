import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/api/read-json';
import { reorderCategories } from '@/server/services/category.service';
import { requireUserId } from '@/server/auth/current-user';

export async function PATCH(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data as { ids?: string[] };
  const result = await reorderCategories(requireUserId(request), body.ids ?? []);
  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data });
}
