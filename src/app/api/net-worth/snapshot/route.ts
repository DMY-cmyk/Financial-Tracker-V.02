import { NextRequest, NextResponse } from 'next/server';
import { recordSnapshot } from '@/server/services/net-worth.service';
import { requireUserId } from '@/server/auth/current-user';

export async function POST(request: NextRequest) {
  const result = await recordSnapshot(requireUserId(request));
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
