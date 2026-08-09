'use client';

import { motion } from 'framer-motion';
import { useExport } from '@/features/export/useExport';
import { t, useLocale } from '@/lib/i18n';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormatCard } from '@/features/export/FormatCard';
import { ScopeSelector } from '@/features/export/ScopeSelector';
import { ExportPreview } from '@/features/export/ExportPreview';
import { ExportActionBar } from '@/features/export/ExportActionBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { getMonthNames } from '@/lib/constants';
import { useStore } from '@/store';
import { FileSpreadsheet, FileDown, FileBarChart, type LucideIcon, FileX } from 'lucide-react';
import { type ExportFormat } from '@/lib/types';
import { toast } from 'sonner';

const FORMAT_ICONS: Record<string, LucideIcon> = {
  csv: FileSpreadsheet,
  xlsx: FileDown,
  pdf: FileBarChart,
};

export default function ExportPage() {
  const locale = useLocale();

  const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
    { value: 'csv', label: 'CSV', description: t(locale, 'formatSpreadsheet') },
    { value: 'xlsx', label: 'Excel', description: t(locale, 'formatWorkbook') },
    { value: 'pdf', label: 'PDF', description: t(locale, 'formatPdfReport') },
  ];
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);

  const {
    format,
    setFormat,
    scope,
    setScope,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    scopedTransactions,
    allTransactionCount,
    handleExport,
    isExporting,
  } = useExport();

  const onExport = async () => {
    try {
      await handleExport();
      toast.success(`${t(locale, 'exportSuccess')} (${format.toUpperCase()})`);
    } catch {
      toast.error(t(locale, 'exportFailed'));
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
          className="border-border bg-card shadow-card hover:shadow-card-hover rounded-2xl border p-4 transition-shadow duration-300 sm:p-6"
        >
          <h3 className="mb-4 text-sm font-semibold tracking-tight">{t(locale, 'exportFormat')}</h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {FORMAT_OPTIONS.map(({ value, label, description }) => (
              <FormatCard
                key={value}
                icon={FORMAT_ICONS[value] || FileDown}
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
          className="border-border bg-card shadow-card hover:shadow-card-hover rounded-2xl border p-4 transition-shadow duration-300 sm:p-6"
        >
          <h3 className="mb-4 text-sm font-semibold tracking-tight">{t(locale, 'exportScope')}</h3>
          <ScopeSelector
            scope={scope}
            onScopeChange={setScope}
            monthLabel={`${getMonthNames(locale)[month]} ${year}`}
            transactionCount={allTransactionCount}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
          />
        </motion.div>

        {/* Preview */}
        <motion.div
          variants={staggerItem}
          className="border-border bg-card shadow-card hover:shadow-card-hover rounded-2xl border p-4 transition-shadow duration-300 sm:p-6"
        >
          <h3 className="mb-4 text-sm font-semibold tracking-tight">
            {t(locale, 'exportPreview')}
          </h3>
          {scopedTransactions.length > 0 ? (
            <ExportPreview transactions={scopedTransactions} />
          ) : (
            <EmptyState
              title={t(locale, 'noDataToExport')}
              description={t(locale, 'addTransactionsFirst')}
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
