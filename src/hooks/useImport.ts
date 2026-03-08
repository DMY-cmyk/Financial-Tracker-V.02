import { useState, useCallback } from 'react';
import { useStore } from '@/store';
import {
  parseJsonImport,
  parseCsvImport,
  readFileAsText,
  type ImportResult,
} from '@/lib/import-utils';

type ImportStatus = 'idle' | 'reading' | 'validating' | 'complete' | 'error';

interface UseImportReturn {
  status: ImportStatus;
  result: ImportResult | null;
  error: string | null;
  importFile: (file: File) => Promise<void>;
  confirmImport: () => number;
  reset: () => void;
}

export function useImport(): UseImportReturn {
  const addTransaction = useStore(s => s.addTransaction);

  const [status, setStatus] = useState<ImportStatus>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importFile = useCallback(async (file: File) => {
    setStatus('reading');
    setError(null);
    setResult(null);

    try {
      const content = await readFileAsText(file);
      setStatus('validating');

      const ext = file.name.split('.').pop()?.toLowerCase();
      let parsed: ImportResult;

      if (ext === 'json') {
        parsed = parseJsonImport(content);
      } else if (ext === 'csv') {
        parsed = parseCsvImport(content);
      } else {
        setError('Unsupported file type. Please use .json or .csv');
        setStatus('error');
        return;
      }

      setResult(parsed);

      if (parsed.transactions.length === 0) {
        setError(parsed.errors[0] || 'No valid transactions found');
        setStatus('error');
      } else {
        setStatus('complete');
      }
    } catch {
      setError('Failed to read the file');
      setStatus('error');
    }
  }, []);

  const confirmImport = useCallback((): number => {
    if (!result || result.transactions.length === 0) return 0;

    let count = 0;
    for (const tx of result.transactions) {
      const { id: _id, ...rest } = tx;
      addTransaction(rest);
      count++;
    }

    return count;
  }, [result, addTransaction]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, importFile, confirmImport, reset };
}
