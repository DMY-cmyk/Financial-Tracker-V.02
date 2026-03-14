import { NextRequest, NextResponse } from 'next/server';
import { listTransactions, createTransaction } from '@/server/services/transaction.service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query: Record<string, unknown> = {};

  const monthStr = searchParams.get('month');
  const yearStr = searchParams.get('year');
  if (monthStr) query.month = parseInt(monthStr, 10);
  if (yearStr) query.year = parseInt(yearStr, 10);

  const type = searchParams.get('type');
  if (type) query.type = type;

  const categoryId = searchParams.get('categoryId');
  if (categoryId) query.categoryId = categoryId;

  const paymentMethod = searchParams.get('paymentMethod');
  if (paymentMethod) query.paymentMethod = paymentMethod;

  const search = searchParams.get('search');
  if (search) query.search = search;

  const pageStr = searchParams.get('page');
  if (pageStr) query.page = parseInt(pageStr, 10);
  const pageSizeStr = searchParams.get('pageSize');
  if (pageSizeStr) query.pageSize = parseInt(pageSizeStr, 10);

  const result = await listTransactions(query);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await createTransaction(body);

  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
