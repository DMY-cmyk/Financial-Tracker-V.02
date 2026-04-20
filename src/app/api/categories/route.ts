import { NextRequest, NextResponse } from 'next/server';
import { listCategories, createCategory } from '@/server/services/category.service';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get('type') || undefined;
  const monthParam = params.get('month');
  const yearParam = params.get('year');
  const monthRaw = monthParam !== null ? parseInt(monthParam, 10) : undefined;
  const yearRaw = yearParam !== null ? parseInt(yearParam, 10) : undefined;
  const month = monthRaw !== undefined && !isNaN(monthRaw) ? monthRaw : undefined;
  const year = yearRaw !== undefined && !isNaN(yearRaw) ? yearRaw : undefined;

  const result = await listCategories(
    type || month !== undefined || year !== undefined
      ? { type, month, year }
      : undefined
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: { categories: result.data } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await createCategory(body);

  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
