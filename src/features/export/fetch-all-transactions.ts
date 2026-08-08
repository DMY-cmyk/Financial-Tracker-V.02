import type { Transaction } from '@/lib/types';

export type TransactionLister = (params: { page: number; pageSize: number }) => Promise<{
  data?: { transactions: Transaction[]; totalPages: number };
  error?: { message: string };
}>;

// Server caps pageSize at 100; loop pages instead of asking for one huge page.
const PAGE_SIZE = 100;
// Safety cap: 200 pages = 20.000 transaksi.
const MAX_PAGES = 200;

export async function fetchAllTransactions(
  list: TransactionLister
): Promise<{ transactions: Transaction[]; error?: string }> {
  const all: Transaction[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_PAGES) {
    const result = await list({ page, pageSize: PAGE_SIZE });
    if (!result.data) {
      // Gagal di tengah = ekspor TIDAK boleh diam-diam parsial.
      return { transactions: [], error: result.error?.message ?? 'Failed to load transactions' };
    }
    all.push(...result.data.transactions);
    totalPages = result.data.totalPages;
    page += 1;
  }

  return { transactions: all };
}
