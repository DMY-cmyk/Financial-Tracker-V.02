import { useState, useCallback } from 'react';
import { useStore } from '@/store';
import { type ExtractionStatus } from '@/lib/types';
import { type OcrData } from '@/components/upload/OcrPreview';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';
import { validateOcrFields, type FieldError } from '@/lib/validation';

interface UseUploadReturn {
  // File state
  file: File | null;
  preview: string;
  handleFileSelect: (f: File) => void;
  handleClear: () => void;

  // Extraction
  status: ExtractionStatus;
  confidence: number;
  ocrResult: OcrData | null;
  setOcrResult: (data: OcrData | null) => void;
  processOcr: () => Promise<void>;
  handleSave: () => boolean;

  // Validation
  errors: FieldError[];

  // Derived
  isProcessing: boolean;
  canSave: boolean;
}

export function useUpload(): UseUploadReturn {
  const addTransaction = useStore(s => s.addTransaction);
  const paymentMethods = useStore(s => s.paymentMethods);
  const month = useStore(s => s.ui.selectedMonth);
  const year = useStore(s => s.ui.selectedYear);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  const [confidence, setConfidence] = useState(0);
  const [ocrResult, setOcrResult] = useState<OcrData | null>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus('idle');
    setOcrResult(null);
    setConfidence(0);
    setErrors([]);
  }, []);

  const handleClear = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview('');
    setStatus('idle');
    setOcrResult(null);
    setConfidence(0);
    setErrors([]);
  }, [preview]);

  const processOcr = async () => {
    if (!file) return;
    setStatus('processing');

    try {
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(file, 'eng+ind');
      const text = result.data.text;
      const conf = result.data.confidence;

      const amountMatch = text.match(/(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*)/);
      const amount = amountMatch ? amountMatch[1].replace(/[.,]/g, '') : '';

      const dateMatch = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
      let dateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      if (dateMatch) {
        const y = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
        dateStr = `${y}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
      }

      setOcrResult({
        amount: amount ? formatCurrencyInput(parseInt(amount)) : '',
        description: text.split('\n')[0]?.trim().substring(0, 50) || '',
        date: dateStr,
        category: '',
      });
      setConfidence(conf);
      setStatus('extracted');
    } catch {
      setOcrResult({
        amount: '',
        description: '',
        date: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        category: '',
      });
      setConfidence(0);
      setStatus('error');
    }
  };

  const handleSave = (): boolean => {
    if (!ocrResult) return false;

    const validationErrors = validateOcrFields(ocrResult);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return false;
    }

    const amount = parseCurrencyInput(ocrResult.amount);
    addTransaction({
      date: ocrResult.date,
      description: ocrResult.description,
      category: ocrResult.category,
      type: 'expense',
      amount,
      paymentMethod: paymentMethods[0]?.name || 'Cash',
      notes: 'Added via OCR',
    });

    setStatus('saved');
    setErrors([]);
    return true;
  };

  return {
    file,
    preview,
    handleFileSelect,
    handleClear,
    status,
    confidence,
    ocrResult,
    setOcrResult,
    processOcr,
    handleSave,
    errors,
    isProcessing: status === 'processing',
    canSave: status === 'extracted' && !!ocrResult,
  };
}
