'use client';

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { parseExcelFile } from '@/lib/excel-import';
import { parseOcrTextToTransactions } from '@/lib/ocr-import';
import { generateBulkTemplate } from '@/lib/excel-template';
import type {
  Category,
  PaymentMethod,
  BulkImportRow,
  BulkImportResult,
  BulkImportSource,
  BulkImportStatus,
} from '@/lib/types';

interface ImportProgress {
  current: number;
  total: number;
}

interface CreateResult {
  created: number;
  failed: number;
  errors: { index: number; message: string }[];
}

export interface UseBulkImportReturn {
  source: BulkImportSource | null;
  status: BulkImportStatus;
  fileName: string;
  importResult: BulkImportResult | null;
  importProgress: ImportProgress;
  createResult: CreateResult | null;
  error: string | null;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  handleFileSelect: (file: File) => Promise<void>;
  removeRow: (rowIndex: number) => void;
  updateRow: (rowIndex: number, updates: Partial<BulkImportRow>) => void;
  confirmImport: (validOnly?: boolean) => Promise<void>;
  downloadTemplate: () => void;
  reset: () => void;
}

const EXCEL_EXTENSIONS = ['.xlsx', '.xls'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'];

function getFileExtension(name: string): string {
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : '';
}

function recalculateTotals(rows: BulkImportRow[]): BulkImportResult {
  let validCount = 0;
  let invalidCount = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  for (const row of rows) {
    if (row.isValid) {
      validCount++;
      if (row.type === 'income') totalIncome += row.amount;
      else totalExpense += row.amount;
    } else {
      invalidCount++;
    }
  }

  return { rows, validCount, invalidCount, totalIncome, totalExpense };
}

function revalidateRow(row: BulkImportRow): BulkImportRow {
  const errors: string[] = [];

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(row.date)) {
    errors.push('Invalid date format');
  } else {
    const d = new Date(row.date);
    if (isNaN(d.getTime())) {
      errors.push('Invalid date');
    }
  }

  if (row.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (!row.description.trim()) {
    errors.push('Description is empty');
  }

  return { ...row, isValid: errors.length === 0, errors };
}

export function useBulkImport(): UseBulkImportReturn {
  const [source, setSource] = useState<BulkImportSource | null>(null);
  const [status, setStatus] = useState<BulkImportStatus>('idle');
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0 });
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Fetch categories and payment methods on mount
  useEffect(() => {
    Promise.all([api.categories.list(), api.paymentMethods.list()]).then(
      ([catRes, pmRes]) => {
        if (catRes.data) setCategories(catRes.data.categories);
        if (pmRes.data) setPaymentMethods(pmRes.data.paymentMethods);
      }
    );
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      const ext = getFileExtension(file.name);
      setFileName(file.name);
      setError(null);
      setCreateResult(null);
      setStatus('parsing');

      try {
        if (EXCEL_EXTENSIONS.includes(ext)) {
          setSource('excel');
          const result = await parseExcelFile(file);
          setImportResult(result);
          setStatus('preview');
        } else if (IMAGE_EXTENSIONS.includes(ext)) {
          setSource('image');
          const Tesseract = await import('tesseract.js');
          const ocrResult = await Tesseract.recognize(file, 'eng+ind');
          const text = ocrResult.data.text;
          const parsed = parseOcrTextToTransactions(text, categories);
          setImportResult(parsed);
          setStatus('preview');
        } else {
          setError(`Unsupported file type: ${ext}`);
          setStatus('error');
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to parse file';
        setError(message);
        setStatus('error');
      }
    },
    [categories]
  );

  const removeRow = useCallback((rowIndex: number) => {
    setImportResult((prev) => {
      if (!prev) return prev;
      const updatedRows = prev.rows
        .filter((r) => r.rowIndex !== rowIndex)
        .map((r, i) => ({ ...r, rowIndex: i }));
      return recalculateTotals(updatedRows);
    });
  }, []);

  const updateRow = useCallback((rowIndex: number, updates: Partial<BulkImportRow>) => {
    setImportResult((prev) => {
      if (!prev) return prev;
      const updatedRows = prev.rows.map((r) => {
        if (r.rowIndex !== rowIndex) return r;
        const updated = { ...r, ...updates };
        return revalidateRow(updated);
      });
      return recalculateTotals(updatedRows);
    });
  }, []);

  const confirmImport = useCallback(
    async (validOnly: boolean = true) => {
      if (!importResult) return;

      setStatus('importing');
      setError(null);

      const rowsToImport = validOnly
        ? importResult.rows.filter((r) => r.isValid)
        : importResult.rows;

      if (rowsToImport.length === 0) {
        setError('No rows to import');
        setStatus('error');
        return;
      }

      setImportProgress({ current: 0, total: rowsToImport.length });

      const transactions = rowsToImport.map((row) => ({
        date: row.date,
        description: row.description,
        category: row.category,
        type: row.type,
        amount: row.amount,
        paymentMethod: row.paymentMethod,
        notes: row.notes,
      }));

      try {
        const res = await api.transactions.bulkCreate({ transactions });
        setImportProgress({ current: rowsToImport.length, total: rowsToImport.length });

        if (res.data) {
          setCreateResult({
            created: res.data.created,
            failed: res.data.failed,
            errors: res.data.errors,
          });
          setStatus('complete');
        } else {
          setError(res.error?.message ?? 'Failed to import transactions');
          setStatus('error');
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to import transactions';
        setError(message);
        setStatus('error');
      }
    },
    [importResult]
  );

  const downloadTemplate = useCallback(() => {
    generateBulkTemplate(categories, paymentMethods);
  }, [categories, paymentMethods]);

  const reset = useCallback(() => {
    setSource(null);
    setStatus('idle');
    setFileName('');
    setImportResult(null);
    setImportProgress({ current: 0, total: 0 });
    setCreateResult(null);
    setError(null);
  }, []);

  return {
    source,
    status,
    fileName,
    importResult,
    importProgress,
    createResult,
    error,
    categories,
    paymentMethods,
    handleFileSelect,
    removeRow,
    updateRow,
    confirmImport,
    downloadTemplate,
    reset,
  };
}
