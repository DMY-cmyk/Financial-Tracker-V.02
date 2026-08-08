import { NextRequest, NextResponse } from 'next/server';
import { getCurrentNetWorth, getNetWorthHistory } from '@/server/services/net-worth.service';
import { requireUserId } from '@/server/auth/current-user';

export async function GET(request: NextRequest) {
  const userId = requireUserId(request);
  const [currentResult, historyResult] = await Promise.all([
    getCurrentNetWorth(userId),
    getNetWorthHistory(userId),
  ]);

  if (currentResult.error) {
    return NextResponse.json({ error: currentResult.error }, { status: 500 });
  }
  if (historyResult.error) {
    return NextResponse.json({ error: historyResult.error }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      current: currentResult.data,
      history: historyResult.data,
    },
  });
}
