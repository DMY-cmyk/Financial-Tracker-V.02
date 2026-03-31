import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from '@/server/services/payment-method.service';
import { createTransactionRepository } from '@/server/repositories/transaction.repository';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

describe('createPaymentMethod', () => {
  const validInput = {
    name: 'Bank BCA',
    icon: 'building',
    type: 'bank' as const,
  };

  it('creates a payment method with valid input', async () => {
    const result = await createPaymentMethod(validInput);
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBeDefined();
    expect(result.data!.name).toBe('Bank BCA');
    expect(result.data!.type).toBe('bank');
  });

  it('creates with default icon', async () => {
    const result = await createPaymentMethod({ name: 'Cash', type: 'cash' });
    expect(result.data).toBeDefined();
    expect(result.data!.icon).toBe('wallet');
  });

  it('stores beginningBalance when provided', async () => {
    const result = await createPaymentMethod({
      name: 'Bank BCA',
      type: 'bank',
      beginningBalance: 250000,
    });
    expect(result.data).toBeDefined();
    expect(result.data!.beginningBalance).toBe(250000);
    // Verify persistence: re-fetch
    const list = await listPaymentMethods();
    const found = list.data!.find((m) => m.id === result.data!.id);
    expect(found!.beginningBalance).toBe(250000);
  });

  it('defaults beginningBalance to 0 when not provided', async () => {
    const result = await createPaymentMethod({ name: 'Cash', type: 'cash' });
    expect(result.data!.beginningBalance).toBe(0);
  });

  it('returns validation error for empty name', async () => {
    const result = await createPaymentMethod({ ...validInput, name: '' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for invalid type', async () => {
    const result = await createPaymentMethod({ ...validInput, type: 'crypto' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for missing fields', async () => {
    const result = await createPaymentMethod({});
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('listPaymentMethods', () => {
  beforeEach(async () => {
    await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    await createPaymentMethod({ name: 'Cash', icon: 'wallet', type: 'cash' });
    await createPaymentMethod({ name: 'GoPay', icon: 'smartphone', type: 'ewallet' });
  });

  it('returns all payment methods', async () => {
    const result = await listPaymentMethods();
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(3);
  });
});

describe('updatePaymentMethod', () => {
  it('updates an existing payment method', async () => {
    const created = await createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    const result = await updatePaymentMethod(created.data!.id, { name: 'Bank Mandiri' });

    expect(result.error).toBeUndefined();
    expect(result.data!.name).toBe('Bank Mandiri');
    expect(result.data!.type).toBe('bank'); // unchanged
  });

  it('updates beginningBalance', async () => {
    const created = await createPaymentMethod({ name: 'BCA', type: 'bank', beginningBalance: 0 });
    const result = await updatePaymentMethod(created.data!.id, { beginningBalance: 500000 });
    expect(result.data!.beginningBalance).toBe(500000);
  });

  it('leaves beginningBalance unchanged when not in PATCH body', async () => {
    const created = await createPaymentMethod({
      name: 'BCA',
      type: 'bank',
      beginningBalance: 100000,
    });
    await updatePaymentMethod(created.data!.id, { name: 'BCA Savings' });
    const list = await listPaymentMethods();
    const found = list.data!.find((m) => m.id === created.data!.id);
    expect(found!.beginningBalance).toBe(100000);
  });

  it('returns NOT_FOUND for nonexistent ID', async () => {
    const result = await updatePaymentMethod('nonexistent', { name: 'Test' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});

describe('deletePaymentMethod', () => {
  it('deletes an existing payment method', async () => {
    const created = await createPaymentMethod({ name: 'Cash', icon: 'wallet', type: 'cash' });
    const result = await deletePaymentMethod(created.data!.id);
    expect(result.data).toEqual({ success: true });

    const list = await listPaymentMethods();
    expect(list.data!.length).toBe(0);
  });

  it('returns NOT_FOUND for nonexistent ID', async () => {
    const result = await deletePaymentMethod('nonexistent');
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });

  it('blocks deletion when transactions reference the payment method', async () => {
    const pm = await createPaymentMethod({ name: 'Cash', icon: 'wallet', type: 'cash' });
    const txRepo = createTransactionRepository();
    await txRepo.create({
      date: '2026-03-01',
      description: 'Lunch',
      category: 'Food',
      categoryId: 'test-cat-id',
      type: 'expense',
      amount: 50000,
      paymentMethod: 'Cash',
      notes: '',
    });

    const result = await deletePaymentMethod(pm.data!.id);
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('CONFLICT');

    const list = await listPaymentMethods();
    expect(list.data!.length).toBe(1);
  });

  it('allows deletion when no transactions reference the payment method', async () => {
    const pm = await createPaymentMethod({ name: 'Cash', icon: 'wallet', type: 'cash' });

    const result = await deletePaymentMethod(pm.data!.id);
    expect(result.data).toEqual({ success: true });

    const list = await listPaymentMethods();
    expect(list.data!.length).toBe(0);
  });
});
