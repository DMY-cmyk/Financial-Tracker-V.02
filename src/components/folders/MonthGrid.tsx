'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { staggerGrid } from '@/lib/motion';
import { t, useLocale } from '@/lib/i18n';
import { MONTH_NAMES, MONTH_NAMES_ID } from '@/lib/constants';
import { useStore } from '@/store';
import { FolderCard } from './FolderCard';
import type { MonthSummary } from '@/lib/api/contracts';

interface MonthGridProps {
  months: MonthSummary[];
  year: number;
  isLoading: boolean;
}

export function MonthGrid({ months, year }: MonthGridProps) {
  const locale = useLocale();
  const setMonth = useStore((s) => s.setMonth);
  const setDashboardView = useStore((s) => s.setDashboardView);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const names = locale === 'id' ? MONTH_NAMES_ID : MONTH_NAMES;

  const monthList = useMemo(() => {
    const monthMap = new Map(months.map((m) => [m.month, m]));
    return Array.from({ length: 12 }, (_, i) => ({
      month: i,
      count: monthMap.get(i)?.count ?? 0,
      income: monthMap.get(i)?.income ?? 0,
      expense: monthMap.get(i)?.expense ?? 0,
    }));
  }, [months]);

  const handleClick = (month: number) => {
    setMonth(month);
    setDashboardView('dashboard');
    window.history.pushState({ dashboardView: 'dashboard', year, month }, '');
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">
          {t(locale, 'selectMonth')} — {year}
        </h2>
      </div>
      <motion.div
        className="grid grid-cols-3 gap-3 sm:grid-cols-4"
        variants={staggerGrid}
        initial="hidden"
        animate="show"
      >
        {monthList.map((m) => (
          <FolderCard
            key={m.month}
            label={names[m.month]}
            count={m.count}
            income={m.income}
            expense={m.expense}
            isCurrentPeriod={year === currentYear && m.month === currentMonth}
            onClick={() => handleClick(m.month)}
          />
        ))}
      </motion.div>
    </div>
  );
}
