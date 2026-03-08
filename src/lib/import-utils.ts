import { type Transaction } from './types';

export interface ImportResult {
  transactions: Transaction[];
  errors: string[];
  skipped: number;
}

/**
 * Parse and validate a JSON import file containing transactions.
 */
export function parseJsonImport(content: string): ImportResult {
  const errors: string[] = [];
  let skipped = 0;

  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      return {
        transactions: [],
        errors: ['File must contain a JSON array of transactions'],
        skipped: 0,
      };
    }

    const transactions: Transaction[] = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const tx = validateTransactionRow(row, i + 1);
      if (tx) {
        transactions.push(tx);
      } else {
        skipped++;
      }
    }

    if (skipped > 0) {
      errors.push(`${skipped} row(s) skipped due to missing/invalid fields`);
    }

    return { transactions, errors, skipped };
  } catch {
    return { transactions: [], errors: ['Invalid JSON format'], skipped: 0 };
  }
}

/**
 * Parse and validate a CSV import file containing transactions.
 */
export function parseCsvImport(content: string): ImportResult {
  const errors: string[] = [];
  let skipped = 0;

  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    return {
      transactions: [],
      errors: ['CSV must have a header row and at least one data row'],
      skipped: 0,
    };
  }

  const header = lines[0].toLowerCase();
  if (!header.includes('date') || !header.includes('amount')) {
    return { transactions: [], errors: ['CSV must include Date and Amount columns'], skipped: 0 };
  }

  const headers = parseCSVLine(lines[0]);
  const colMap = {
    date: headers.findIndex((h) => h.toLowerCase() === 'date'),
    description: headers.findIndex((h) => h.toLowerCase() === 'description'),
    category: headers.findIndex((h) => h.toLowerCase() === 'category'),
    type: headers.findIndex((h) => h.toLowerCase() === 'type'),
    amount: headers.findIndex((h) => h.toLowerCase() === 'amount'),
    paymentMethod: headers.findIndex((h) => h.toLowerCase().includes('payment')),
    notes: headers.findIndex((h) => h.toLowerCase() === 'notes'),
  };

  const transactions: Transaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i]);

    const date = cols[colMap.date]?.trim() || '';
    const amount = parseInt((cols[colMap.amount] || '0').replace(/[^\d]/g, ''), 10);
    const description = cols[colMap.description]?.trim() || '';
    const type = (cols[colMap.type]?.trim().toLowerCase() === 'income' ? 'income' : 'expense') as
      | 'income'
      | 'expense';

    if (!date || !amount || !description) {
      skipped++;
      continue;
    }

    transactions.push({
      id: `imp_${Date.now()}_${i}`,
      date,
      description,
      category: cols[colMap.category]?.trim() || 'Other',
      type,
      amount,
      paymentMethod: cols[colMap.paymentMethod]?.trim() || 'Cash',
      notes: cols[colMap.notes]?.trim() || '',
    });
  }

  if (skipped > 0) {
    errors.push(`${skipped} row(s) skipped due to missing fields`);
  }

  return { transactions, errors, skipped };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function validateTransactionRow(row: Record<string, unknown>, index: number): Transaction | null {
  if (!row || typeof row !== 'object') return null;
  const date = typeof row.date === 'string' ? row.date : '';
  const description = typeof row.description === 'string' ? row.description : '';
  const amount = typeof row.amount === 'number' ? row.amount : 0;
  const type = row.type === 'income' ? 'income' : 'expense';

  if (!date || !description || !amount) return null;

  return {
    id: typeof row.id === 'string' ? row.id : `imp_${Date.now()}_${index}`,
    date,
    description,
    category: typeof row.category === 'string' ? row.category : 'Other',
    type,
    amount,
    paymentMethod: typeof row.paymentMethod === 'string' ? row.paymentMethod : 'Cash',
    notes: typeof row.notes === 'string' ? row.notes : '',
  };
}

/**
 * Read a File object as text.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
