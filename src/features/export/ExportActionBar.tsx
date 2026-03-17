import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { type ExportFormat } from '@/lib/types';

interface ExportActionBarProps {
  format: ExportFormat;
  transactionCount: number;
  onExport: () => void;
  disabled?: boolean;
  className?: string;
}

export function ExportActionBar({
  format,
  transactionCount,
  onExport,
  disabled,
  className,
}: ExportActionBarProps) {
  const locale = useLocale();
  const formatLabel = format.toUpperCase();

  return (
    <div className={cn('border-border bg-card rounded-2xl border p-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            {t(locale, 'downloadReady')}: <span className="font-semibold">{transactionCount}</span>{' '}
            {t(locale, 'transactions').toLowerCase()}
          </p>
          <p className="text-muted-foreground text-xs">
            {t(locale, 'exportFormat')}: {formatLabel}
          </p>
        </div>
        <Button
          size="lg"
          onClick={onExport}
          disabled={disabled || transactionCount === 0}
          className="gap-2 shadow-sm"
        >
          <Download className="h-4 w-4" />
          {t(locale, 'exportData')} {formatLabel}
        </Button>
      </div>
    </div>
  );
}
