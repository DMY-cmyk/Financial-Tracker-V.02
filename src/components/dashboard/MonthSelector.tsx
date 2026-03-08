'use client';

import { useStore } from '@/store';
import { MONTH_NAMES_SHORT } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { t, useLocale } from '@/lib/i18n';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MonthSelector() {
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const setMonth = useStore((s) => s.setMonth);
  const setYear = useStore((s) => s.setYear);
  const locale = useLocale();

  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setYear(year - 1)}
          aria-label={t(locale, 'previousYear')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{year}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setYear(year + 1)}
          aria-label={t(locale, 'nextYear')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {MONTH_NAMES_SHORT.map((name, i) => (
          <button
            key={name}
            onClick={() => setMonth(i)}
            className={cn(
              'rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
              i === month
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
