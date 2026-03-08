'use client';

import { useState } from 'react';
import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormatCard } from '@/components/export/FormatCard';
import { ScopeSelector } from '@/components/export/ScopeSelector';
import { ExportOptions, type ExportOptionsState } from '@/components/export/ExportOptions';
import { ExportPreview } from '@/components/export/ExportPreview';
import { ExportActionBar } from '@/components/export/ExportActionBar';
import { filterByMonth } from '@/lib/calculations';
import { MONTH_NAMES } from '@/lib/constants';
import { EXPORT_FORMATS } from '@/lib/mock-data';
import { FileSpreadsheet, FileText, FileDown, FileBarChart, type LucideIcon } from 'lucide-react';
import { type ExportFormat, type ExportScope } from '@/lib/types';

const FORMAT_ICONS: Record<string, LucideIcon> = {
  csv: FileSpreadsheet,
  json: FileText,
  xlsx: FileDown,
  pdf: FileBarChart,
};

export default function ExportPage() {
  const locale = useLocale();
  const transactions = useStore(s => s.transactions);
  const month = useStore(s => s.ui.selectedMonth);
  const year = useStore(s => s.ui.selectedYear);

  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<ExportScope>('current');
  const [options, setOptions] = useState<ExportOptionsState>({
    includeSummary: false,
    groupByDate: false,
  });

  const scopedTransactions = scope === 'current'
    ? filterByMonth(transactions, month, year)
    : transactions;

  const handleExport = () => {
    if (scopedTransactions.length === 0) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'csv') {
      const headers = 'Date,Description,Category,Type,Amount,Payment Method,Notes';
      const rows = scopedTransactions.map(tx =>
        `${tx.date},"${tx.description}","${tx.category}",${tx.type},${tx.amount},"${tx.paymentMethod}","${tx.notes}"`
      );
      content = [headers, ...rows].join('\n');
      filename = `transactions-${scope === 'current' ? `${MONTH_NAMES[month]}-${year}` : 'all'}.csv`;
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(scopedTransactions, null, 2);
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t(locale, 'exportData')} />

      {/* Format Selection */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">{t(locale, 'exportFormat')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {EXPORT_FORMATS.map(({ value, label, description, available }) => (
            <div key={value} className="relative">
              <FormatCard
                icon={FORMAT_ICONS[value] || FileText}
                label={label}
                description={available ? description : 'Coming soon'}
                selected={format === value}
                onClick={() => available && setFormat(value)}
              />
              {!available && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Soon
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scope */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">{t(locale, 'exportScope')}</h3>
        <ScopeSelector
          scope={scope}
          onScopeChange={setScope}
          monthLabel={`${MONTH_NAMES[month]} ${year}`}
          transactionCount={transactions.length}
        />
      </div>

      {/* Options */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">{t(locale, 'exportOptions')}</h3>
        <ExportOptions options={options} onChange={setOptions} />
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">{t(locale, 'exportPreview')}</h3>
        <ExportPreview transactions={scopedTransactions} />
      </div>

      {/* Action Bar */}
      <ExportActionBar
        format={format}
        transactionCount={scopedTransactions.length}
        onExport={handleExport}
      />
    </div>
  );
}
