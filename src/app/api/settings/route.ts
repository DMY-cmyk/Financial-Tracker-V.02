import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/server/services/settings.service';

export async function GET() {
  const result = getSettings();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: { settings: result.data } });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const result = updateSettings(body);

  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: { settings: result.data } });
}
