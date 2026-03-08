'use client';

import { motion } from 'framer-motion';
import { useExport } from '@/hooks/useExport';
import { t, useLocale } from '@/lib/i18n';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormatCard } from '@/components/export/FormatCard';
import { ScopeSelector } from '@/components/export/ScopeSelector';
import { ExportOptions } from '@/components/export/ExportOptions';
import { ExportPreview } from '@/components/export/ExportPreview';
import { ExportActionBar } from '@/components/export/ExportActionBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { MONTH_NAMES } from '@/lib/constants';
import { useStore } from '@/store';
import {
  FileSpreadsheet,
  FileText,
  FileDown,
  FileBarChart,
  type LucideIcon,
  FileX,
} from 'lucide-react';
import { type ExportFormat } from '@/lib/types';
import { toast } from 'sonner';

const FORMAT_ICONS: Record<string, LucideIcon> = {
  csv: FileSpreadsheet,
  json: FileText,
  xlsx: FileDown,
  pdf: FileBarChart,
};

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'csv', label: 'CSV', description: 'Spreadsheet compatible' },
  { value: 'json', label: 'JSON', description: 'Raw data format' },
  { value: 'xlsx', label: 'Excel', description: 'Formatted workbook' },
  { value: 'pdf', label: 'PDF', description: 'Print-ready report' },
];

export default function ExportPage() {
  const locale = useLocale();
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const allTransactions = useStore((s) => s.transactions);

  const {
    format,
    setFormat,
    scope,
    setScope,
    options,
    setOptions,
    scopedTransactions,
    handleExport,
    isExporting,
  } = useExport();

  const onExport = async () => {
    try {
      await handleExport();
      toast.success(
        locale === 'id'
          ? `Berhasil diekspor sebagai ${format.toUpperCase()}`
          : `Exported as ${format.toUpperCase()}`
      );
    } catch {
      toast.error(locale === 'id' ? 'Ekspor gagal' : 'Export failed');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      <motion.div {...fadeInUp}>
        <PageHeader title={t(locale, 'exportData')} />
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-4 sm:space-y-6"
      >
        {/* Format Selection */}
        <motion.div
          variants={staggerItem}
          className="border-border bg-card rounded-2xl border p-4 sm:p-6"
        >
          <h3 className="mb-4 text-sm font-semibold">{t(locale, 'exportFormat')}</h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {FORMAT_OPTIONS.map(({ value, label, description }) => (
              <FormatCard
                key={value}
                icon={FORMAT_ICONS[value] || FileText}
                label={label}
                description={description}
                selected={format === value}
                onClick={() => setFormat(value)}
              />
            ))}
          </div>
        </motion.div>

        {/* Scope */}
        <motion.div
          variants={staggerItem}
          className="border-border bg-card rounded-2xl border p-4 sm:p-6"
        >
          <h3 className="mb-4 text-sm font-semibold">{t(locale, 'exportScope')}</h3>
          <ScopeSelector
            scope={scope}
            onScopeChange={setScope}
            monthLabel={`${MONTH_NAMES[month]} ${year}`}
            transactionCount={allTransactions.length}
          />
        </motion.div>

        {/* Options */}
        <motion.div
          variants={staggerItem}
          className="border-border bg-card rounded-2xl border p-4 sm:p-6"
        >
          <h3 className="mb-4 text-sm font-semibold">{t(locale, 'exportOptions')}</h3>
          <ExportOptions options={options} onChange={setOptions} />
        </motion.div>

        {/* Preview */}
        <motion.div
          variants={staggerItem}
          className="border-border bg-card rounded-2xl border p-4 sm:p-6"
        >
          <h3 className="mb-4 text-sm font-semibold">{t(locale, 'exportPreview')}</h3>
          {scopedTransactions.length > 0 ? (
            <ExportPreview transactions={scopedTransactions} />
          ) : (
            <EmptyState
              title={locale === 'id' ? 'Tidak ada data untuk diekspor' : 'No data to export'}
              description={
                locale === 'id'
                  ? 'Tambahkan transaksi terlebih dahulu'
                  : 'Add some transactions first'
              }
              icon={<FileX className="h-10 w-10" />}
            />
          )}
        </motion.div>

        {/* Action Bar */}
        <motion.div variants={staggerItem}>
          <ExportActionBar
            format={format}
            transactionCount={scopedTransactions.length}
            onExport={onExport}
            disabled={isExporting}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
