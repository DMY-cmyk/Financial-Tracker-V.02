import ExcelJS from 'exceljs';
import type { BulkImportRow, BulkImportResult } from './types';

const MAX_DATA_ROWS = 500;

type CellValue = string | number | boolean | Date | null | undefined;
type SheetRow = CellValue[];

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

function parseDate(value: CellValue): string | null {
  if (value == null || value === '') return null;

  // Excel serial date number (days since 1899-12-30; 25569 = 1970-01-01 UTC)
  if (typeof value === 'number') {
    if (!isFinite(value) || value <= 0) return null;
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    const y = String(d.getUTCFullYear()).padStart(4, '0');
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const y = String(value.getFullYear()).padStart(4, '0');
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(value).trim();
  if (!str) return null;

  // ISO format YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) {
      return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // DD/MM/YYYY or D/M/YYYY
  const slashMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) {
      return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // "1 Mar 2026" style
  const monthNames: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
    // Indonesian month abbreviations
    mei: 5,
    agt: 8,
    okt: 10,
    des: 12,
  };
  const textMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (textMatch) {
    const [, d, monthStr, y] = textMatch;
    const monthNum = monthNames[monthStr.toLowerCase().slice(0, 3)];
    if (monthNum) {
      const date = new Date(Number(y), monthNum - 1, Number(d));
      if (!isNaN(date.getTime())) {
        return `${y.padStart(4, '0')}-${String(monthNum).padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Amount parsing
// ---------------------------------------------------------------------------

function parseAmount(value: CellValue): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Math.abs(value);

  let str = String(value).trim();

  // Strip Rp prefix (with or without space)
  str = str.replace(/^Rp\s*/i, '');

  // Detect Indonesian format: dots as thousand separators, comma as decimal
  // e.g. 5.000.000,00 or 5.000.000
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  // Detect western format with commas as thousand separators: 5,000,000.00
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
    str = str.replace(/,/g, '');
  }
  // Simple comma decimal: 5000000,50
  else if (/^\d+,\d+$/.test(str)) {
    str = str.replace(',', '.');
  }

  // Remove any remaining non-numeric chars except decimal point
  str = str.replace(/[^0-9.]/g, '');

  const num = parseFloat(str);
  if (isNaN(num)) return 0;

  // Return integer (strip decimals — IDR doesn't use subunits)
  return Math.abs(Math.round(num));
}

// ---------------------------------------------------------------------------
// Header detection helpers
// ---------------------------------------------------------------------------

function normalizeHeader(val: CellValue): string {
  if (val == null) return '';
  return String(val).trim().toLowerCase();
}

interface SectionColumns {
  tanggal: number;
  jumlah: number;
  kategori: number;
  methodOrAccount: number;
  notes: number; // -1 if not present
}

function findSections(headerRow: SheetRow): {
  income: SectionColumns | null;
  expense: SectionColumns | null;
} {
  const headers = headerRow.map(normalizeHeader);

  // Find all Tanggal columns – first is income, second is expense
  const tanggalIndices: number[] = [];
  headers.forEach((h, i) => {
    if (h === 'tanggal') tanggalIndices.push(i);
  });

  let income: SectionColumns | null = null;
  let expense: SectionColumns | null = null;

  if (tanggalIndices.length >= 1) {
    const start = tanggalIndices[0];
    // Income section: Tanggal, Jumlah, Kategori, Method (consecutive or nearby)
    const jumlahIdx = headers.indexOf('jumlah', start);
    const kategoriIdx = headers.indexOf('kategori', start);
    const methodIdx = findColumnAfter(headers, start, ['method']);

    if (jumlahIdx !== -1 && kategoriIdx !== -1 && methodIdx !== -1) {
      income = {
        tanggal: start,
        jumlah: jumlahIdx,
        kategori: kategoriIdx,
        methodOrAccount: methodIdx,
        notes: -1,
      };
    }
  }

  if (tanggalIndices.length >= 2) {
    const start = tanggalIndices[1];
    const jumlahIdx = headers.indexOf('jumlah', start);
    const kategoriIdx = headers.indexOf('kategori', start);
    const accountIdx = findColumnAfter(headers, start, ['account']);
    const notesIdx = findColumnAfter(headers, start, ['notes']);

    if (jumlahIdx !== -1 && kategoriIdx !== -1 && accountIdx !== -1) {
      expense = {
        tanggal: start,
        jumlah: jumlahIdx,
        kategori: kategoriIdx,
        methodOrAccount: accountIdx,
        notes: notesIdx,
      };
    }
  }

  return { income, expense };
}

function findColumnAfter(headers: string[], afterIndex: number, names: string[]): number {
  for (let i = afterIndex; i < headers.length; i++) {
    if (names.includes(headers[i])) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Row validation
// ---------------------------------------------------------------------------

function validateRow(row: BulkImportRow): BulkImportRow {
  const errors: string[] = [];

  if (!row.date) {
    errors.push('Invalid or missing date');
  }

  if (!row.amount || row.amount <= 0) {
    errors.push('Amount must be a positive number');
  }

  if (!row.category || row.category.trim() === '') {
    errors.push('Category is required');
  }

  return {
    ...row,
    isValid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Empty result helper
// ---------------------------------------------------------------------------

function emptyResult(errorMessage?: string): BulkImportResult {
  const result: BulkImportResult = {
    rows: [],
    validCount: 0,
    invalidCount: 0,
    totalIncome: 0,
    totalExpense: 0,
  };

  if (errorMessage) {
    result.rows = [
      {
        rowIndex: 0,
        date: '',
        amount: 0,
        category: '',
        type: 'expense',
        paymentMethod: '',
        description: '',
        notes: '',
        isValid: false,
        errors: [errorMessage],
      },
    ];
    result.invalidCount = 1;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Core parser
// ---------------------------------------------------------------------------

export function parseSheetRows(data: SheetRow[]): BulkImportResult {
  if (data.length === 0) {
    return emptyResult();
  }

  // Find header row (contains "Tanggal" and "Jumlah")
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    const normalized = row.map(normalizeHeader);
    if (normalized.includes('tanggal') && normalized.includes('jumlah')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    return emptyResult('Could not find header row. Expected columns: Tanggal, Jumlah, Kategori');
  }

  const headerRow = data[headerRowIndex];
  const { income, expense } = findSections(headerRow);

  if (!income && !expense) {
    return emptyResult('Could not detect income or expense sections in the header row');
  }

  const dataStartRow = headerRowIndex + 1;
  const dataRows = data.slice(dataStartRow);

  if (dataRows.length > MAX_DATA_ROWS) {
    return emptyResult(
      `Too many data rows (${dataRows.length}). Maximum allowed is ${MAX_DATA_ROWS}.`
    );
  }

  const rows: BulkImportRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.every((c) => c == null || String(c).trim() === '')) continue;

    const excelRowIndex = dataStartRow + i + 1; // 1-based for user display

    // Parse income section
    if (income) {
      const tanggal = row[income.tanggal];
      const jumlah = row[income.jumlah];

      if (
        tanggal != null &&
        String(tanggal).trim() !== '' &&
        jumlah != null &&
        String(jumlah).trim() !== ''
      ) {
        const kategori = row[income.kategori];
        const method = row[income.methodOrAccount];
        const categoryStr = kategori != null ? String(kategori).trim() : '';
        const parsedDate = parseDate(tanggal);

        const importRow: BulkImportRow = {
          rowIndex: excelRowIndex,
          date: parsedDate || '',
          amount: parseAmount(jumlah),
          category: categoryStr,
          type: 'income',
          paymentMethod:
            method != null && String(method).trim() !== '' ? String(method).trim() : 'Cash',
          description: categoryStr ? `${categoryStr} - Income` : 'Income',
          notes: '',
          isValid: true,
          errors: [],
        };

        rows.push(validateRow(importRow));
      }
    }

    // Parse expense section
    if (expense) {
      const tanggal = row[expense.tanggal];
      const jumlah = row[expense.jumlah];

      if (
        tanggal != null &&
        String(tanggal).trim() !== '' &&
        jumlah != null &&
        String(jumlah).trim() !== ''
      ) {
        const kategori = row[expense.kategori];
        const account = row[expense.methodOrAccount];
        const notes = expense.notes !== -1 ? row[expense.notes] : null;
        const categoryStr = kategori != null ? String(kategori).trim() : '';
        const parsedDate = parseDate(tanggal);

        const importRow: BulkImportRow = {
          rowIndex: excelRowIndex,
          date: parsedDate || '',
          amount: parseAmount(jumlah),
          category: categoryStr,
          type: 'expense',
          paymentMethod:
            account != null && String(account).trim() !== '' ? String(account).trim() : 'Cash',
          description: categoryStr ? `${categoryStr} - Expense` : 'Expense',
          notes: notes != null ? String(notes).trim() : '',
          isValid: true,
          errors: [],
        };

        rows.push(validateRow(importRow));
      }
    }
  }

  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = rows.filter((r) => !r.isValid).length;
  const totalIncome = rows
    .filter((r) => r.isValid && r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = rows
    .filter((r) => r.isValid && r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0);

  return {
    rows,
    validCount,
    invalidCount,
    totalIncome,
    totalExpense,
  };
}

// ---------------------------------------------------------------------------
// File reader entry point
// ---------------------------------------------------------------------------

// exceljs cell values can be rich objects (formula results, rich text,
// hyperlinks). Flatten them to the primitive the parser understands.
function normalizeExcelValue(value: unknown): CellValue {
  if (value == null) return null;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  ) {
    return value;
  }
  if (typeof value === 'object') {
    const obj = value as { result?: unknown; richText?: { text: string }[]; text?: unknown };
    if (obj.richText) return obj.richText.map((r) => r.text).join('');
    if (obj.result !== undefined) return normalizeExcelValue(obj.result);
    if (obj.text !== undefined) return normalizeExcelValue(obj.text);
  }
  return String(value);
}

export async function parseExcelFile(file: File): Promise<BulkImportResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const ws = workbook.worksheets[0];
    if (!ws) {
      return emptyResult('No sheet found in workbook');
    }

    const data: SheetRow[] = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      const values = row.values as unknown[]; // 1-based; index 0 unused
      data.push(values.slice(1).map(normalizeExcelValue));
    });

    return parseSheetRows(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read Excel file';
    return emptyResult(message);
  }
}
