import { NextRequest, NextResponse } from 'next/server';
import {
  bulkCreateTransactions,
  bulkDeleteTransactions,
} from '@/server/services/transaction.service';
import { readJsonBody } from '@/lib/api/read-json';
import { requireUserId } from '@/server/auth/current-user';

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const result = await bulkCreateTransactions(requireUserId(request), body);

  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const result = await bulkDeleteTransactions(requireUserId(request), body);

  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ data: result.data });
}
