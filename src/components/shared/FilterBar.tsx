import { cn } from '@/lib/utils';

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'border-border bg-card flex flex-wrap items-center gap-3 rounded-2xl border p-3',
        className
      )}
    >
      {children}
    </div>
  );
}
