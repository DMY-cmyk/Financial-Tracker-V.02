import { ensureSeeded } from '@/server/db/seed';
import { createRecurringTransactionRepository } from '@/server/repositories/recurring-transaction.repository';
import { createTransactionRepository } from '@/server/repositories/transaction.repository';
import type { ForecastResponse } from '@/lib/api/contracts';
import type { RecurringTransaction } from '@/lib/types';

const recurringRepo = createRecurringTransactionRepository();
const txRepo = createTransactionRepository();

interface ServiceResult<T> {
  data?: T;
  error?: { message: string; code: string };
}

// month is 0-based (0 = January); adds 1 internally for ISO date format
function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function firstDayOfMonth(year: number, month: number): string {
  return formatDateStr(year, month, 1);
}

function lastDayOfMonth(year: number, month: number): string {
  return formatDateStr(year, month, daysInMonth(year, month));
}

export function computeOccurrences(
  tx: RecurringTransaction,
  month: number,
  year: number
): number {
  const firstDay = firstDayOfMonth(year, month);
  const lastDay = lastDayOfMonth(year, month);

  if (tx.startDate > lastDay) return 0;
  if (tx.endDate && tx.endDate < firstDay) return 0;

  switch (tx.frequency) {
    case 'monthly':
      return 1;

    case 'yearly': {
      const txMonth = parseInt(tx.startDate.split('-')[1], 10) - 1;
      return txMonth === month ? 1 : 0;
    }

    case 'weekly': {
      const txDayOfWeek = new Date(tx.nextDueDate + 'T00:00:00Z').getUTCDay();
      const numDays = daysInMonth(year, month);
      let count = 0;
      for (let day = 1; day <= numDays; day++) {
        const dayStr = formatDateStr(year, month, day);
        const d = new Date(Date.UTC(year, month, day));
        if (d.getUTCDay() === txDayOfWeek) {
          if (!tx.endDate || dayStr <= tx.endDate) {
            count++;
          }
        }
      }
      return count;
    }

    case 'daily': {
      const numDays = daysInMonth(year, month);
      if (!tx.endDate || tx.endDate >= lastDay) return numDays;
      if (tx.endDate < firstDay) return 0;
      // Days start at 1, so day-of-month == count of days elapsed since month start
      return parseInt(tx.endDate.split('-')[2], 10);
    }

    default:
      return 0;
  }
}

export async function getForecast(months: number): Promise<ServiceResult<ForecastResponse>> {
  await ensureSeeded();

  // Uses the system clock; forecast months are relative to today.
  // Tests that check array length are unaffected; tests asserting specific
  // month/year values on forecast entries will need a date-override param if added later.
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [activeRecurring, currentMonthTxs] = await Promise.all([
    recurringRepo.findActive(),
    txRepo.findByMonth(currentMonth, currentYear),
  ]);

  const actualIncome = currentMonthTxs
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const actualExpense = currentMonthTxs
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  let currentProjIncome = 0;
  let currentProjExpense = 0;
  for (const tx of activeRecurring) {
    const occ = computeOccurrences(tx, currentMonth, currentYear);
    if (occ === 0) continue;
    const total = occ * tx.amount;
    if (tx.type === 'income') currentProjIncome += total;
    else currentProjExpense += total;
  }

  const currentMonthData = {
    month: currentMonth,
    year: currentYear,
    actualIncome,
    actualExpense,
    projectedIncome: currentProjIncome,
    projectedExpense: currentProjExpense,
    projectedNet:
      actualIncome + currentProjIncome - (actualExpense + currentProjExpense),
  };

  const forecast = [];
  for (let i = 1; i <= months; i++) {
    const forecastDate = new Date(Date.UTC(currentYear, currentMonth + i, 1));
    const fYear = forecastDate.getUTCFullYear();
    const fMonth = forecastDate.getUTCMonth();

    let fIncome = 0;
    let fExpense = 0;
    const recurringItems: ForecastResponse['forecast'][0]['recurringItems'] = [];

    for (const tx of activeRecurring) {
      const occ = computeOccurrences(tx, fMonth, fYear);
      if (occ === 0) continue;
      const total = occ * tx.amount;
      if (tx.type === 'income') fIncome += total;
      else fExpense += total;
      recurringItems.push({
        description: tx.description,
        type: tx.type,
        amount: tx.amount,
        frequency: tx.frequency,
        occurrences: occ,
      });
    }

    forecast.push({
      month: fMonth,
      year: fYear,
      projectedIncome: fIncome,
      projectedExpense: fExpense,
      projectedNet: fIncome - fExpense,
      recurringItems,
    });
  }

  return { data: { currentMonth: currentMonthData, forecast } };
}
