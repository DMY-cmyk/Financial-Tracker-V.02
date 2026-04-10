import { NextResponse } from 'next/server';
import { recordSnapshot } from '@/server/services/net-worth.service';

export async function POST() {
  const result = await recordSnapshot();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
