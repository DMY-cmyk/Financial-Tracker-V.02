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

const iconBgClasses: Record<NonNullable<SummaryCardProps['color']>, string> = {
  default: 'bg-info-soft text-info-soft-foreground',
  success: 'bg-success-soft text-success-soft-foreground',
  danger: 'bg-danger-soft text-danger-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
};

const valueClasses: Record<NonNullable<SummaryCardProps['color']>, string> = {
  default: 'text-foreground',
  success: 'text-emerald-600 dark:text-emerald-400',
  danger: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

const accentStripGradient: Record<NonNullable<SummaryCardProps['color']>, string> = {
  default: 'from-primary/0 via-primary/40 to-primary/0',
  success: 'from-emerald-500/0 via-emerald-500/50 to-emerald-500/0',
  danger: 'from-red-500/0 via-red-500/50 to-red-500/0',
  warning: 'from-amber-500/0 via-amber-500/50 to-amber-500/0',
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
        'group border-border bg-card shadow-card hover:border-border-strong hover:shadow-card-hover relative overflow-hidden rounded-2xl border p-3.5 transition-all duration-300 hover:-translate-y-0.5 sm:p-5',
        className
      )}
    >
      {/* Accent strip — colored sliver at the top, fades in on hover */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-60 transition-opacity duration-300 group-hover:opacity-100',
          accentStripGradient[color]
        )}
      />

      <div className="flex items-center gap-2">
        {Icon && (
          <div className={cn('rounded-lg p-1.5 sm:p-2', iconBgClasses[color])}>
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        )}
        <p className="text-muted-foreground truncate text-[11px] font-medium tracking-wider uppercase sm:text-[11px]">
          {label}
        </p>
      </div>
      <p
        className={cn(
          'mt-2 truncate font-mono text-lg leading-tight font-bold tabular-nums sm:mt-3 sm:text-2xl',
          valueClasses[color]
        )}
      >
        {value}
      </p>
      {trend && (
        <p
          className={cn(
            'mt-1.5 text-xs font-medium tabular-nums',
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
