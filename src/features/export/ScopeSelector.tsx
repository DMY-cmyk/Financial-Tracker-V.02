import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ExportScope } from '@/lib/types';

interface ScopeSelectorProps {
  scope: ExportScope;
  onScopeChange: (scope: ExportScope) => void;
  monthLabel: string;
  transactionCount: number;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
}

export function ScopeSelector({
  scope,
  onScopeChange,
  monthLabel,
  transactionCount,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: ScopeSelectorProps) {
  const locale = useLocale();

  const btnClass = (s: ExportScope) =>
    cn(
      'rounded-xl border-2 p-4 text-left transition-all duration-200',
      scope === s
        ? 'border-primary bg-primary/5 shadow-card'
        : 'border-transparent bg-surface-inset hover:border-border-subtle hover:bg-card hover:shadow-card'
    );

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button onClick={() => onScopeChange('current')} className={btnClass('current')}>
          <p className="text-sm font-semibold">{t(locale, 'thisMonth')}</p>
          <p className="text-muted-foreground text-xs">{monthLabel}</p>
        </button>
        <button onClick={() => onScopeChange('all')} className={btnClass('all')}>
          <p className="text-sm font-semibold">{t(locale, 'all')}</p>
          <p className="text-muted-foreground text-xs">
            {transactionCount} {t(locale, 'transactions').toLowerCase()}
          </p>
        </button>
        <button onClick={() => onScopeChange('range')} className={btnClass('range')}>
          <p className="text-sm font-semibold">{t(locale, 'customRange')}</p>
          <p className="text-muted-foreground text-xs">{t(locale, 'selectDateRange')}</p>
        </button>
      </div>

      {scope === 'range' && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t(locale, 'startDate')}</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t(locale, 'endDate')}</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}
