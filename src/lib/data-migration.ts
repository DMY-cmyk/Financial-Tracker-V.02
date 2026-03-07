import { Transaction, Category, Bill, SavingsGoal, PaymentMethod } from './types';
import { nanoid } from 'nanoid';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_PAYMENT_METHODS } from './constants';

interface WorkbookCell {
  raw: string;
  formula: string;
}

interface WorkbookSheet {
  id: string;
  name: string;
  rowCount: number;
  colCount: number;
  cells: Record<string, WorkbookCell>;
}

interface Workbook {
  sheets: WorkbookSheet[];
}

const SHEET_MONTH_MAP: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MEI: 4, JUN: 5,
  JUL: 6, AGU: 7, SEP: 8, OKT: 9, NOV: 10, DES: 11,
};

function getCell(cells: Record<string, WorkbookCell>, row: number, col: number): string {
  const cell = cells[`${row}:${col}`];
  return cell?.raw ?? '';
}

function parseTransactions(sheet: WorkbookSheet, month: number, year: number): Transaction[] {
  const transactions: Transaction[] = [];
  const cells = sheet.cells;

  // Transactions start at row 4 (0-indexed), columns: 0=Date, 1=Desc, 2=Category, 3=Income, 4=Expense, 5=Payment, 6=Notes
  for (let row = 4; row <= 30; row++) {
    const dateRaw = getCell(cells, row, 0);
    const description = getCell(cells, row, 1);
    const category = getCell(cells, row, 2);
    const income = getCell(cells, row, 3);
    const expense = getCell(cells, row, 4);
    const paymentMethod = getCell(cells, row, 5);
    const notes = getCell(cells, row, 6);

    if (!description || !category) continue;
    if (description === 'SUMMARY' || description === 'TOTALS') break;

    const day = parseInt(dateRaw) || 1;
    const amount = parseInt(income) || parseInt(expense) || 0;
    if (amount === 0) continue;

    const type: 'income' | 'expense' = income && parseInt(income) > 0 ? 'income' : 'expense';
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    transactions.push({
      id: nanoid(),
      date: dateStr,
      description,
      category,
      type,
      amount,
      paymentMethod: paymentMethod || 'Cash',
      notes: notes || '',
    });
  }

  return transactions;
}

function parseBills(sheet: WorkbookSheet, month: number, year: number): Bill[] {
  const bills: Bill[] = [];
  const cells = sheet.cells;

  // Bills start after "BILLS CHECKLIST" header, around row 53-59
  for (let row = 54; row <= 65; row++) {
    const name = getCell(cells, row, 0);
    const paid = getCell(cells, row, 1);
    const amount = getCell(cells, row, 2);
    const dueDate = getCell(cells, row, 3);

    if (!name || !amount) continue;

    bills.push({
      id: nanoid(),
      name,
      amount: parseInt(amount) || 0,
      dueDate: parseInt(dueDate) || 1,
      isPaid: paid === 'TRUE',
      month,
      year,
    });
  }

  return bills;
}

function parseSavingsGoals(sheet: WorkbookSheet): SavingsGoal[] {
  const goals: SavingsGoal[] = [];
  const cells = sheet.cells;
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899'];

  for (let row = 49; row <= 55; row++) {
    const name = getCell(cells, row, 0);
    const target = getCell(cells, row, 1);
    const saved = getCell(cells, row, 2);

    if (!name || !target || name === 'Goal') continue;
    if (parseInt(target) === 0) continue;

    goals.push({
      id: nanoid(),
      name,
      targetAmount: parseInt(target) || 0,
      savedAmount: parseInt(saved) || 0,
      color: colors[goals.length % colors.length],
    });
  }

  return goals;
}

export function migrateWorkbook(workbook: Workbook): {
  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  bills: Bill[];
  savingsGoals: SavingsGoal[];
} {
  const allTransactions: Transaction[] = [];
  const allBills: Bill[] = [];
  let savingsGoals: SavingsGoal[] = [];
  const year = 2025;

  for (const sheet of workbook.sheets) {
    const monthIndex = SHEET_MONTH_MAP[sheet.name];
    if (monthIndex === undefined) continue;

    const transactions = parseTransactions(sheet, monthIndex, year);
    allTransactions.push(...transactions);

    const bills = parseBills(sheet, monthIndex, year);
    allBills.push(...bills);

    // Only parse savings from first sheet (they're global)
    if (sheet.name === 'JAN' && savingsGoals.length === 0) {
      savingsGoals = parseSavingsGoals(sheet);
    }
  }

  const categories: Category[] = [
    ...DEFAULT_EXPENSE_CATEGORIES.map(c => ({ ...c, id: nanoid() })),
    ...DEFAULT_INCOME_CATEGORIES.map(c => ({ ...c, id: nanoid() })),
  ];

  const paymentMethods: PaymentMethod[] = DEFAULT_PAYMENT_METHODS.map(p => ({
    ...p,
    id: nanoid(),
  }));

  return {
    transactions: allTransactions,
    categories,
    paymentMethods,
    bills: allBills,
    savingsGoals,
  };
}
