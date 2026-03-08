'use client';

import { useState, useCallback } from 'react';
import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { PageHeader } from '@/components/layout/PageHeader';
import { DropZone } from '@/components/upload/DropZone';
import { UploadedFileCard } from '@/components/upload/UploadedFileCard';
import { ExtractionStatusBadge } from '@/components/upload/ExtractionStatusBadge';
import { ConfidenceBar } from '@/components/upload/ConfidenceBar';
import { OcrPreview, type OcrData } from '@/components/upload/OcrPreview';
import { Button } from '@/components/ui/button';
import { ScanLine, CheckCircle2, RotateCcw } from 'lucide-react';
import { type ExtractionStatus } from '@/lib/types';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';

export default function UploadPage() {
  const locale = useLocale();
  const addTransaction = useStore(s => s.addTransaction);
  const categories = useStore(s => s.categories);
  const paymentMethods = useStore(s => s.paymentMethods);
  const month = useStore(s => s.ui.selectedMonth);
  const year = useStore(s => s.ui.selectedYear);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  const [confidence, setConfidence] = useState(0);
  const [ocrResult, setOcrResult] = useState<OcrData | null>(null);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus('idle');
    setOcrResult(null);
    setConfidence(0);
  }, []);

  const handleClear = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview('');
    setStatus('idle');
    setOcrResult(null);
    setConfidence(0);
  }, [preview]);

  const processOcr = async () => {
    if (!file) return;
    setStatus('processing');

    try {
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(file, 'eng+ind');
      const text = result.data.text;
      const conf = result.data.confidence;

      // Extract amount patterns like Rp 100.000 or 100,000
      const amountMatch = text.match(/(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*)/);
      const amount = amountMatch ? amountMatch[1].replace(/[.,]/g, '') : '';

      // Extract date patterns
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

  const handleSave = () => {
    if (!ocrResult) return;
    const amount = parseCurrencyInput(ocrResult.amount);
    if (!amount || !ocrResult.description || !ocrResult.category) return;

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
  };

  const isProcessing = status === 'processing';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t(locale, 'uploadReceipt')}>
        <ExtractionStatusBadge status={status} />
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Zone */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">{t(locale, 'uploadImage')}</h3>

          {!file ? (
            <DropZone
              onFileSelect={handleFileSelect}
              accept="image/png,image/jpeg,image/webp,image/heic"
            />
          ) : (
            <div className="space-y-4">
              <UploadedFileCard
                fileName={file.name}
                previewUrl={preview}
                isProcessing={isProcessing}
                onClear={handleClear}
              />

              {status === 'idle' && (
                <Button onClick={processOcr} className="w-full gap-2">
                  <ScanLine className="h-4 w-4" />
                  {t(locale, 'extractText')}
                </Button>
              )}

              {status === 'saved' && (
                <Button variant="outline" onClick={handleClear} className="w-full gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Upload Another
                </Button>
              )}
            </div>
          )}
        </div>

        {/* OCR Result Form */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t(locale, 'extractedData')}</h3>
            {status === 'saved' && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t(locale, 'success')}
              </span>
            )}
          </div>

          {ocrResult ? (
            <div className="space-y-4">
              {confidence > 0 && <ConfidenceBar confidence={confidence} />}

              <p className="text-xs text-muted-foreground">
                {t(locale, 'reviewExtracted')}
              </p>

              <OcrPreview
                data={ocrResult}
                onChange={setOcrResult}
                onSave={handleSave}
                categories={categories}
              />
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <ScanLine className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                {status === 'error'
                  ? t(locale, 'error')
                  : 'Upload and extract a receipt to see data here'}
              </p>
              {status === 'error' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Try uploading a clearer image
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
