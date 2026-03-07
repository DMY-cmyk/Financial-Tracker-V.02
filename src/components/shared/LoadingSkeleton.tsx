import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-muted', className)} />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <LoadingSkeleton className="mb-4 h-4 w-24" />
      <LoadingSkeleton className="mb-2 h-8 w-40" />
      <LoadingSkeleton className="h-3 w-32" />
    </div>
  );
}
