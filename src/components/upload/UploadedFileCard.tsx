import { X, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from './ProcessingOverlay';
import { t, useLocale } from '@/lib/i18n';

interface UploadedFileCardProps {
  fileName: string;
  previewUrl: string;
  isProcessing: boolean;
  onClear: () => void;
}

export function UploadedFileCard({
  fileName,
  previewUrl,
  isProcessing,
  onClear,
}: UploadedFileCardProps) {
  const locale = useLocale();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <FileImage className="text-muted-foreground h-4 w-4" />
          <span className="truncate font-medium">{fileName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground h-7 w-7"
          onClick={onClear}
          disabled={isProcessing}
          aria-label={t(locale, 'clearFile')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="border-border relative overflow-hidden rounded-xl border">
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from user upload, not optimizable */}
        <img
          src={previewUrl}
          alt={t(locale, 'receiptPreview')}
          className="w-full object-contain"
          style={{ maxHeight: '320px' }}
        />
        <ProcessingOverlay isProcessing={isProcessing} />
      </div>
    </div>
  );
}
