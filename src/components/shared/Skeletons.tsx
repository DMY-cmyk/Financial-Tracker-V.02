import { cn } from '@/lib/utils';

function Shimmer({ className }: { className?: string }) {
  return <div className={cn('bg-muted animate-pulse rounded-lg', className)} />;
}

// --- Summary Card Skeleton ---

export function SummaryCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('border-border bg-card rounded-2xl border p-5', className)}>
      <div className="flex items-center gap-2.5">
        <Shimmer className="h-9 w-9 rounded-lg" />
        <Shimmer className="h-3 w-20" />
      </div>
      <Shimmer className="mt-3 h-7 w-32" />
    </div>
  );
}

// --- Chart Card Skeleton ---

export function ChartCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('border-border bg-card rounded-2xl border p-6', className)}>
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-1.5">
          <Shimmer className="h-4 w-28" />
          <Shimmer className="h-3 w-40" />
        </div>
      </div>
      <Shimmer className="h-48 w-full rounded-xl" />
    </div>
  );
}

// --- List / Table Skeleton ---

export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-card flex items-center gap-3 rounded-xl p-3">
          <Shimmer className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Shimmer className="h-3.5 w-3/5" />
            <Shimmer className="h-2.5 w-2/5" />
          </div>
          <Shimmer className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// --- Card Skeleton (generic) ---

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('border-border bg-card rounded-2xl border p-6', className)}>
      <Shimmer className="mb-4 h-4 w-24" />
      <div className="space-y-3">
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-4/5" />
        <Shimmer className="h-3 w-3/5" />
      </div>
    </div>
  );
}

// --- Page Skeleton (full page layout) ---

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Shimmer className="h-7 w-48" />
        <Shimmer className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SummaryCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCardSkeleton className="lg:col-span-2" />
        <ChartCardSkeleton />
      </div>
    </div>
  );
}

// --- Transaction Row Skeleton ---

export function TransactionRowSkeleton() {
  return (
    <div className="bg-card flex items-center gap-3 rounded-xl p-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Shimmer className="h-3.5 w-2/3" />
        <div className="flex items-center gap-2">
          <Shimmer className="h-5 w-16 rounded-full" />
          <Shimmer className="h-3 w-12" />
        </div>
      </div>
      <Shimmer className="h-4 w-24" />
    </div>
  );
}
