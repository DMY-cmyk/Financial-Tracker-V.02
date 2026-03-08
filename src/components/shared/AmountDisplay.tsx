import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface AmountDisplayProps {
  amount: number;
  type?: 'income' | 'expense' | 'neutral';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl font-bold',
};

export function AmountDisplay({
  amount,
  type = 'neutral',
  size = 'md',
  className,
}: AmountDisplayProps) {
  return (
    <span
      className={cn(
        'font-mono font-semibold tabular-nums',
        sizeClasses[size],
        type === 'income' && 'text-emerald-600 dark:text-emerald-400',
        type === 'expense' && 'text-red-600 dark:text-red-400',
        type === 'neutral' && 'text-foreground',
        className
      )}
    >
      {type === 'income' && '+'}
      {type === 'expense' && '-'}
      {formatCurrency(Math.abs(amount))}
    </span>
  );
}
