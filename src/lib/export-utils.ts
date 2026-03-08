import { type Transaction } from './types';
import { formatCurrency } from './formatters';

interface ExportMeta {
  scope: string;
  dateRange: string;
  generatedAt: string;
}

function buildMeta(scopeLabel: string): ExportMeta {
  return {
    scope: scopeLabel,
    dateRange: scopeLabel,
    generatedAt: new Date().toISOString().split('T')[0],
  };
}

// --- CSV ---

export function exportCSV(transactions: Transaction[], filename: string): void {
  const headers = 'Date,Description,Category,Type,Amount,Payment Method,Notes';
  const rows = transactions.map(tx =>
    `${tx.date},"${tx.description.replace(/"/g, '""')}","${tx.category}",${tx.type},${tx.amount},"${tx.paymentMethod}","${(tx.notes || '').replace(/"/g, '""')}"`
  );
  const content = [headers, ...rows].join('\n');
  downloadBlob(content, filename, 'text/csv;charset=utf-8');
}

// --- JSON ---

export function exportJSON(transactions: Transaction[], filename: string): void {
  const content = JSON.stringify(transactions, null, 2);
  downloadBlob(content, filename, 'application/json');
}

// --- Excel (xlsx via SheetJS) ---

export async function exportExcel(
  transactions: Transaction[],
  filename: string,
  scopeLabel: string,
  includeSummary: boolean
): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Transaction data
  const txRows = transactions.map(tx => ({
    Date: tx.date,
    Description: tx.description,
    Category: tx.category,
    Type: tx.type,
    Amount: tx.amount,
    'Payment Method': tx.paymentMethod,
    Notes: tx.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(txRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 10 },
    { wch: 15 }, { wch: 18 }, { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  // Summary sheet
  if (includeSummary) {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const summaryData = [
      { Metric: 'Scope', Value: scopeLabel },
      { Metric: 'Total Transactions', Value: transactions.length },
      { Metric: 'Total Income', Value: income },
      { Metric: 'Total Expense', Value: expense },
      { Metric: 'Net Balance', Value: income - expense },
      { Metric: 'Generated', Value: new Date().toLocaleDateString() },
    ];

    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 20 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  }

  XLSX.writeFile(wb, filename);
}

// --- PDF (jsPDF + autotable) ---

export async function exportPDF(
  transactions: Transaction[],
  filename: string,
  scopeLabel: string,
  includeSummary: boolean
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default;

  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text('Financial Report', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${scopeLabel} | Generated ${new Date().toLocaleDateString()}`, 14, 28);

  let startY = 36;

  // Summary section
  if (includeSummary) {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net = income - expense;

    autoTable(doc, {
      startY,
      head: [['Metric', 'Value']],
      body: [
        ['Total Transactions', String(transactions.length)],
        ['Total Income', formatCurrency(income)],
        ['Total Expense', formatCurrency(expense)],
        ['Net Balance', formatCurrency(net)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
      margin: { left: 14 },
    });

    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Transactions table
  const body = transactions.map(tx => [
    tx.date,
    tx.description,
    tx.category,
    tx.type,
    formatCurrency(tx.amount),
    tx.paymentMethod,
  ]);

  autoTable(doc, {
    startY,
    head: [['Date', 'Description', 'Category', 'Type', 'Amount', 'Payment']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 8 },
    columnStyles: {
      4: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14 },
  });

  doc.save(filename);
}

// --- Helper ---

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
