import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@/store';
import { type ExtractionStatus, type Category, type PaymentMethod } from '@/lib/types';
import { type OcrData } from '@/components/upload/OcrPreview';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';
import { validateOcrFields, type FieldError } from '@/lib/validation';
import { suggestCategory } from '@/lib/category-suggest';
import { api } from '@/lib/api/client';

interface UseUploadReturn {
  // File state
  file: File | null;
  preview: string;
  handleFileSelect: (f: File) => void;
  handleClear: () => void;

  // Extraction
  status: ExtractionStatus;
  confidence: number;
  progress: number;
  ocrResult: OcrData | null;
  setOcrResult: (data: OcrData | null) => void;
  processOcr: () => Promise<void>;
  handleSave: () => Promise<boolean>;

  // Validation
  errors: FieldError[];

  // Data
  categories: Category[];
  paymentMethods: PaymentMethod[];

  // Derived
  isProcessing: boolean;
  canSave: boolean;
}

export function useUpload(): UseUploadReturn {
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  const [confidence, setConfidence] = useState(0);
  const [progress, setProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<OcrData | null>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    Promise.all([api.categories.list(), api.paymentMethods.list()]).then(([catRes, pmRes]) => {
      if (catRes.data) setCategories(catRes.data.categories);
      if (pmRes.data) setPaymentMethods(pmRes.data.paymentMethods);
    });
  }, []);

  const handleFileSelect = useCallback(async (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus('idle');
    setOcrResult(null);
    setConfidence(0);
    setProgress(0);
    setErrors([]);

    // Persist upload metadata
    const result = await api.uploads.create({
      filename: f.name,
      fileSize: f.size,
      mimeType: f.type,
    });
    if (result.data) setUploadId(result.data.id);
  }, []);

  const handleClear = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview('');
    setStatus('idle');
    setOcrResult(null);
    setConfidence(0);
    setProgress(0);
    setErrors([]);
    setUploadId(null);
  }, [preview]);

  const processOcr = async () => {
    if (!file) return;
    setStatus('processing');
    if (uploadId) await api.uploads.update(uploadId, { status: 'processing' });

    try {
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(file, 'eng+ind', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
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

      const desc = text.split('\n')[0]?.trim().substring(0, 50) || '';
      const suggestion = suggestCategory(text, categories);

      const extracted: OcrData = {
        amount: amount ? formatCurrencyInput(parseInt(amount)) : '',
        description: desc,
        date: dateStr,
        category: suggestion?.name || '',
      };

      setOcrResult(extracted);
      setConfidence(conf);
      setStatus('extracted');
      if (uploadId) {
        await api.uploads.update(uploadId, {
          status: 'extracted',
          extractedData: JSON.stringify(extracted),
        });
      }
    } catch {
      setOcrResult({
        amount: '',
        description: '',
        date: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        category: '',
      });
      setConfidence(0);
      setStatus('error');
      if (uploadId) await api.uploads.update(uploadId, { status: 'error' });
    }
  };

  const handleSave = async (): Promise<boolean> => {
    if (!ocrResult) return false;

    const validationErrors = validateOcrFields(ocrResult);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return false;
    }

    const amount = parseCurrencyInput(ocrResult.amount);
    const result = await api.transactions.create({
      date: ocrResult.date,
      description: ocrResult.description,
      category: ocrResult.category,
      type: 'expense',
      amount,
      paymentMethod: paymentMethods[0]?.name || 'Cash',
      notes: 'Added via OCR',
    });

    if (result.error) {
      setErrors([{ field: 'root', message: result.error.message }]);
      return false;
    }

    if (uploadId) await api.uploads.update(uploadId, { status: 'saved' });
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
    progress,
    ocrResult,
    setOcrResult,
    processOcr,
    handleSave,
    errors,
    categories,
    paymentMethods,
    isProcessing: status === 'processing',
    canSave: status === 'extracted' && !!ocrResult,
  };
}
