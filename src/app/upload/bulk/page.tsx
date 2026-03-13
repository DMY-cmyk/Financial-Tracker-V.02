'use client';

import { motion } from 'framer-motion';
import { useBulkImport } from '@/hooks/useBulkImport';
import { t, useLocale } from '@/lib/i18n';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { BulkImportTabs } from '@/components/upload/BulkImportTabs';
import { DropZone } from '@/components/upload/DropZone';
import { ImportPreview } from '@/components/upload/ImportPreview';
import { ImportProgress } from '@/components/upload/ImportProgress';
import { ImportSummary } from '@/components/upload/ImportSummary';
import { Button } from '@/components/ui/button';
import { Download, RotateCcw, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BulkImportPage() {
  const locale = useLocale();
  const {
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
  } = useBulkImport();

  const onImport = async (validOnly?: boolean) => {
    await confirmImport(validOnly);
  };

  const onFileSelect = async (file: File) => {
    try {
      await handleFileSelect(file);
    } catch {
      toast.error(t(locale, 'importError'));
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <motion.div {...fadeInUp}>
        <PageHeader title={t(locale, 'bulkImport')}>
          <BulkImportTabs activeTab="bulk" />
        </PageHeader>
      </motion.div>

      <motion.div
        className="grid gap-4 sm:gap-6 lg:grid-cols-5"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Left panel: Upload + Template */}
        <motion.div className="lg:col-span-2" variants={staggerItem}>
          <div className="border-border bg-card space-y-4 rounded-2xl border p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {status === 'idle' ? t(locale, 'selectFile') : fileName}
              </h3>
              {status !== 'idle' && status !== 'importing' && (
                <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t(locale, 'clear')}
                </Button>
              )}
            </div>

            {status === 'idle' && (
              <>
                <DropZone
                  onFileSelect={onFileSelect}
                  accept=".xlsx,.xls,image/png,image/jpeg"
                />
                <p className="text-muted-foreground text-center text-xs">
                  {t(locale, 'supportedBulkFormats')}
                </p>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={downloadTemplate}
                >
                  <Download className="h-4 w-4" />
                  {t(locale, 'downloadTemplate')}
                </Button>
              </>
            )}

            {status === 'parsing' && (
              <div className="flex h-48 flex-col items-center justify-center gap-3">
                <FileSpreadsheet className="text-primary h-10 w-10 animate-pulse" />
                <p className="text-muted-foreground text-sm font-medium">
                  {t(locale, 'parsingFile')}
                </p>
              </div>
            )}

            {status === 'error' && error && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      {t(locale, 'importError')}
                    </p>
                    <p className="mt-1 text-xs text-red-600 dark:text-red-500">
                      {error}
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={reset} className="w-full gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {t(locale, 'tryAgain')}
                </Button>
              </div>
            )}

            {(status === 'preview' || status === 'importing' || status === 'complete') && (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {fileName}
                  </p>
                  {importResult && (
                    <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">
                      {importResult.rows.length} {t(locale, 'transactionsFound')}
                    </p>
                  )}
                </div>
                {status === 'preview' && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={downloadTemplate}
                  >
                    <Download className="h-4 w-4" />
                    {t(locale, 'downloadTemplate')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Right panel: Preview / Progress / Summary */}
        <motion.div className="lg:col-span-3" variants={staggerItem}>
          {status === 'idle' && (
            <div className="border-border bg-card flex h-64 flex-col items-center justify-center rounded-2xl border p-6 text-center lg:h-full">
              <FileSpreadsheet className="text-muted-foreground/30 mb-3 h-10 w-10" />
              <p className="text-muted-foreground text-sm font-medium">
                {t(locale, 'bulkImportDesc')}
              </p>
            </div>
          )}

          {status === 'parsing' && (
            <div className="border-border bg-card flex h-64 flex-col items-center justify-center rounded-2xl border p-6 lg:h-full">
              <FileSpreadsheet className="text-primary mb-3 h-10 w-10 animate-pulse" />
              <p className="text-muted-foreground text-sm">{t(locale, 'validatingData')}</p>
            </div>
          )}

          {status === 'preview' && importResult && (
            <ImportPreview
              result={importResult}
              onRemoveRow={removeRow}
              onUpdateRow={updateRow}
              onImport={onImport}
              categories={categories}
              paymentMethods={paymentMethods}
            />
          )}

          {status === 'importing' && (
            <ImportProgress
              current={importProgress.current}
              total={importProgress.total}
            />
          )}

          {status === 'complete' && createResult && (
            <ImportSummary
              created={createResult.created}
              failed={createResult.failed}
              errors={createResult.errors}
              onReset={reset}
            />
          )}

          {status === 'error' && !importResult && (
            <div className="border-border bg-card flex h-64 flex-col items-center justify-center rounded-2xl border p-6 lg:h-full">
              <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
              <p className="text-muted-foreground text-sm">{t(locale, 'noTransactionsInFile')}</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
