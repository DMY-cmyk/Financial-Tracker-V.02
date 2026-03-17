import { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from '@/store';
import { filterByMonth } from '@/lib/calculations';
import { MONTH_NAMES } from '@/lib/constants';
import { exportCSV, exportJSON, exportExcel, exportPDF } from '@/lib/export-utils';
import { type ExportFormat, type ExportScope, type Transaction } from '@/lib/types';
import { type ExportOptionsState } from '@/features/export/ExportOptions';
import { api } from '@/lib/api/client';
import type { ExportJobResponse } from '@/lib/api/contracts';

interface UseExportReturn {
  // Config
  format: ExportFormat;
  setFormat: (f: ExportFormat) => void;
  scope: ExportScope;
  setScope: (s: ExportScope) => void;
  options: ExportOptionsState;
  setOptions: (o: ExportOptionsState) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;

  // Data
  scopedTransactions: Transaction[];
  scopeLabel: string;
  totalCount: number;
  allTransactionCount: number;

  // Export jobs history
  exportJobs: ExportJobResponse[];
  jobsLoading: boolean;

  // Export action
  handleExport: () => Promise<void>;
  isExporting: boolean;
  exportError: string | null;
}

export function useExport(): UseExportReturn {
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const initialized = useStore((s) => s.initialized);

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<ExportScope>('current');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [options, setOptions] = useState<ExportOptionsState>({
    includeSummary: false,
    groupByDate: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportJobs, setExportJobs] = useState<ExportJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    if (!initialized) return;
    api.transactions.list().then((result) => {
      if (result.data) setAllTransactions(result.data.transactions);
    });
  }, [initialized]);

  useEffect(() => {
    if (!initialized) return;
    setJobsLoading(true);
    api.exportJobs.list().then((result) => {
      if (result.data) setExportJobs(result.data.jobs);
      setJobsLoading(false);
    });
  }, [initialized]);

  const scopedTransactions = useMemo(() => {
    if (scope === 'current') return filterByMonth(allTransactions, month, year);
    if (scope === 'range' && startDate && endDate) {
      return allTransactions.filter((tx) => tx.date >= startDate && tx.date <= endDate);
    }
    return allTransactions;
  }, [allTransactions, month, year, scope, startDate, endDate]);

  const scopeLabel = useMemo(() => {
    if (scope === 'current') return `${MONTH_NAMES[month]} ${year}`;
    if (scope === 'range' && startDate && endDate) return `${startDate} – ${endDate}`;
    return 'All Data';
  }, [scope, month, year, startDate, endDate]);

  const buildFilename = useCallback(
    (ext: string) => {
      const tag =
        scope === 'current'
          ? `${MONTH_NAMES[month]}-${year}`
          : scope === 'range' && startDate
            ? `${startDate}-to-${endDate}`
            : 'all';
      return `transactions-${tag}.${ext}`;
    },
    [scope, month, year, startDate, endDate]
  );

  const handleExport = useCallback(async () => {
    if (scopedTransactions.length === 0) return;
    setIsExporting(true);
    setExportError(null);

    try {
      switch (format) {
        case 'csv':
          exportCSV(scopedTransactions, buildFilename('csv'));
          break;
        case 'json':
          exportJSON(scopedTransactions, buildFilename('json'));
          break;
        case 'xlsx':
          await exportExcel(
            scopedTransactions,
            buildFilename('xlsx'),
            scopeLabel,
            options.includeSummary
          );
          break;
        case 'pdf':
          await exportPDF(
            scopedTransactions,
            buildFilename('pdf'),
            scopeLabel,
            options.includeSummary
          );
          break;
      }

      // Persist export job record
      const jobResult = await api.exportJobs.create({
        format,
        scope,
        filters: scope === 'range' ? JSON.stringify({ startDate, endDate }) : undefined,
        recordCount: scopedTransactions.length,
      });
      if (jobResult.data) {
        setExportJobs((prev) => [
          { ...jobResult.data!, status: 'completed', completedAt: new Date().toISOString() },
          ...prev,
        ]);
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [
    format,
    scopedTransactions,
    buildFilename,
    scopeLabel,
    options.includeSummary,
    scope,
    startDate,
    endDate,
  ]);

  return {
    format,
    setFormat,
    scope,
    setScope,
    options,
    setOptions,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    scopedTransactions,
    scopeLabel,
    totalCount: scopedTransactions.length,
    allTransactionCount: allTransactions.length,
    exportJobs,
    jobsLoading,
    handleExport,
    isExporting,
    exportError,
  };
}
