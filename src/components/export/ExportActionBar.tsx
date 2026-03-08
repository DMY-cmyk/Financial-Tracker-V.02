import { cn } from '@/lib/utils';
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

export function ExportActionBar({ format, transactionCount, onExport, disabled, className }: ExportActionBarProps) {
  const formatLabel = format.toUpperCase();

  return (
    <div className={cn('rounded-2xl border border-border bg-card p-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            Ready to export <span className="font-semibold">{transactionCount}</span> transactions
          </p>
          <p className="text-xs text-muted-foreground">
            Format: {formatLabel}
          </p>
        </div>
        <Button
          size="lg"
          onClick={onExport}
          disabled={disabled || transactionCount === 0}
          className="gap-2 shadow-sm"
        >
          <Download className="h-4 w-4" />
          Download {formatLabel}
        </Button>
      </div>
    </div>
  );
}
