import { NextRequest, NextResponse } from 'next/server';
import { listTemplates, createTemplate } from '@/server/services/budget-template.service';

export async function GET() {
  const result = await listTemplates();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: { templates: result.data } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await createTemplate(body.name);
  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
