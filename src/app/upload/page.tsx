'use client';

import { useState, useCallback } from 'react';
import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { parseCurrencyInput, formatCurrencyInput } from '@/lib/formatters';

export default function UploadPage() {
  const locale = useLocale();
  const addTransaction = useStore(s => s.addTransaction);
  const categories = useStore(s => s.categories);
  const paymentMethods = useStore(s => s.paymentMethods);
  const month = useStore(s => s.ui.selectedMonth);
  const year = useStore(s => s.ui.selectedYear);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    amount: string;
    description: string;
    date: string;
    category: string;
  } | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const processOcr = async () => {
    if (!file) return;
    setProcessing(true);

    try {
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(file, 'eng+ind');
      const text = result.data.text;

      // Extract amount patterns like Rp 100.000 or 100,000 or just numbers
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
    } catch {
      setOcrResult({ amount: '', description: '', date: `${year}-${String(month + 1).padStart(2, '0')}-01`, category: '' });
    } finally {
      setProcessing(false);
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

    setFile(null);
    setPreview('');
    setOcrResult(null);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t(locale, 'uploadReceipt')} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Zone */}
        <div className="rounded-2xl border border-border bg-card p-6">
          {!preview ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border transition-colors hover:border-primary/50 hover:bg-primary/5"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">Drop receipt image here</p>
              <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-xl">
                <img src={preview} alt="Receipt" className="w-full rounded-xl" />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={processOcr}
                  disabled={processing}
                  className="flex-1 gap-2"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  {processing ? 'Processing...' : 'Extract Text'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setFile(null); setPreview(''); setOcrResult(null); }}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* OCR Result Form */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">Extracted Data</h3>
          {ocrResult ? (
            <div className="space-y-4">
              <div>
                <Label>{t(locale, 'amount')}</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">Rp</span>
                  <Input
                    value={ocrResult.amount}
                    onChange={(e) => setOcrResult({ ...ocrResult, amount: e.target.value })}
                    className="pl-10 font-mono"
                  />
                </div>
              </div>
              <div>
                <Label>{t(locale, 'description')}</Label>
                <Input
                  value={ocrResult.description}
                  onChange={(e) => setOcrResult({ ...ocrResult, description: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t(locale, 'date')}</Label>
                <Input
                  type="date"
                  value={ocrResult.date}
                  onChange={(e) => setOcrResult({ ...ocrResult, date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t(locale, 'category')}</Label>
                <select
                  value={ocrResult.category}
                  onChange={(e) => setOcrResult({ ...ocrResult, category: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  {categories.filter(c => c.type === 'expense').map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleSave} className="w-full">
                {t(locale, 'save')} Transaction
              </Button>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Upload and process a receipt to see extracted data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
