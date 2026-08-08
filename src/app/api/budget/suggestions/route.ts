import { NextRequest, NextResponse } from 'next/server';
import { getBudgetSuggestions } from '@/server/services/budget-template.service';
import { requireUserId } from '@/server/auth/current-user';

export async function GET(request: NextRequest) {
  const monthsParam = request.nextUrl.searchParams.get('months');
  const months = monthsParam ? parseInt(monthsParam, 10) : 3;
  if (isNaN(months) || months < 1 || months > 24) {
    return NextResponse.json(
      { error: { message: 'months must be between 1 and 24', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }
  const result = await getBudgetSuggestions(requireUserId(request), months);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: { suggestions: result.data } });
}
