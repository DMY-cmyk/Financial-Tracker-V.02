import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/server/auth/current-user';
import { clearUserData } from '@/server/services/data.service';

export async function DELETE(request: NextRequest) {
  try {
    const userId = requireUserId(request);
    const result = await clearUserData(userId);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ data: result.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear data';
    if (message.startsWith('UNAUTHENTICATED')) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: { message, code: 'CLEAR_FAILED' } }, { status: 500 });
  }
}
