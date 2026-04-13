import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/server/db/client';
import { resetSeeded, markSeeded } from '@/server/db/seed';
import { createTransaction } from '@/server/services/transaction.service';
import { getSpendingInsights } from '@/server/services/insights.service';

beforeEach(async () => {
  await resetDb();
  resetSeeded();
  markSeeded();
});

async function createExpense(
  month: number,
  year: number,
  day: number,
  amount: number,
  category = 'Food',
  categoryId = 'cat-food'
) {
  const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  await createTransaction({
    date,
    description: `Expense ${date}`,
    category,
    categoryId,
    type: 'expense',
    amount,
    paymentMethod: 'Cash',
    notes: '',
  });
}

async function createIncome(month: number, year: number, day: number, amount: number) {
  const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  await createTransaction({
    date,
    description: `Income ${date}`,
    category: 'Salary',
    categoryId: 'cat-salary',
    type: 'income',
    amount,
    paymentMethod: 'Bank',
    notes: '',
  });
}

describe('getSpendingInsights', () => {
  describe('healthScore', () => {
    it('computes savingsRate = 0 when income is 0', async () => {
      await createExpense(2, 2026, 5, 500000);
      const result = await getSpendingInsights(2, 2026);
      expect(result.error).toBeUndefined();
      expect(result.data!.healthScore.savingsRate).toBe(0);
      expect(result.data!.healthScore.income).toBe(0);
      expect(result.data!.healthScore.expense).toBe(500000);
    });

    it('returns lastMonthRate as null when no prior month data', async () => {
      await createIncome(2, 2026, 1, 5000000);
      await createExpense(2, 2026, 5, 3000000);
      const result = await getSpendingInsights(2, 2026);
      expect(result.data!.healthScore.savingsRate).toBe(40);
      expect(result.data!.healthScore.lastMonthRate).toBeNull();
      expect(result.data!.healthScore.rateChange).toBeNull();
    });

    it('computes rateChange when prior month has data', async () => {
      // February (month=1): income 10M, expense 5M -> savings rate 50%
      await createIncome(1, 2026, 1, 10000000);
      await createExpense(1, 2026, 10, 5000000);
      // March (month=2): income 10M, expense 7M -> savings rate 30%
      await createIncome(2, 2026, 1, 10000000);
      await createExpense(2, 2026, 10, 7000000);

      const result = await getSpendingInsights(2, 2026);
      expect(result.data!.healthScore.savingsRate).toBe(30);
      expect(result.data!.healthScore.lastMonthRate).toBe(50);
      expect(result.data!.healthScore.rateChange).toBe(-20);
    });

    it('handles January (month=0) by looking at December of previous year', async () => {
      // December 2025 (month=11): income 8M, expense 4M -> savings rate 50%
      await createIncome(11, 2025, 15, 8000000);
      await createExpense(11, 2025, 20, 4000000);
      // January 2026 (month=0): income 8M, expense 6M -> savings rate 25%
      await createIncome(0, 2026, 5, 8000000);
      await createExpense(0, 2026, 10, 6000000);

      const result = await getSpendingInsights(0, 2026);
      expect(result.data!.healthScore.savingsRate).toBe(25);
      expect(result.data!.healthScore.lastMonthRate).toBe(50);
      expect(result.data!.healthScore.rateChange).toBe(-25);
    });

    it('returns savingsRate = 0 when last month income was also 0', async () => {
      // February: only expense, no income
      await createExpense(1, 2026, 5, 200000);
      // March: only expense, no income
      await createExpense(2, 2026, 5, 300000);

      const result = await getSpendingInsights(2, 2026);
      expect(result.data!.healthScore.savingsRate).toBe(0);
      expect(result.data!.healthScore.lastMonthRate).toBe(0);
      expect(result.data!.healthScore.rateChange).toBe(0);
    });

    it('returns empty defaults for other sections', async () => {
      await createIncome(2, 2026, 1, 5000000);
      const result = await getSpendingInsights(2, 2026);
      expect(result.data!.categoryComparison).toEqual([]);
      expect(result.data!.biggestTransactions).toEqual([]);
      expect(result.data!.outliers).toEqual([]);
      expect(result.data!.dayOfWeekPattern).toHaveLength(7);
      expect(result.data!.period).toEqual({ month: 2, year: 2026 });
    });

    it('dayOfWeekPattern has 7 items with zero defaults', async () => {
      const result = await getSpendingInsights(2, 2026);
      expect(result.data!.dayOfWeekPattern).toHaveLength(7);
      for (let i = 0; i < 7; i++) {
        expect(result.data!.dayOfWeekPattern[i]).toEqual({
          dayIndex: i,
          totalAmount: 0,
          count: 0,
          avgAmount: 0,
        });
      }
    });
  });

  describe('categoryComparison', () => {
    it('returns correct thisMonth/lastMonth totals with changePct', async () => {
      await createExpense(0, 2026, 5, 500000, 'Food', 'cat-food'); // Jan (last month)
      await createExpense(1, 2026, 5, 700000, 'Food', 'cat-food'); // Feb (this month)
      const result = await getSpendingInsights(1, 2026);
      const food = result.data!.categoryComparison.find((c) => c.categoryId === 'cat-food');
      expect(food).toBeDefined();
      expect(food!.thisMonth).toBe(700000);
      expect(food!.lastMonth).toBe(500000);
      expect(food!.changePct).toBe(40);
      expect(food!.changeDelta).toBe(200000);
    });

    it('returns changePct as null when lastMonth is 0', async () => {
      await createExpense(1, 2026, 5, 300000, 'Shopping', 'cat-shop');
      const result = await getSpendingInsights(1, 2026);
      const shop = result.data!.categoryComparison.find((c) => c.categoryId === 'cat-shop');
      expect(shop!.changePct).toBeNull();
    });

    it('limits to 8 categories and buckets rest as Other', async () => {
      for (let i = 0; i < 10; i++) {
        await createExpense(1, 2026, 5, (10 - i) * 100000, `Cat${i}`, `cat-${i}`);
      }
      const result = await getSpendingInsights(1, 2026);
      expect(result.data!.categoryComparison.length).toBeLessThanOrEqual(8);
    });
  });
});
