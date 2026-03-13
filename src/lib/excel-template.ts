import * as XLSX from 'xlsx';
import type { Category, PaymentMethod } from './types';

const TEMPLATE_ROWS = 50;

// ---------------------------------------------------------------------------
// Column width helper
// ---------------------------------------------------------------------------

function colWidth(chars: number): { wch: number } {
  return { wch: chars };
}

// ---------------------------------------------------------------------------
// Template generator
// ---------------------------------------------------------------------------

export function generateBulkTemplate(
  categories: Category[],
  paymentMethods: PaymentMethod[]
): void {
  const wb = XLSX.utils.book_new();

  // =========================================================================
  // Main "Bulk Import" sheet
  // =========================================================================
  const sheetData: (string | number | null)[][] = [];

  // Row 0 – section titles
  sheetData.push([
    'No', null, 'P E M A S U K A N', null, null, null,
    null, 'P E N G E L U A R A N', null, null, null, null,
  ]);

  // Row 1 – column headers
  sheetData.push([
    'No', null, 'Tanggal', 'Jumlah', 'Kategori', 'Method',
    null, 'Tanggal', 'Jumlah', 'Kategori', 'account', 'Notes',
  ]);

  // Rows 2-51 – pre-numbered data rows
  for (let i = 1; i <= TEMPLATE_ROWS; i++) {
    sheetData.push([i, null, null, null, null, null, null, null, null, null, null, null]);
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Merges
  ws['!merges'] = [
    // C1:F1 — income title
    { s: { r: 0, c: 2 }, e: { r: 0, c: 5 } },
    // H1:L1 — expense title
    { s: { r: 0, c: 7 }, e: { r: 0, c: 11 } },
  ];

  // Column widths
  ws['!cols'] = [
    colWidth(5),  // A: No
    colWidth(3),  // B: spacer
    colWidth(15), // C: Tanggal
    colWidth(18), // D: Jumlah
    colWidth(18), // E: Kategori
    colWidth(18), // F: Method
    colWidth(3),  // G: separator
    colWidth(15), // H: Tanggal
    colWidth(18), // I: Jumlah
    colWidth(18), // J: Kategori
    colWidth(18), // K: account
    colWidth(25), // L: Notes
  ];

  // Style section title cells as bold via cell comments (xlsx doesn't support
  // full styling without the pro version, but we can set basic formatting)
  const titleCells = ['A1', 'C1', 'H1'];
  titleCells.forEach((ref) => {
    const cell = ws[ref];
    if (cell) {
      cell.s = { font: { bold: true, sz: 13 } };
    }
  });

  const headerCells = ['A2', 'C2', 'D2', 'E2', 'F2', 'H2', 'I2', 'J2', 'K2', 'L2'];
  headerCells.forEach((ref) => {
    const cell = ws[ref];
    if (cell) {
      cell.s = { font: { bold: true } };
    }
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Bulk Import');

  // =========================================================================
  // "Help" sheet
  // =========================================================================
  const helpData: (string | null)[][] = [];

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  helpData.push(['Bulk Import — Help & Reference']);
  helpData.push([null]);

  // Income categories
  helpData.push(['INCOME CATEGORIES']);
  if (incomeCategories.length > 0) {
    incomeCategories.forEach((c) => helpData.push([`  • ${c.name}`]));
  } else {
    helpData.push(['  (no income categories defined)']);
  }
  helpData.push([null]);

  // Expense categories
  helpData.push(['EXPENSE CATEGORIES']);
  if (expenseCategories.length > 0) {
    expenseCategories.forEach((c) => helpData.push([`  • ${c.name}`]));
  } else {
    helpData.push(['  (no expense categories defined)']);
  }
  helpData.push([null]);

  // Payment methods
  helpData.push(['PAYMENT METHODS']);
  if (paymentMethods.length > 0) {
    paymentMethods.forEach((pm) =>
      helpData.push([`  • ${pm.name} (${pm.type})`])
    );
  } else {
    helpData.push(['  (no payment methods defined)']);
  }
  helpData.push([null]);

  // Date format instructions
  helpData.push(['DATE FORMAT']);
  helpData.push(['  Accepted formats:']);
  helpData.push(['  • DD/MM/YYYY  (e.g. 15/03/2026)']);
  helpData.push(['  • D/M/YYYY    (e.g. 5/3/2026)']);
  helpData.push(['  • YYYY-MM-DD  (e.g. 2026-03-15)']);
  helpData.push(['  • 1 Mar 2026']);
  helpData.push([null]);

  // Amount format instructions
  helpData.push(['AMOUNT FORMAT']);
  helpData.push(['  Enter amounts in Indonesian Rupiah (IDR). Examples:']);
  helpData.push(['  • 5000000']);
  helpData.push(['  • 5.000.000   (dots as thousand separators)']);
  helpData.push(['  • Rp 5.000.000']);
  helpData.push(['  • 5,000,000   (commas as thousand separators)']);
  helpData.push([null]);

  // General instructions
  helpData.push(['GENERAL INSTRUCTIONS']);
  helpData.push(['  1. Fill in the "Bulk Import" sheet with your transactions.']);
  helpData.push(['  2. The left section (columns C-F) is for INCOME entries.']);
  helpData.push(['  3. The right section (columns H-L) is for EXPENSE entries.']);
  helpData.push(['  4. Each row can have an income entry, an expense entry, or both.']);
  helpData.push(['  5. Maximum 500 data rows per upload.']);
  helpData.push(['  6. Do not modify the header rows (rows 1-2).']);

  const helpWs = XLSX.utils.aoa_to_sheet(helpData);

  helpWs['!cols'] = [colWidth(60)];

  // Style the title
  const titleCell = helpWs['A1'];
  if (titleCell) {
    titleCell.s = { font: { bold: true, sz: 14 } };
  }

  XLSX.utils.book_append_sheet(wb, helpWs, 'Help');

  // =========================================================================
  // Trigger download
  // =========================================================================
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'Financial Tracker Bulk Upload Template.xlsx';
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
