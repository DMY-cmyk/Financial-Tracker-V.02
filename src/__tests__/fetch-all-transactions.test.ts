import { describe, it, expect } from 'vitest';
import { fetchAllTransactions } from '@/features/export/fetch-all-transactions';
import type { Transaction } from '@/lib/types';

function makeTx(i: number): Transaction {
  return {
    id: `tx-${i}`,
    date: '2026-07-01',
    description: `t${i}`,
    category: 'Food',
    categoryId: '',
    type: 'expense',
    amount: 1000,
    paymentMethod: 'Cash',
    notes: '',
  } as Transaction;
}

describe('fetchAllTransactions', () => {
  it('fetches every page (250 tx across 3 pages of 100)', async () => {
    const all = Array.from({ length: 250 }, (_, i) => makeTx(i));
    const calls: number[] = [];
    const result = await fetchAllTransactions(async ({ page, pageSize }) => {
      calls.push(page);
      const start = (page - 1) * pageSize;
      return {
        data: {
          transactions: all.slice(start, start + pageSize),
          totalPages: Math.ceil(all.length / pageSize),
        },
      };
    });

    expect(result.error).toBeUndefined();
    expect(result.transactions).toHaveLength(250);
    expect(calls).toEqual([1, 2, 3]);
  });

  it('returns an error (not a partial export) when a page fails', async () => {
    const result = await fetchAllTransactions(async ({ page }) => {
      if (page === 2) return { error: { message: 'boom' } };
      return {
        data: { transactions: Array.from({ length: 100 }, (_, i) => makeTx(i)), totalPages: 3 },
      };
    });

    expect(result.error).toBe('boom');
    expect(result.transactions).toHaveLength(0);
  });

  it('handles an empty account (single empty page)', async () => {
    const result = await fetchAllTransactions(async () => ({
      data: { transactions: [], totalPages: 0 },
    }));
    expect(result.error).toBeUndefined();
    expect(result.transactions).toHaveLength(0);
  });

  it('fails closed instead of silently truncating past MAX_PAGES', async () => {
    const result = await fetchAllTransactions(async ({ pageSize }) => ({
      data: {
        transactions: Array.from({ length: pageSize }, (_, i) => makeTx(i)),
        totalPages: 201,
      },
    }));
    expect(result.error).toBeDefined();
    expect(result.transactions).toHaveLength(0);
  });
});
