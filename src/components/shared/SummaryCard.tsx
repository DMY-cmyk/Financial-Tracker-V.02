import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: { value: string; positive: boolean };
  color?: 'default' | 'success' | 'danger' | 'warning';
  className?: string;
}

const iconBgClasses = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
  danger: 'bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
};

const valueClasses = {
  default: 'text-foreground',
  success: 'text-emerald-600 dark:text-emerald-400',
  danger: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

export function SummaryCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'default',
  className,
}: SummaryCardProps) {
  return (
    <div
      className={cn(
        'border-border bg-card rounded-2xl border p-3.5 transition-shadow hover:shadow-sm sm:p-5',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <div className={cn('rounded-lg p-1.5 sm:p-2', iconBgClasses[color])}>
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        )}
        <p className="text-muted-foreground truncate text-[11px] font-medium sm:text-xs">{label}</p>
      </div>
      <p
        className={cn(
          'mt-2 truncate font-mono text-lg font-bold tabular-nums sm:mt-3 sm:text-2xl',
          valueClasses[color]
        )}
      >
        {value}
      </p>
      {trend && (
        <p
          className={cn(
            'mt-1.5 text-xs font-medium',
            trend.positive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          )}
        >
          {trend.positive ? '+' : ''}
          {trend.value}
        </p>
      )}
    </div>
  );
}
