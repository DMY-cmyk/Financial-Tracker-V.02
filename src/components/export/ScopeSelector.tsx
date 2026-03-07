import { cn } from '@/lib/utils';

interface ScopeSelectorProps {
  scope: 'current' | 'all';
  onScopeChange: (scope: 'current' | 'all') => void;
  monthLabel: string;
  transactionCount: number;
}

export function ScopeSelector({ scope, onScopeChange, monthLabel, transactionCount }: ScopeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => onScopeChange('current')}
        className={cn(
          'rounded-xl border-2 p-4 text-left transition-colors',
          scope === 'current'
            ? 'border-primary bg-primary/5'
            : 'border-transparent bg-muted/50 hover:bg-muted'
        )}
      >
        <p className="text-sm font-semibold">This Month</p>
        <p className="text-xs text-muted-foreground">{monthLabel}</p>
      </button>
      <button
        onClick={() => onScopeChange('all')}
        className={cn(
          'rounded-xl border-2 p-4 text-left transition-colors',
          scope === 'all'
            ? 'border-primary bg-primary/5'
            : 'border-transparent bg-muted/50 hover:bg-muted'
        )}
      >
        <p className="text-sm font-semibold">All Data</p>
        <p className="text-xs text-muted-foreground">{transactionCount} transactions</p>
      </button>
    </div>
  );
}
