import { NextRequest, NextResponse } from 'next/server';
import { listTransactions, createTransaction } from '@/server/services/transaction.service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query: Record<string, unknown> = {};

  const monthStr = searchParams.get('month');
  const yearStr = searchParams.get('year');
  const yearOnly = searchParams.get('yearOnly');
  if (monthStr) query.month = parseInt(monthStr, 10);
  if (yearStr) query.year = parseInt(yearStr, 10);
  if (yearOnly === 'true') query.yearOnly = true;

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

  const sortOrder = searchParams.get('sortOrder');
  if (sortOrder === 'asc' || sortOrder === 'desc') query.sortOrder = sortOrder;

  // Advanced filters
  const amountMin = searchParams.get('amountMin');
  if (amountMin) query.amountMin = amountMin;

  const amountMax = searchParams.get('amountMax');
  if (amountMax) query.amountMax = amountMax;

  const categories = searchParams.get('categories');
  if (categories) query.categories = categories;

  const dateFrom = searchParams.get('dateFrom');
  if (dateFrom) query.dateFrom = dateFrom;

  const dateTo = searchParams.get('dateTo');
  if (dateTo) query.dateTo = dateTo;

  const includeNotes = searchParams.get('includeNotes');
  if (includeNotes === 'true') query.includeNotes = true;

  const result = await listTransactions(query);

  if (result.error) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
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
