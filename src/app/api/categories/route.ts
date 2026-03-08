import { NextRequest, NextResponse } from 'next/server';
import { listCategories, createCategory } from '@/server/services/category.service';

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') || undefined;
  const result = listCategories(type ? { type } : undefined);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: { categories: result.data } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = createCategory(body);

  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
