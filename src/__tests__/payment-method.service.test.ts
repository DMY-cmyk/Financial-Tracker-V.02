import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/sqlite';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from '@/server/services/payment-method.service';

beforeEach(() => {
  resetDb();
  resetSeeded();
  markSeeded();
});

describe('createPaymentMethod', () => {
  const validInput = {
    name: 'Bank BCA',
    icon: 'building',
    type: 'bank' as const,
  };

  it('creates a payment method with valid input', () => {
    const result = createPaymentMethod(validInput);
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBeDefined();
    expect(result.data!.name).toBe('Bank BCA');
    expect(result.data!.type).toBe('bank');
  });

  it('creates with default icon', () => {
    const result = createPaymentMethod({ name: 'Cash', type: 'cash' });
    expect(result.data).toBeDefined();
    expect(result.data!.icon).toBe('wallet');
  });

  it('returns validation error for empty name', () => {
    const result = createPaymentMethod({ ...validInput, name: '' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for invalid type', () => {
    const result = createPaymentMethod({ ...validInput, type: 'crypto' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error for missing fields', () => {
    const result = createPaymentMethod({});
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('listPaymentMethods', () => {
  beforeEach(() => {
    createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    createPaymentMethod({ name: 'Cash', icon: 'wallet', type: 'cash' });
    createPaymentMethod({ name: 'GoPay', icon: 'smartphone', type: 'ewallet' });
  });

  it('returns all payment methods', () => {
    const result = listPaymentMethods();
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(3);
  });
});

describe('updatePaymentMethod', () => {
  it('updates an existing payment method', () => {
    const created = createPaymentMethod({ name: 'Bank BCA', icon: 'building', type: 'bank' });
    const result = updatePaymentMethod(created.data!.id, { name: 'Bank Mandiri' });

    expect(result.error).toBeUndefined();
    expect(result.data!.name).toBe('Bank Mandiri');
    expect(result.data!.type).toBe('bank'); // unchanged
  });

  it('returns NOT_FOUND for nonexistent ID', () => {
    const result = updatePaymentMethod('nonexistent', { name: 'Test' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});

describe('deletePaymentMethod', () => {
  it('deletes an existing payment method', () => {
    const created = createPaymentMethod({ name: 'Cash', icon: 'wallet', type: 'cash' });
    const result = deletePaymentMethod(created.data!.id);
    expect(result.data).toEqual({ success: true });

    const list = listPaymentMethods();
    expect(list.data!.length).toBe(0);
  });

  it('returns NOT_FOUND for nonexistent ID', () => {
    const result = deletePaymentMethod('nonexistent');
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});
