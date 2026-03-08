'use client';

import { motion } from 'framer-motion';
import { useUpload } from '@/hooks/useUpload';
import { useStore } from '@/store';
import { t, useLocale } from '@/lib/i18n';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { DropZone } from '@/components/upload/DropZone';
import { UploadedFileCard } from '@/components/upload/UploadedFileCard';
import { ExtractionStatusBadge } from '@/components/upload/ExtractionStatusBadge';
import { ConfidenceBar } from '@/components/upload/ConfidenceBar';
import { OcrPreview } from '@/components/upload/OcrPreview';
import { InlineError } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { ScanLine, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function UploadPage() {
  const locale = useLocale();
  const categories = useStore(s => s.categories);
  const {
    file, preview, handleFileSelect, handleClear,
    status, confidence, ocrResult, setOcrResult,
    processOcr, handleSave,
    isProcessing, errors,
  } = useUpload();

  const onSave = () => {
    const success = handleSave();
    if (success) {
      toast.success(locale === 'id' ? 'Transaksi disimpan' : 'Transaction saved from receipt');
    } else if (errors.length > 0) {
      toast.error(locale === 'id' ? 'Periksa data yang diekstrak' : 'Please fix extracted data errors');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <motion.div {...fadeInUp}>
        <PageHeader title={t(locale, 'uploadReceipt')}>
          <ExtractionStatusBadge status={status} />
        </PageHeader>
      </motion.div>

      <motion.div
        className="grid gap-4 sm:gap-6 md:grid-cols-2"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Upload Zone */}
        <motion.div variants={staggerItem}>
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
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
                    {locale === 'id' ? 'Unggah Lagi' : 'Upload Another'}
                  </Button>
                )}

                {status === 'error' && (
                  <InlineError
                    message={locale === 'id' ? 'Gagal mengekstrak teks' : 'Failed to extract text'}
                    onRetry={processOcr}
                    retryLabel={locale === 'id' ? 'Coba lagi' : 'Try again'}
                  />
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* OCR Result Form */}
        <motion.div variants={staggerItem}>
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
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

                {errors.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
                    <ul className="space-y-1 text-xs text-red-600 dark:text-red-400">
                      {errors.map((err, i) => (
                        <li key={i}>{err.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <OcrPreview
                  data={ocrResult}
                  onChange={setOcrResult}
                  onSave={onSave}
                  categories={categories}
                />
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center text-center sm:h-64">
                <ScanLine className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">
                  {locale === 'id'
                    ? 'Unggah dan ekstrak struk untuk melihat data'
                    : 'Upload and extract a receipt to see data here'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
