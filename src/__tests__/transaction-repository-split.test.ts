import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, getDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { createTransactionRepository } from '@/server/repositories/transaction.repository';
import { createTransactionSplitRepository } from '@/server/repositories/transaction-split.repository';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('transaction repository split enrichment', () => {
  it('findAll populates splits on isSplit=true rows only', async () => {
    const txRepo = createTransactionRepository();
    const splitRepo = createTransactionSplitRepository();
    const db = await getDb();

    // Create a regular transaction
    const regular = await txRepo.create({
      date: '2026-01-10',
      description: 'Regular',
      category: 'Food',
      categoryId: 'cat-food',
      type: 'expense',
      amount: 50000,
      paymentMethod: 'Cash',
      notes: '',
      isSplit: false,
    });

    // Insert a split transaction directly via DB
    const splitTxId = 'tx-split-enrichment';
    await db.query(
      'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, is_split) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [splitTxId, '2026-01-12', 'Supermarket', '', '', 'expense', 500000, 'BCA', '', 1]
    );
    await splitRepo.createSplits(splitTxId, [
      { categoryId: 'cat-food', category: 'Food', amount: 200000 },
      { categoryId: 'cat-home', category: 'Household', amount: 300000 },
    ]);

    const all = await txRepo.findAll();
    const splitTx = all.find((t) => t.id === splitTxId);
    const regularTx = all.find((t) => t.id === regular.id);

    expect(splitTx?.isSplit).toBe(true);
    expect(splitTx?.splits).toHaveLength(2);
    expect(regularTx?.isSplit).toBe(false);
    expect(regularTx?.splits).toBeUndefined();
  });

  it('findById populates splits for split transaction', async () => {
    const txRepo = createTransactionRepository();
    const splitRepo = createTransactionSplitRepository();
    const db = await getDb();

    const splitTxId = 'tx-findbyid-split';
    await db.query(
      'INSERT INTO transactions (id, date, description, category, category_id, type, amount, payment_method, notes, is_split) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [splitTxId, '2026-01-15', 'Market', '', '', 'expense', 300000, 'Cash', '', 1]
    );
    await splitRepo.createSplits(splitTxId, [
      { categoryId: 'cat-a', category: 'A', amount: 150000 },
      { categoryId: 'cat-b', category: 'B', amount: 150000 },
    ]);

    const tx = await txRepo.findById(splitTxId);
    expect(tx?.isSplit).toBe(true);
    expect(tx?.splits).toHaveLength(2);
  });
});
