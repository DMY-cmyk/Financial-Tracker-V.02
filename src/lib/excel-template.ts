import ExcelJS from 'exceljs';
import type { Category, PaymentMethod } from './types';

const TEMPLATE_ROWS = 50;
const COLUMN_WIDTHS = [5, 3, 15, 18, 18, 18, 3, 15, 18, 18, 18, 25];

export async function generateBulkTemplate(
  categories: Category[],
  paymentMethods: PaymentMethod[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();

  // =========================================================================
  // Main "Bulk Import" sheet
  // =========================================================================
  const ws = wb.addWorksheet('Bulk Import');
  ws.columns = COLUMN_WIDTHS.map((width) => ({ width }));

  // Row 1 – section titles
  ws.addRow(['No', null, 'P E M A S U K A N', null, null, null, null, 'P E N G E L U A R A N']);
  // Row 2 – column headers
  ws.addRow([
    'No',
    null,
    'Tanggal',
    'Jumlah',
    'Kategori',
    'Method',
    null,
    'Tanggal',
    'Jumlah',
    'Kategori',
    'account',
    'Notes',
  ]);
  // Rows 3-52 – pre-numbered data rows
  for (let i = 1; i <= TEMPLATE_ROWS; i++) {
    ws.addRow([i]);
  }

  ws.mergeCells('C1:F1'); // income title
  ws.mergeCells('H1:L1'); // expense title

  ['A1', 'C1', 'H1'].forEach((ref) => {
    ws.getCell(ref).font = { bold: true, size: 13 };
  });
  ['A2', 'C2', 'D2', 'E2', 'F2', 'H2', 'I2', 'J2', 'K2', 'L2'].forEach((ref) => {
    ws.getCell(ref).font = { bold: true };
  });

  // =========================================================================
  // "Help" sheet
  // =========================================================================
  const helpWs = wb.addWorksheet('Help');
  helpWs.columns = [{ width: 60 }];

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const helpLines: (string | null)[] = [
    'Bulk Import — Help & Reference',
    null,
    'INCOME CATEGORIES',
  ];
  if (incomeCategories.length > 0) {
    incomeCategories.forEach((c) => helpLines.push(`  • ${c.name}`));
  } else {
    helpLines.push('  (no income categories defined)');
  }
  helpLines.push(null, 'EXPENSE CATEGORIES');
  if (expenseCategories.length > 0) {
    expenseCategories.forEach((c) => helpLines.push(`  • ${c.name}`));
  } else {
    helpLines.push('  (no expense categories defined)');
  }
  helpLines.push(null, 'PAYMENT METHODS');
  if (paymentMethods.length > 0) {
    paymentMethods.forEach((pm) => helpLines.push(`  • ${pm.name} (${pm.type})`));
  } else {
    helpLines.push('  (no payment methods defined)');
  }
  helpLines.push(
    null,
    'DATE FORMAT',
    '  Accepted formats:',
    '  • DD/MM/YYYY  (e.g. 15/03/2026)',
    '  • D/M/YYYY    (e.g. 5/3/2026)',
    '  • YYYY-MM-DD  (e.g. 2026-03-15)',
    '  • 1 Mar 2026',
    null,
    'AMOUNT FORMAT',
    '  Enter amounts in Indonesian Rupiah (IDR). Examples:',
    '  • 5000000',
    '  • 5.000.000   (dots as thousand separators)',
    '  • Rp 5.000.000',
    '  • 5,000,000   (commas as thousand separators)',
    null,
    'GENERAL INSTRUCTIONS',
    '  1. Fill in the "Bulk Import" sheet with your transactions.',
    '  2. The left section (columns C-F) is for INCOME entries.',
    '  3. The right section (columns H-L) is for EXPENSE entries.',
    '  4. Each row can have an income entry, an expense entry, or both.',
    '  5. Maximum 500 data rows per upload.',
    '  6. Do not modify the header rows (rows 1-2).'
  );
  helpLines.forEach((line) => helpWs.addRow([line]));
  helpWs.getCell('A1').font = { bold: true, size: 14 };

  // =========================================================================
  // Trigger download
  // =========================================================================
  const wbOut = await wb.xlsx.writeBuffer();
  const blob = new Blob([wbOut], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'Financial Tracker Bulk Upload Template.xlsx';
  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
