import { ensureSeeded } from '@/server/db/seed';
import { getDb } from '@/server/db/client';
import { listPaymentMethodBalances } from '@/server/services/balance.service';
import { createNetWorthRepository } from '@/server/repositories/net-worth.repository';
import type { NetWorthCurrent, NetWorthSnapshot } from '@/lib/types';

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string };
}

export async function getCurrentNetWorth(): Promise<ServiceResult<NetWorthCurrent>> {
  await ensureSeeded();

  const balancesResult = await listPaymentMethodBalances();
  if (balancesResult.error) return { error: balancesResult.error };
  const paymentMethodTotal = (balancesResult.data ?? []).reduce(
    (sum, b) => sum + b.balance,
    0
  );

  const db = await getDb();

  const savingsRow = await db.query<{ total: number }>(
    'SELECT COALESCE(SUM(saved_amount), 0) AS total FROM savings_goals'
  );
  const savingsTotal = Number(savingsRow.rows[0]?.total ?? 0);

  const liabRow = await db.query<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM liabilities'
  );
  const liabTotal = Number(liabRow.rows[0]?.total ?? 0);

  const totalAssets = paymentMethodTotal + savingsTotal;

  return {
    data: {
      totalAssets,
      totalLiabilities: liabTotal,
      netWorth: totalAssets - liabTotal,
      breakdown: {
        paymentMethodBalances: paymentMethodTotal,
        savingsGoals: savingsTotal,
      },
    },
  };
}

export async function recordSnapshot(): Promise<ServiceResult<NetWorthSnapshot>> {
  await ensureSeeded();
  const currentResult = await getCurrentNetWorth();
  if (currentResult.error) return { error: currentResult.error };
  const current = currentResult.data!;

  const now = new Date();
  const repo = createNetWorthRepository();

  const snapshot = await repo.upsert({
    month: now.getMonth(),
    year: now.getFullYear(),
    totalAssets: current.totalAssets,
    totalLiabilities: current.totalLiabilities,
    netWorth: current.netWorth,
    snapshotData: JSON.stringify({
      paymentMethodBalances: current.breakdown.paymentMethodBalances,
      savingsGoals: current.breakdown.savingsGoals,
      liabilities: current.totalLiabilities,
    }),
  });

  return { data: snapshot };
}

export async function getNetWorthHistory(): Promise<ServiceResult<NetWorthSnapshot[]>> {
  await ensureSeeded();
  const repo = createNetWorthRepository();
  return { data: await repo.getHistory(12) };
}
