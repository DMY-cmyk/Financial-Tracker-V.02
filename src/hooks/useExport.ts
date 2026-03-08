import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/store';
import { filterByMonth } from '@/lib/calculations';
import { MONTH_NAMES } from '@/lib/constants';
import { exportCSV, exportJSON, exportExcel, exportPDF } from '@/lib/export-utils';
import { type ExportFormat, type ExportScope } from '@/lib/types';
import { type ExportOptionsState } from '@/components/export/ExportOptions';

interface UseExportReturn {
  // Config
  format: ExportFormat;
  setFormat: (f: ExportFormat) => void;
  scope: ExportScope;
  setScope: (s: ExportScope) => void;
  options: ExportOptionsState;
  setOptions: (o: ExportOptionsState) => void;

  // Data
  scopedTransactions: ReturnType<typeof filterByMonth>;
  scopeLabel: string;

  // Export action
  handleExport: () => Promise<void>;
  isExporting: boolean;
  exportError: string | null;
}

export function useExport(): UseExportReturn {
  const transactions = useStore((s) => s.transactions);
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);

  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<ExportScope>('current');
  const [options, setOptions] = useState<ExportOptionsState>({
    includeSummary: false,
    groupByDate: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const scopedTransactions = useMemo(
    () => (scope === 'current' ? filterByMonth(transactions, month, year) : transactions),
    [transactions, month, year, scope]
  );

  const scopeLabel = scope === 'current' ? `${MONTH_NAMES[month]} ${year}` : 'All Data';

  const buildFilename = useCallback(
    (ext: string) => {
      const tag = scope === 'current' ? `${MONTH_NAMES[month]}-${year}` : 'all';
      return `transactions-${tag}.${ext}`;
    },
    [scope, month, year]
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
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [format, scopedTransactions, buildFilename, scopeLabel, options.includeSummary]);

  return {
    format,
    setFormat,
    scope,
    setScope,
    options,
    setOptions,
    scopedTransactions,
    scopeLabel,
    handleExport,
    isExporting,
    exportError,
  };
}
