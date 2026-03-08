'use client';

import { useStore } from '@/store';
import { MONTH_NAMES } from '@/lib/constants';
import { useLocale } from '@/lib/i18n';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export function Topbar() {
  const month = useStore((s) => s.ui.selectedMonth);
  const year = useStore((s) => s.ui.selectedYear);
  const setMonth = useStore((s) => s.setMonth);
  const setYear = useStore((s) => s.setYear);
  const locale = useLocale();

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
    <header className="border-border bg-card/80 flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur-sm sm:px-6">
      {/* Mobile: Logo */}
      <div className="flex items-center gap-3 lg:hidden">
        <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg shadow-sm">
          <span className="text-primary-foreground text-xs font-bold">FT</span>
        </div>
        <span className="text-sm font-semibold">Financial Tracker</span>
      </div>

      {/* Desktop: spacer */}
      <div className="hidden lg:block" />

      {/* Month Navigation */}
      <div
        className="border-border bg-card flex items-center gap-1 rounded-xl border px-1 py-1"
        role="group"
        aria-label={locale === 'id' ? 'Navigasi bulan' : 'Month navigation'}
      >
        <button
          onClick={handlePrev}
          aria-label={locale === 'id' ? 'Bulan sebelumnya' : 'Previous month'}
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-1.5 px-2">
          <Calendar className="text-muted-foreground h-3.5 w-3.5" />
          <span className="min-w-[110px] text-center text-xs font-medium">
            {MONTH_NAMES[month]} {year}
          </span>
        </div>
        <button
          onClick={handleNext}
          aria-label={locale === 'id' ? 'Bulan berikutnya' : 'Next month'}
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5 transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
