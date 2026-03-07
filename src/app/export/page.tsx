'use client';

import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { filterByMonth } from '@/lib/calculations';
import { formatCurrency } from '@/lib/formatters';
import { MONTH_NAMES } from '@/lib/constants';
import { FileSpreadsheet, FileText, FileDown, Download } from 'lucide-react';
import { useState } from 'react';

type ExportFormat = 'csv' | 'json';
type ExportScope = 'current' | 'all';

export default function ExportPage() {
  const locale = useLocale();
  const transactions = useStore(s => s.transactions);
  const month = useStore(s => s.ui.selectedMonth);
  const year = useStore(s => s.ui.selectedYear);

  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<ExportScope>('current');

  const handleExport = () => {
    const data = scope === 'current'
      ? filterByMonth(transactions, month, year)
      : transactions;

    if (data.length === 0) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'csv') {
      const headers = 'Date,Description,Category,Type,Amount,Payment Method,Notes';
      const rows = data.map(tx =>
        `${tx.date},"${tx.description}","${tx.category}",${tx.type},${tx.amount},"${tx.paymentMethod}","${tx.notes}"`
      );
      content = [headers, ...rows].join('\n');
      filename = `transactions-${scope === 'current' ? `${MONTH_NAMES[month]}-${year}` : 'all'}.csv`;
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(data, null, 2);
      filename = `transactions-${scope === 'current' ? `${MONTH_NAMES[month]}-${year}` : 'all'}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formats = [
    { value: 'csv' as const, label: 'CSV', desc: 'Spreadsheet compatible', icon: FileSpreadsheet },
    { value: 'json' as const, label: 'JSON', desc: 'Raw data format', icon: FileText },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t(locale, 'exportData')} />

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">Format</h3>
        <div className="grid grid-cols-2 gap-3">
          {formats.map(({ value, label, desc, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setFormat(value)}
              className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                format === value
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
            >
              <Icon className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">Scope</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setScope('current')}
            className={`rounded-xl border-2 p-4 text-left transition-colors ${
              scope === 'current'
                ? 'border-primary bg-primary/5'
                : 'border-transparent bg-muted/50 hover:bg-muted'
            }`}
          >
            <p className="text-sm font-semibold">{t(locale, 'thisMonth')}</p>
            <p className="text-xs text-muted-foreground">{MONTH_NAMES[month]} {year}</p>
          </button>
          <button
            onClick={() => setScope('all')}
            className={`rounded-xl border-2 p-4 text-left transition-colors ${
              scope === 'all'
                ? 'border-primary bg-primary/5'
                : 'border-transparent bg-muted/50 hover:bg-muted'
            }`}
          >
            <p className="text-sm font-semibold">{t(locale, 'all')} Data</p>
            <p className="text-xs text-muted-foreground">{transactions.length} transactions</p>
          </button>
        </div>
      </div>

      <Button onClick={handleExport} size="lg" className="w-full gap-2">
        <Download className="h-5 w-5" />
        {t(locale, 'exportData')}
      </Button>
    </div>
  );
}
