import { NextResponse } from 'next/server';
import { getCurrentNetWorth, getNetWorthHistory } from '@/server/services/net-worth.service';

export async function GET() {
  const [currentResult, historyResult] = await Promise.all([
    getCurrentNetWorth(),
    getNetWorthHistory(),
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
