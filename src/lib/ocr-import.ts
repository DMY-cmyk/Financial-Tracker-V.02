import type { Category, BulkImportRow, BulkImportResult } from './types';
import { suggestCategory } from './category-suggest';

// Date patterns: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD
const DATE_PATTERNS = [/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/, /(\d{4})-(\d{1,2})-(\d{1,2})/];

// Amount patterns: optional Rp prefix, digits with optional dots/commas
const AMOUNT_PATTERN = /(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+)/gi;

const INCOME_KEYWORDS = [
  'income',
  'pemasukan',
  'gaji',
  'salary',
  'bonus',
  'transfer masuk',
  'terima',
];

function isYmdFormat(raw: string): boolean {
  return /^\d{4}-/.test(raw.trim());
}

function parseDateToIso(raw: string): string | null {
  const trimmed = raw.trim();

  // Try YYYY-MM-DD first
  const ymdMatch = trimmed.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return formatIso(Number(y), Number(m), Number(d));
  }

  // Try DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = trimmed.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return formatIso(Number(y), Number(m), Number(d));
  }

  return null;
}

function formatIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function parseAmount(raw: string): number {
  // Strip Rp prefix, spaces, and thousand separators (dots or commas used as thousands)
  let cleaned = raw.replace(/Rp\.?\s*/gi, '').trim();

  // Determine decimal vs thousands separator:
  // Indonesian format uses dots for thousands, commas for decimals
  // But for IDR amounts, decimals are rare — treat trailing ,XX or .XX (2 digits) as decimals
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > lastDot && cleaned.length - lastComma === 3) {
    // Comma might be decimal separator (e.g., 1.500,50)
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma && cleaned.length - lastDot === 3) {
    // Dot might be decimal separator (e.g., 1,500.50)
    cleaned = cleaned.replace(/,/g, '').replace('.', '.');
  } else {
    // No clear decimal — strip all non-digits
    cleaned = cleaned.replace(/[^\d]/g, '');
  }

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : Math.abs(amount);
}

function extractAllAmounts(text: string): number[] {
  const amounts: number[] = [];
  const matches = text.match(AMOUNT_PATTERN);
  if (!matches) return amounts;

  for (const m of matches) {
    const val = parseAmount(m);
    if (val > 0) amounts.push(val);
  }
  return amounts;
}

function extractDate(line: string): { date: string; matched: string } | null {
  // Try YYYY-MM-DD first (more specific)
  if (isYmdFormat(line)) {
    const m = line.match(/(\d{4}-\d{1,2}-\d{1,2})/);
    if (m) {
      const iso = parseDateToIso(m[1]);
      if (iso) return { date: iso, matched: m[0] };
    }
  }

  for (const pattern of DATE_PATTERNS) {
    const m = line.match(pattern);
    if (m) {
      const iso = parseDateToIso(m[0]);
      if (iso) return { date: iso, matched: m[0] };
    }
  }
  return null;
}

function detectType(text: string): 'income' | 'expense' {
  const lower = text.toLowerCase();
  for (const keyword of INCOME_KEYWORDS) {
    if (lower.includes(keyword)) return 'income';
  }
  return 'expense';
}

function extractDescription(
  line: string,
  dateMatched: string,
  amountMatches: RegExpMatchArray | null
): string {
  let desc = line;

  // Remove the date portion
  desc = desc.replace(dateMatched, '');

  // Remove all amount-like patterns
  if (amountMatches) {
    for (const m of amountMatches) {
      desc = desc.replace(m, '');
    }
  }

  // Clean up separators and whitespace
  return desc
    .replace(/[|;:\-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateRow(row: BulkImportRow): BulkImportRow {
  const errors: string[] = [];

  // Validate date
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(row.date)) {
    errors.push('Invalid date format');
  } else {
    const d = new Date(row.date);
    if (isNaN(d.getTime())) {
      errors.push('Invalid date');
    }
  }

  // Validate amount
  if (row.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  // Validate description
  if (!row.description.trim()) {
    errors.push('Description is empty');
  }

  return {
    ...row,
    isValid: errors.length === 0,
    errors,
  };
}

function calculateTotals(
  rows: BulkImportRow[]
): Pick<BulkImportResult, 'validCount' | 'invalidCount' | 'totalIncome' | 'totalExpense'> {
  let validCount = 0;
  let invalidCount = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  for (const row of rows) {
    if (row.isValid) {
      validCount++;
      if (row.type === 'income') totalIncome += row.amount;
      else totalExpense += row.amount;
    } else {
      invalidCount++;
    }
  }

  return { validCount, invalidCount, totalIncome, totalExpense };
}

export function parseOcrTextToTransactions(text: string, categories: Category[]): BulkImportResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows: BulkImportRow[] = [];
  let rowIndex = 0;

  for (const line of lines) {
    const dateResult = extractDate(line);
    if (!dateResult) continue;

    const amounts = extractAllAmounts(line);
    if (amounts.length === 0) continue;

    // Take the largest amount when multiple are found
    const amount = Math.max(...amounts);

    const amountMatches = line.match(AMOUNT_PATTERN);
    const description = extractDescription(line, dateResult.matched, amountMatches);
    const type = detectType(line);

    const categorySuggestion = suggestCategory(description || line, categories);
    const category = categorySuggestion?.name ?? '';

    const row: BulkImportRow = {
      rowIndex,
      date: dateResult.date,
      amount,
      category,
      type,
      paymentMethod: 'Cash',
      description: description || 'Transaction',
      notes: '',
      isValid: false,
      errors: [],
    };

    rows.push(validateRow(row));
    rowIndex++;
  }

  const totals = calculateTotals(rows);

  return {
    rows,
    ...totals,
  };
}
