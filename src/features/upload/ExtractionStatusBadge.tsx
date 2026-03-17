import { cn } from '@/lib/utils';
import { type ExtractionStatus } from '@/lib/types';
import { Loader2, CheckCircle2, AlertCircle, Upload, ScanLine } from 'lucide-react';

interface ExtractionStatusBadgeProps {
  status: ExtractionStatus;
  className?: string;
}

const config: Record<ExtractionStatus, { label: string; icon: React.ElementType; color: string }> =
  {
    idle: { label: 'Ready', icon: Upload, color: 'bg-muted text-muted-foreground' },
    uploading: {
      label: 'Uploading',
      icon: Loader2,
      color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
    },
    processing: {
      label: 'Extracting',
      icon: ScanLine,
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
    },
    extracted: {
      label: 'Extracted',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
    },
    saved: {
      label: 'Saved',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
    },
    error: {
      label: 'Error',
      icon: AlertCircle,
      color: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
    },
  };

export function ExtractionStatusBadge({ status, className }: ExtractionStatusBadgeProps) {
  const { label, icon: Icon, color } = config[status];
  const isAnimated = status === 'uploading' || status === 'processing';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        color,
        className
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', isAnimated && 'animate-spin')} />
      <span>{label}</span>
    </div>
  );
}
