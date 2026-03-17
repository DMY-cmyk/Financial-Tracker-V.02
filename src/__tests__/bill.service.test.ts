import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  listBills,
  getBill,
  createBill,
  updateBill,
  deleteBill,
  generateRecurringBills,
} from '@/server/services/bill.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

const validBill = {
  name: 'Internet',
  amount: 300000,
  dueDate: 15,
  isPaid: false,
  isRecurring: true,
  month: 2,
  year: 2026,
};

describe('createBill', () => {
  it('creates a bill with valid input', async () => {
    const result = await createBill(validBill);
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBeDefined();
    expect(result.data!.name).toBe('Internet');
    expect(result.data!.amount).toBe(300000);
  });

  it('creates a bill with defaults for optional fields', async () => {
    const result = await createBill({
      name: validBill.name,
      amount: validBill.amount,
      dueDate: validBill.dueDate,
      month: validBill.month,
      year: validBill.year,
    });
    expect(result.data).toBeDefined();
    expect(result.data!.isPaid).toBe(false);
    expect(result.data!.isRecurring).toBe(false);
  });

  it('returns VALIDATION_ERROR for empty name', async () => {
    const result = await createBill({ ...validBill, name: '' });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for negative amount', async () => {
    const result = await createBill({ ...validBill, amount: -100 });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for invalid dueDate', async () => {
    const result = await createBill({ ...validBill, dueDate: 32 });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for invalid month', async () => {
    const result = await createBill({ ...validBill, month: 12 });
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('listBills', () => {
  beforeEach(async () => {
    await createBill(validBill);
    await createBill({ ...validBill, name: 'Electricity', month: 1 });
  });

  it('returns all bills without filter', async () => {
    const result = await listBills();
    expect(result.error).toBeUndefined();
    expect(result.data!.length).toBe(2);
  });

  it('returns bills filtered by month and year', async () => {
    const result = await listBills({ month: 2, year: 2026 });
    expect(result.data!.length).toBe(1);
    expect(result.data![0].name).toBe('Internet');
  });
});

describe('getBill', () => {
  it('returns the bill by id', async () => {
    const { data: created } = await createBill(validBill);
    const result = await getBill(created!.id);
    expect(result.error).toBeUndefined();
    expect(result.data!.name).toBe('Internet');
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await getBill('nonexistent');
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});

describe('updateBill', () => {
  it('updates only the provided fields', async () => {
    const { data: created } = await createBill({ ...validBill, isPaid: false, isRecurring: true });
    const result = await updateBill(created!.id, { name: 'Updated Internet' });
    expect(result.error).toBeUndefined();
    expect(result.data!.name).toBe('Updated Internet');
    // BUG: isPaid and isRecurring should be preserved, not reset to schema defaults
    expect(result.data!.isPaid).toBe(false);
    expect(result.data!.isRecurring).toBe(true);
  });

  it('preserves isPaid=true when updating only name', async () => {
    const { data: created } = await createBill({ ...validBill, isPaid: true });
    const result = await updateBill(created!.id, { name: 'New Name' });
    expect(result.data!.isPaid).toBe(true);
  });

  it('preserves isRecurring when patching unrelated fields', async () => {
    const { data: created } = await createBill({ ...validBill, isRecurring: true });
    const result = await updateBill(created!.id, { amount: 500000 });
    expect(result.data!.isRecurring).toBe(true);
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await updateBill('nonexistent', { name: 'X' });
    expect(result.error!.code).toBe('NOT_FOUND');
  });

  it('returns VALIDATION_ERROR for invalid amount', async () => {
    const { data: created } = await createBill(validBill);
    const result = await updateBill(created!.id, { amount: -1 });
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('deleteBill', () => {
  it('deletes an existing bill', async () => {
    const { data: created } = await createBill(validBill);
    const result = await deleteBill(created!.id);
    expect(result.error).toBeUndefined();
    expect(result.data!.success).toBe(true);

    const fetched = await getBill(created!.id);
    expect(fetched.error!.code).toBe('NOT_FOUND');
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await deleteBill('nonexistent');
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});

describe('generateRecurringBills', () => {
  it('returns 0 generated when target month already has bills', async () => {
    await createBill(validBill);
    const result = await generateRecurringBills(2, 2026);
    expect(result.data!.generated).toBe(0);
  });

  it('returns 0 generated when no recurring bills exist in previous months', async () => {
    const result = await generateRecurringBills(2, 2026);
    expect(result.data!.generated).toBe(0);
  });

  it('copies recurring bills from previous month into target month', async () => {
    // Create recurring bills in month 1
    await createBill({ ...validBill, month: 1, isRecurring: true });
    await createBill({ ...validBill, name: 'Electricity', month: 1, isRecurring: true });
    await createBill({ ...validBill, name: 'Water', month: 1, isRecurring: false }); // not recurring

    const result = await generateRecurringBills(2, 2026);
    expect(result.data!.generated).toBe(2); // only recurring ones

    const bills = await listBills({ month: 2, year: 2026 });
    expect(bills.data!.length).toBe(2);
    expect(bills.data!.every((b) => b.isPaid === false)).toBe(true);
    expect(bills.data!.every((b) => b.isRecurring === true)).toBe(true);
  });
});
