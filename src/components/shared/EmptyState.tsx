import { cn } from '@/lib/utils';
import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({ title, description, icon, className, children }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-4 text-muted-foreground/40">{icon}</div>}
      <h3 className="text-base font-medium text-muted-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground/70">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

interface NoResultsProps {
  message?: string;
  onClear?: () => void;
  clearLabel?: string;
  className?: string;
}

export function NoResults({
  message = 'No results found',
  onClear,
  clearLabel = 'Clear filters',
  className,
}: NoResultsProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-10 text-center', className)}>
      <SearchX className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {onClear && (
        <button
          onClick={onClear}
          className="mt-2 text-xs font-medium text-primary hover:underline"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function InlineError({
  message,
  onRetry,
  retryLabel = 'Try again',
  className,
}: InlineErrorProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-8 text-center dark:border-red-900/50 dark:bg-red-950/20',
      className
    )}>
      <p className="text-sm font-medium text-red-600 dark:text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
