'use client';

import { useStore } from '@/store';
import { MONTH_NAMES } from '@/lib/constants';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export function Topbar() {
  const month = useStore(s => s.ui.selectedMonth);
  const year = useStore(s => s.ui.selectedYear);
  const setMonth = useStore(s => s.setMonth);
  const setYear = useStore(s => s.setYear);

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm sm:px-6">
      {/* Mobile: Logo */}
      <div className="flex items-center gap-3 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
          <span className="text-xs font-bold text-primary-foreground">FT</span>
        </div>
        <span className="text-sm font-semibold">Financial Tracker</span>
      </div>

      {/* Desktop: spacer */}
      <div className="hidden lg:block" />

      {/* Month Navigation */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-1 py-1">
        <button
          onClick={handlePrev}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-1.5 px-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="min-w-[110px] text-center text-xs font-medium">
            {MONTH_NAMES[month]} {year}
          </span>
        </div>
        <button
          onClick={handleNext}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
