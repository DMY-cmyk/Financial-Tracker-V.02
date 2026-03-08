import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return <div className={cn('bg-muted animate-pulse rounded-lg', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="border-border bg-card rounded-2xl border p-6">
      <LoadingSkeleton className="mb-4 h-4 w-24" />
      <LoadingSkeleton className="mb-2 h-8 w-40" />
      <LoadingSkeleton className="h-3 w-32" />
    </div>
  );
}
