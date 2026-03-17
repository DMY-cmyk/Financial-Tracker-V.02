import { cn } from '@/lib/utils';

interface ConfidenceBarProps {
  confidence: number; // 0-100
  className?: string;
}

export function ConfidenceBar({ confidence, className }: ConfidenceBarProps) {
  const color =
    confidence >= 80 ? 'bg-emerald-500' : confidence >= 50 ? 'bg-amber-500' : 'bg-red-500';

  const label = confidence >= 80 ? 'High' : confidence >= 50 ? 'Medium' : 'Low';

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Confidence</span>
        <span className="font-medium">
          {label} ({Math.round(confidence)}%)
        </span>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
        />
      </div>
    </div>
  );
}
