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

export function SummaryCard({ label, value, icon: Icon, trend, color = 'default', className }: SummaryCardProps) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-sm', className)}>
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className={cn('rounded-lg p-2', iconBgClasses[color])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className={cn('mt-3 font-mono text-2xl font-bold tabular-nums', valueClasses[color])}>
        {value}
      </p>
      {trend && (
        <p className={cn(
          'mt-1.5 text-xs font-medium',
          trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
        )}>
          {trend.positive ? '+' : ''}{trend.value}
        </p>
      )}
    </div>
  );
}
