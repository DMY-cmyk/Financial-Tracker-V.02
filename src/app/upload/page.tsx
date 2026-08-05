'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUpload } from '@/features/upload/useUpload';
import { t, useLocale } from '@/lib/i18n';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { formatDate } from '@/lib/formatters';
import { api } from '@/lib/api/client';
import type { UploadResponse } from '@/lib/api/contracts';
import type { ExtractionStatus } from '@/lib/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { BulkImportTabs } from '@/features/upload/BulkImportTabs';
import { DropZone } from '@/features/upload/DropZone';
import { UploadedFileCard } from '@/features/upload/UploadedFileCard';
import { ExtractionStatusBadge } from '@/features/upload/ExtractionStatusBadge';
import { ConfidenceBar } from '@/features/upload/ConfidenceBar';
import { OcrPreview } from '@/features/upload/OcrPreview';
import { InlineError } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { ScanLine, CheckCircle2, RotateCcw, History } from 'lucide-react';
import { toast } from 'sonner';

const uploadStatusMap: Record<UploadResponse['status'], ExtractionStatus> = {
  pending: 'idle',
  processing: 'processing',
  extracted: 'extracted',
  saved: 'saved',
  error: 'error',
};

export default function UploadPage() {
  const locale = useLocale();
  const {
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
    isSaving,
    isProcessing,
    errors,
    categories,
  } = useUpload();

  const [uploads, setUploads] = useState<UploadResponse[]>([]);

  useEffect(() => {
    async function fetchUploads() {
      const result = await api.uploads.list();
      if (result.data) {
        setUploads(result.data.uploads.slice(0, 10));
      }
    }
    fetchUploads();
  }, [status]);

  const onSave = async () => {
    const success = await handleSave();
    if (success) {
      toast.success(t(locale, 'savedFromReceipt'));
    } else if (errors.length > 0) {
      toast.error(t(locale, 'fixExtractedErrors'));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <motion.div {...fadeInUp}>
        <PageHeader title={t(locale, 'uploadReceipt')}>
          <BulkImportTabs activeTab="receipt" />
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
          <div className="border-border bg-card rounded-2xl border p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t(locale, 'uploadImage')}</h3>
              <ExtractionStatusBadge status={status} />
            </div>

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
                  progress={progress}
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
                    {t(locale, 'uploadAnother')}
                  </Button>
                )}

                {status === 'error' && (
                  <InlineError
                    message={t(locale, 'failedExtract')}
                    onRetry={processOcr}
                    retryLabel={t(locale, 'tryAgain')}
                  />
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* OCR Result Form */}
        <motion.div variants={staggerItem}>
          <div className="border-border bg-card rounded-2xl border p-4 sm:p-6">
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

                <p className="text-muted-foreground text-xs">{t(locale, 'reviewExtracted')}</p>

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
                  isSaving={isSaving}
                  categories={categories}
                />
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center text-center sm:h-64">
                <ScanLine className="text-muted-foreground/30 mb-3 h-10 w-10" />
                <p className="text-muted-foreground text-sm font-medium">
                  {locale === 'id'
                    ? 'Unggah dan ekstrak struk untuk melihat data'
                    : 'Upload and extract a receipt to see data'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Upload History */}
      <motion.div {...fadeInUp}>
        <div className="border-border bg-card rounded-2xl border p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <History className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-semibold">{t(locale, 'uploadHistory')}</h3>
          </div>

          {uploads.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-center">
              <ScanLine className="text-muted-foreground/30 mb-3 h-8 w-8" />
              <p className="text-muted-foreground text-sm">{t(locale, 'noUploadHistory')}</p>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {uploads.map((upload) => (
                <li
                  key={upload.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {upload.filename}
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    <ExtractionStatusBadge status={uploadStatusMap[upload.status]} />
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(upload.createdAt, locale)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  );
}
