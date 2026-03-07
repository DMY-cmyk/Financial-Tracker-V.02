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

const colorClasses = {
  default: 'text-foreground',
  success: 'text-emerald-600 dark:text-emerald-400',
  danger: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

export function SummaryCard({ label, value, icon: Icon, trend, color = 'default', className }: SummaryCardProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={cn('font-mono text-lg font-semibold tabular-nums', colorClasses[color])}>
        {value}
      </p>
      {trend && (
        <p className={cn('text-xs', trend.positive ? 'text-emerald-600' : 'text-red-600')}>
          {trend.positive ? '+' : ''}{trend.value}
        </p>
      )}
    </div>
  );
}
