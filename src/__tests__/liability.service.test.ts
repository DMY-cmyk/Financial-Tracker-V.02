import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  listLiabilities,
  createLiability,
  updateLiability,
  deleteLiability,
} from '@/server/services/liability.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('createLiability', () => {
  it('creates a liability with valid data', async () => {
    const result = await createLiability({ name: 'KPR BCA', amount: 450_000_000, category: 'loan' });
    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBeDefined();
    expect(result.data?.name).toBe('KPR BCA');
    expect(result.data?.amount).toBe(450_000_000);
    expect(result.data?.category).toBe('loan');
  });

  it('defaults category to "other" when omitted', async () => {
    const result = await createLiability({ name: 'Misc', amount: 500_000 });
    expect(result.data?.category).toBe('other');
  });

  it('returns VALIDATION_ERROR for empty name', async () => {
    const result = await createLiability({ name: '', amount: 100_000, category: 'other' });
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for negative amount', async () => {
    const result = await createLiability({ name: 'Bad', amount: -100, category: 'other' });
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });
});

describe('listLiabilities', () => {
  it('returns empty array when no liabilities exist', async () => {
    const result = await listLiabilities();
    expect(result.data).toEqual([]);
  });

  it('returns liabilities sorted by amount DESC', async () => {
    await createLiability({ name: 'Small', amount: 1_000, category: 'other' });
    await createLiability({ name: 'Large', amount: 5_000_000, category: 'loan' });
    await createLiability({ name: 'Medium', amount: 100_000, category: 'credit_card' });

    const result = await listLiabilities();
    expect(result.data).toHaveLength(3);
    expect(result.data![0].name).toBe('Large');
    expect(result.data![1].name).toBe('Medium');
    expect(result.data![2].name).toBe('Small');
  });
});

describe('updateLiability', () => {
  it('updates name and amount, leaves category unchanged', async () => {
    const created = await createLiability({ name: 'Old', amount: 100_000, category: 'other' });
    const result = await updateLiability(created.data!.id, { name: 'New', amount: 200_000 });
    expect(result.data?.name).toBe('New');
    expect(result.data?.amount).toBe(200_000);
    expect(result.data?.category).toBe('other');
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await updateLiability('nonexistent', { name: 'X' });
    expect(result.error?.code).toBe('NOT_FOUND');
  });
});

describe('deleteLiability', () => {
  it('deletes the liability and returns success', async () => {
    const created = await createLiability({ name: 'ToDelete', amount: 50_000, category: 'other' });
    const del = await deleteLiability(created.data!.id);
    expect(del.data?.success).toBe(true);
    const list = await listLiabilities();
    expect(list.data).toHaveLength(0);
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await deleteLiability('nonexistent');
    expect(result.error?.code).toBe('NOT_FOUND');
  });
});
