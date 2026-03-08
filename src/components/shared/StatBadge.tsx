import { cn } from '@/lib/utils';

interface StatBadgeProps {
  label: string;
  value: string;
  variant?: 'success' | 'danger' | 'warning' | 'default';
  className?: string;
}

const variantClasses = {
  default: 'bg-muted text-foreground',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
  danger: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
};

export function StatBadge({ label, value, variant = 'default', className }: StatBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
        variantClasses[variant],
        className
      )}
    >
      <span className="text-[10px] font-medium tracking-wider uppercase opacity-70">{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}
