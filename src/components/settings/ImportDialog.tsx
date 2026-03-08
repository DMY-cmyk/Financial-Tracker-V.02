'use client';

import { useRef, useState } from 'react';
import { useImport } from '@/hooks/useImport';
import { useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Upload, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const locale = useLocale();
  const { status, result, error, importFile, confirmImport, reset } = useImport();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'json' && ext !== 'csv') {
      toast.error(locale === 'id' ? 'Gunakan file .json atau .csv' : 'Please use a .json or .csv file');
      return;
    }
    importFile(file);
  };

  const handleConfirm = () => {
    const count = confirmImport();
    if (count > 0) {
      toast.success(
        locale === 'id'
          ? `${count} transaksi berhasil diimpor`
          : `${count} transaction(s) imported successfully`
      );
      reset();
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {locale === 'id' ? 'Impor Data' : 'Import Data'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {locale === 'id'
              ? 'Unggah file JSON atau CSV berisi transaksi'
              : 'Upload a JSON or CSV file containing transactions'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* Drop zone */}
          {status === 'idle' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {locale === 'id' ? 'Pilih atau seret file' : 'Choose or drag a file'}
                </p>
                <p className="text-xs text-muted-foreground">.json, .csv</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          )}

          {/* Loading */}
          {(status === 'reading' || status === 'validating') && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                {status === 'reading'
                  ? (locale === 'id' ? 'Membaca file...' : 'Reading file...')
                  : (locale === 'id' ? 'Memvalidasi data...' : 'Validating data...')}
              </p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-destructive/10 p-6">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-center text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={reset}>
                {locale === 'id' ? 'Coba Lagi' : 'Try Again'}
              </Button>
            </div>
          )}

          {/* Success preview */}
          {status === 'complete' && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 p-4">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">
                    {locale === 'id'
                      ? `${result.transactions.length} transaksi ditemukan`
                      : `${result.transactions.length} transaction(s) found`}
                  </p>
                  {result.skipped > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {locale === 'id'
                        ? `${result.skipped} baris dilewati`
                        : `${result.skipped} row(s) skipped`}
                    </p>
                  )}
                </div>
              </div>

              {/* Preview first 3 transactions */}
              <div className="space-y-1.5">
                {result.transactions.slice(0, 3).map((tx, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{tx.description}</span>
                    <span className="ml-auto shrink-0 font-mono">
                      {tx.type === 'income' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
                {result.transactions.length > 3 && (
                  <p className="px-3 text-xs text-muted-foreground">
                    {locale === 'id'
                      ? `...dan ${result.transactions.length - 3} lainnya`
                      : `...and ${result.transactions.length - 3} more`}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>
            {locale === 'id' ? 'Batal' : 'Cancel'}
          </AlertDialogCancel>
          {status === 'complete' && (
            <Button onClick={handleConfirm}>
              {locale === 'id' ? 'Impor Sekarang' : 'Import Now'}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
