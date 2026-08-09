import { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from '@/store';
import { filterByMonth } from '@/lib/calculations';
import { MONTH_NAMES } from '@/lib/constants';
import { exportCSV, exportExcel, exportPDF } from '@/lib/export-utils';
import {
  type ExportFormat,
  type ExportScope,
  type Transaction,
  type ExportReportInput,
} from '@/lib/types';
import { api } from '@/lib/api/client';
import { fetchAllTransactions } from './fetch-all-transactions';

interface UseExportReturn {
  // Config
  format: ExportFormat;
  setFormat: (f: ExportFormat) => void;
  scope: ExportScope;
  setScope: (s: ExportScope) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;

  // Data
  scopedTransactions: Transaction[];
  scopeLabel: string;
  totalCount: number;
  allTransactionCount: number;

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
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    fetchAllTransactions((params) => api.transactions.list(params)).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setExportError(result.error);
        return;
      }
      setAllTransactions(result.transactions);
    });
    return () => {
      cancelled = true;
    };
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
      // Compute summaries from scoped transactions (used by CSV and rich formats)
      const totalIncome = scopedTransactions
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);
      const totalExpense = scopedTransactions
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);
      const totalAssets = totalIncome - totalExpense;

      if (format === 'csv') {
        exportCSV(
          scopedTransactions,
          buildFilename('csv'),
          scopeLabel,
          totalIncome,
          totalExpense,
          totalAssets
        );
      } else {
        const incomeCategories = Object.entries(
          scopedTransactions
            .filter((t) => t.type === 'income')
            .reduce<Record<string, number>>((acc, t) => {
              acc[t.category] = (acc[t.category] ?? 0) + t.amount;
              return acc;
            }, {})
        )
          .map(([category, total]) => ({ category, total }))
          .sort((a, b) => b.total - a.total);

        const expenseCategories = Object.entries(
          scopedTransactions
            .filter((t) => t.type === 'expense')
            .reduce<Record<string, number>>((acc, t) => {
              acc[t.category] = (acc[t.category] ?? 0) + t.amount;
              return acc;
            }, {})
        )
          .map(([category, total]) => ({ category, total }))
          .sort((a, b) => b.total - a.total);

        const paymentMethodBalances = Object.entries(
          scopedTransactions.reduce<Record<string, number>>((acc, t) => {
            const delta = t.type === 'income' ? t.amount : -t.amount;
            acc[t.paymentMethod] = (acc[t.paymentMethod] ?? 0) + delta;
            return acc;
          }, {})
        ).map(([name, balance]) => ({ name, balance }));

        // Fetch bills only for single-month scope
        let bills: import('@/lib/types').Bill[] = [];
        if (scope === 'current') {
          const billsResult = await api.bills.list({ month, year });
          bills = billsResult.data?.bills ?? [];
        }

        const input: ExportReportInput = {
          scopeLabel,
          transactions: scopedTransactions,
          totalIncome,
          totalExpense,
          totalAssets,
          incomeCategories,
          expenseCategories,
          paymentMethodBalances,
          bills,
          filename: buildFilename(format === 'xlsx' ? 'xlsx' : 'pdf'),
        };

        if (format === 'xlsx') {
          await exportExcel(input);
        } else {
          await exportPDF(input);
        }
      }

      // Record the export server-side as an audit entry. Files are generated
      // client-side and downloaded directly — no artifact is stored.
      await api.exportJobs.create({
        format,
        scope,
        filters: scope === 'range' ? JSON.stringify({ startDate, endDate }) : undefined,
        recordCount: scopedTransactions.length,
      });
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
      // Rethrow so callers can distinguish failure from success (toast handling)
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, [
    format,
    scopedTransactions,
    buildFilename,
    scopeLabel,
    scope,
    month,
    year,
    startDate,
    endDate,
  ]);

  return {
    format,
    setFormat,
    scope,
    setScope,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    scopedTransactions,
    scopeLabel,
    totalCount: scopedTransactions.length,
    allTransactionCount: allTransactions.length,
    handleExport,
    isExporting,
    exportError,
  };
}
