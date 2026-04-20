import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, getDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import type { TransactionSplit, TransactionSplitInput } from '@/lib/types';
import { createTransactionSplitRepository } from '@/server/repositories/transaction-split.repository';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('TransactionSplit types', () => {
  it('TransactionSplitInput can be constructed', () => {
    const input: TransactionSplitInput = {
      categoryId: 'cat-food',
      category: 'Food',
      amount: 200000,
    };
    expect(input.amount).toBe(200000);
    expect(input.description).toBeUndefined();
  });

  it('TransactionSplit has all required fields', () => {
    const split: TransactionSplit = {
      id: 'split-1',
      transactionId: 'tx-1',
      categoryId: 'cat-food',
      category: 'Food',
      amount: 200000,
      description: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(split.id).toBe('split-1');
  });
});

async function insertParentTx(db: Awaited<ReturnType<typeof getDb>>, id: string) {
  await db.query(
    'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, is_split) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, '2026-01-15', 'Test', '', '', 'expense', 500000, 'Cash', '', 1]
  );
}

describe('createTransactionSplitRepository', () => {
  it('createSplits inserts lines and getSplitsByTransactionId retrieves them', async () => {
    const db = await getDb();
    const repo = createTransactionSplitRepository();
    await insertParentTx(db, 'tx-1');

    const inputs: TransactionSplitInput[] = [
      { categoryId: 'cat-food', category: 'Food', amount: 200000, description: 'Groceries' },
      { categoryId: 'cat-home', category: 'Household', amount: 300000, description: null },
    ];
    await repo.createSplits('tx-1', inputs);

    const splits = await repo.getSplitsByTransactionId('tx-1');
    expect(splits).toHaveLength(2);
    expect(splits[0].category).toBe('Food');
    expect(splits[0].amount).toBe(200000);
    expect(splits[1].category).toBe('Household');
    expect(splits[1].transactionId).toBe('tx-1');
  });

  it('deleteSplits removes all lines for a transaction', async () => {
    const db = await getDb();
    const repo = createTransactionSplitRepository();
    await insertParentTx(db, 'tx-2');

    await repo.createSplits('tx-2', [
      { categoryId: 'cat-a', category: 'A', amount: 100000 },
      { categoryId: 'cat-b', category: 'B', amount: 200000 },
    ]);
    await repo.deleteSplits('tx-2');

    const splits = await repo.getSplitsByTransactionId('tx-2');
    expect(splits).toHaveLength(0);
  });

  it('getSplitsForTransactions returns a Map keyed by transactionId', async () => {
    const db = await getDb();
    const repo = createTransactionSplitRepository();
    await insertParentTx(db, 'tx-3');
    await insertParentTx(db, 'tx-4');

    await repo.createSplits('tx-3', [
      { categoryId: 'cat-a', category: 'A', amount: 50000 },
      { categoryId: 'cat-b', category: 'B', amount: 50000 },
    ]);
    await repo.createSplits('tx-4', [
      { categoryId: 'cat-c', category: 'C', amount: 75000 },
      { categoryId: 'cat-d', category: 'D', amount: 25000 },
    ]);

    const map = await repo.getSplitsForTransactions(['tx-3', 'tx-4']);
    expect(map.get('tx-3')).toHaveLength(2);
    expect(map.get('tx-4')).toHaveLength(2);
    expect(map.get('tx-3')![0].category).toBe('A');
  });

  it('getSplitsForTransactions returns empty Map for empty input', async () => {
    const repo = createTransactionSplitRepository();
    const map = await repo.getSplitsForTransactions([]);
    expect(map.size).toBe(0);
  });

  it('countByCategory returns number of splits using a category', async () => {
    const db = await getDb();
    const repo = createTransactionSplitRepository();
    await insertParentTx(db, 'tx-5');

    await repo.createSplits('tx-5', [
      { categoryId: 'cat-food', category: 'Food', amount: 200000 },
      { categoryId: 'cat-home', category: 'Household', amount: 300000 },
    ]);

    expect(await repo.countByCategory('cat-food')).toBe(1);
    expect(await repo.countByCategory('cat-home')).toBe(1);
    expect(await repo.countByCategory('cat-other')).toBe(0);
  });
});
