'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { staggerGrid } from '@/lib/motion';
import { t, useLocale } from '@/lib/i18n';
import { useStore } from '@/store';
import { EmptyState } from '@/components/shared/EmptyState';
import { FolderCard } from './FolderCard';
import type { YearSummary } from '@/lib/api/contracts';

interface YearGridProps {
  years: YearSummary[];
  isLoading: boolean;
}

export function YearGrid({ years, isLoading }: YearGridProps) {
  const locale = useLocale();
  const setYear = useStore((s) => s.setYear);
  const setDashboardView = useStore((s) => s.setDashboardView);
  const currentYear = new Date().getFullYear();

  const yearList = useMemo(() => {
    const yearMap = new Map(years.map((y) => [y.year, y]));
    // Always include current year
    if (!yearMap.has(currentYear)) {
      yearMap.set(currentYear, { year: currentYear, count: 0, income: 0, expense: 0 });
    }
    return Array.from(yearMap.values()).sort((a, b) => b.year - a.year);
  }, [years, currentYear]);

  if (!isLoading && yearList.length === 0) {
    return (
      <EmptyState
        title={t(locale, 'noTransactionsYet')}
        description={t(locale, 'startAddingFirstTransaction')}
        icon={<BarChart3 className="h-12 w-12" />}
      />
    );
  }

  const handleClick = (year: number) => {
    setYear(year);
    setDashboardView('months');
    window.history.pushState({ dashboardView: 'months', year }, '');
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{t(locale, 'browseByYear')}</h2>
        <p className="text-muted-foreground text-sm">{t(locale, 'allYears')}</p>
      </div>
      <motion.div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        variants={staggerGrid}
        initial="hidden"
        animate="show"
      >
        {yearList.map((y) => (
          <FolderCard
            key={y.year}
            label={String(y.year)}
            count={y.count}
            income={y.income}
            expense={y.expense}
            isCurrentPeriod={y.year === currentYear}
            onClick={() => handleClick(y.year)}
          />
        ))}
      </motion.div>
    </div>
  );
}
