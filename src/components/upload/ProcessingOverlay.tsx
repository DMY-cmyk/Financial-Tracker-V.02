import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessingOverlayProps {
  progress?: number;
  isProcessing: boolean;
  className?: string;
}

export function ProcessingOverlay({ progress, isProcessing, className }: ProcessingOverlayProps) {
  if (!isProcessing) return null;

  return (
    <div className={cn(
      'absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/50 backdrop-blur-sm',
      className
    )}>
      <Loader2 className="h-10 w-10 animate-spin text-white" />
      {progress !== undefined && (
        <p className="mt-3 text-sm font-medium text-white">
          {Math.round(progress)}%
        </p>
      )}
    </div>
  );
}
