import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import {
  listSavingsGoals,
  getSavingsGoal,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from '@/server/services/savings-goal.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

const validGoal = {
  name: 'Emergency Fund',
  targetAmount: 10000000,
  savedAmount: 5000000,
  color: '#3B82F6',
};

describe('createSavingsGoal', () => {
  it('creates a savings goal with valid input', async () => {
    const result = await createSavingsGoal(validGoal);
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBeDefined();
    expect(result.data!.name).toBe('Emergency Fund');
    expect(result.data!.savedAmount).toBe(5000000);
  });

  it('defaults savedAmount to 0 when not provided', async () => {
    const result = await createSavingsGoal({
      name: validGoal.name,
      targetAmount: validGoal.targetAmount,
      color: validGoal.color,
    });
    expect(result.data!.savedAmount).toBe(0);
  });

  it('returns VALIDATION_ERROR for empty name', async () => {
    const result = await createSavingsGoal({ ...validGoal, name: '' });
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for zero targetAmount', async () => {
    const result = await createSavingsGoal({ ...validGoal, targetAmount: 0 });
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for negative savedAmount', async () => {
    const result = await createSavingsGoal({ ...validGoal, savedAmount: -1 });
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for missing required fields', async () => {
    const result = await createSavingsGoal({});
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('listSavingsGoals', () => {
  it('returns empty array when no goals exist', async () => {
    const result = await listSavingsGoals();
    expect(result.data).toEqual([]);
  });

  it('returns all savings goals', async () => {
    await createSavingsGoal(validGoal);
    await createSavingsGoal({ ...validGoal, name: 'Vacation' });
    const result = await listSavingsGoals();
    expect(result.data!.length).toBe(2);
  });
});

describe('getSavingsGoal', () => {
  it('returns the goal by id', async () => {
    const { data: created } = await createSavingsGoal(validGoal);
    const result = await getSavingsGoal(created!.id);
    expect(result.error).toBeUndefined();
    expect(result.data!.name).toBe('Emergency Fund');
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await getSavingsGoal('nonexistent');
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});

describe('updateSavingsGoal', () => {
  it('updates only the provided fields', async () => {
    const { data: created } = await createSavingsGoal(validGoal);
    const result = await updateSavingsGoal(created!.id, { name: 'Big Emergency Fund' });
    expect(result.error).toBeUndefined();
    expect(result.data!.name).toBe('Big Emergency Fund');
  });

  it('preserves savedAmount when only name is updated', async () => {
    const { data: created } = await createSavingsGoal(validGoal);
    const result = await updateSavingsGoal(created!.id, { name: 'Renamed' });
    // BUG: updateSavingsGoalSchema inherits default(0) from createSavingsGoalSchema
    // causing savedAmount to be reset to 0 when not explicitly provided
    expect(result.data!.savedAmount).toBe(5000000);
  });

  it('preserves targetAmount when only savedAmount is updated', async () => {
    const { data: created } = await createSavingsGoal(validGoal);
    const result = await updateSavingsGoal(created!.id, { savedAmount: 7000000 });
    expect(result.data!.targetAmount).toBe(10000000);
    expect(result.data!.savedAmount).toBe(7000000);
  });

  it('preserves color when updating amounts', async () => {
    const { data: created } = await createSavingsGoal(validGoal);
    const result = await updateSavingsGoal(created!.id, { savedAmount: 3000000 });
    expect(result.data!.color).toBe('#3B82F6');
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await updateSavingsGoal('nonexistent', { name: 'X' });
    expect(result.error!.code).toBe('NOT_FOUND');
  });

  it('returns VALIDATION_ERROR for negative savedAmount', async () => {
    const { data: created } = await createSavingsGoal(validGoal);
    const result = await updateSavingsGoal(created!.id, { savedAmount: -100 });
    expect(result.error!.code).toBe('VALIDATION_ERROR');
  });
});

describe('deleteSavingsGoal', () => {
  it('deletes an existing goal', async () => {
    const { data: created } = await createSavingsGoal(validGoal);
    const result = await deleteSavingsGoal(created!.id);
    expect(result.error).toBeUndefined();
    expect(result.data!.success).toBe(true);

    const fetched = await getSavingsGoal(created!.id);
    expect(fetched.error!.code).toBe('NOT_FOUND');
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await deleteSavingsGoal('nonexistent');
    expect(result.error!.code).toBe('NOT_FOUND');
  });
});
